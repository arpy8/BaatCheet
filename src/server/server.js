const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { createLogger, format, transports } = require('winston');

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: { service: 'baatcheet-server' },
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.simple()
            )
        })
    ]
});

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, '../client')));

const rooms = new Map();

io.on('connection', socket => {
    logger.info(`User connected: ${socket.id}`);

    socket.on('join-room', (roomId) => {
        try {
            leaveAllRooms(socket);

            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Set());
                logger.info(`Room created: ${roomId}`);
            }

            const room = rooms.get(roomId);
            
            socket.join(roomId);
            room.add(socket.id);
            
            logger.info(`User ${socket.id} joined room ${roomId}. Room has ${room.size} participants.`);
            
            socket.to(roomId).emit('peer-joined', socket.id);
            
            socket.emit('room-joined', {
                roomId,
                participants: Array.from(room).filter(id => id !== socket.id)
            });
        } catch (error) {
            logger.error(`Error joining room: ${error.message}`, { userId: socket.id, roomId });
            socket.emit('connection-error', 'Failed to join room');
        }
    });

    socket.on('offer', ({ offer, roomId, to, mediaState }) => {
        logger.info(`Received offer from ${socket.id} to ${to} in room ${roomId}`);
        socket.to(to).emit('offer', { offer, from: socket.id, mediaState });
    });

    socket.on('answer', ({ answer, roomId, to, mediaState }) => {
        logger.info(`Received answer from ${socket.id} to ${to} in room ${roomId}`);
        socket.to(to).emit('answer', { answer, from: socket.id, mediaState });
    });

    socket.on('ice-candidate', ({ candidate, roomId, to }) => {
        socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
    });

    socket.on('media-state-change', ({ roomId, type, enabled }) => {
        logger.info(`Media state change from ${socket.id}: ${type} is now ${enabled ? 'enabled' : 'disabled'}`);
        socket.to(roomId).emit('media-state-change', { from: socket.id, type, enabled });
    });

    socket.on('leave-room', (roomId) => {
        leaveRoom(socket, roomId);
    });

    socket.on('disconnect', () => {
        logger.info(`User disconnected: ${socket.id}`);
        leaveAllRooms(socket);
    });

    function leaveRoom(socket, roomId) {
        if (!rooms.has(roomId)) return;
        
        const room = rooms.get(roomId);
        room.delete(socket.id);
        
        socket.to(roomId).emit('peer-disconnected', socket.id);
        
        if (room.size === 0) {
            rooms.delete(roomId);
            logger.info(`Room ${roomId} deleted (empty)`);
        }
        
        socket.leave(roomId);
        logger.info(`User ${socket.id} left room ${roomId}`);
    }

    function leaveAllRooms(socket) {
        rooms.forEach((participants, roomId) => {
            if (participants.has(socket.id)) {
                leaveRoom(socket, roomId);
            }
        });
    }
});

const PORT = process.env.PORT || 7860;
server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});