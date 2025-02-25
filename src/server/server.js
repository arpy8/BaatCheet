const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(`${__dirname}/../client/`));

// Track rooms and their participants
const rooms = new Map();

io.on('connection', socket => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId) => {
        // Leave previous room if any
        Array.from(socket.rooms).forEach(room => {
            if (room !== socket.id) socket.leave(room);
        });

        // Initialize room if it doesn't exist
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }

        const room = rooms.get(roomId);
        
        // Join room
        socket.join(roomId);
        room.add(socket.id);
        
        // Notify others in the room about new participant
        socket.to(roomId).emit('peer-joined', socket.id);
        
        // Send existing participants to the new peer
        socket.emit('room-joined', {
            roomId,
            participants: Array.from(room).filter(id => id !== socket.id)
        });
    });

    socket.on('offer', ({offer, roomId}) => {
        socket.to(roomId).emit('offer', {offer, from: socket.id});
    });

    socket.on('answer', ({answer, roomId}) => {
        socket.to(roomId).emit('answer', {answer, from: socket.id});
    });

    socket.on('ice-candidate', ({candidate, roomId}) => {
        socket.to(roomId).emit('ice-candidate', {candidate, from: socket.id});
    });

    socket.on('disconnect', () => {
        // Remove user from all rooms
        rooms.forEach((participants, roomId) => {
            participants.delete(socket.id);
            if (participants.size === 0) {
                rooms.delete(roomId);
            } else {
                socket.to(roomId).emit('peer-disconnected', socket.id);
            }
        });
    });
});

const PORT = 7860;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});