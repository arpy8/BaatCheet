const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

io.on('connection', socket => {
    console.log('User connected:', socket.id);

    socket.on('offer', offer => {
        socket.broadcast.emit('offer', offer);
    });

    socket.on('answer', answer => {
        socket.broadcast.emit('answer', answer);
    });

    socket.on('ice-candidate', candidate => {
        socket.broadcast.emit('ice-candidate', candidate);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = 7860;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
