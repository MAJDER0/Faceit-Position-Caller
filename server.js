const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

app.use(bodyParser.json());

app.post('/IsMatchReady', (req, res) => {
    const event = req.body;
    console.log('Received webhook event:', event);

    if (event.event.includes('match_status_ready')) {
        console.log('true');
        io.emit('matchReady', 'Match is ready!');
        console.log('Emitted matchReady event');
    }

    res.status(200).send('Webhook received');
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});
