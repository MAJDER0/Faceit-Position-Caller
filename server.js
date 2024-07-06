const express = require('express');
const bodyParser = require('body-parser');
const http = require('http'); // Require the HTTP module
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app); // Create an HTTP server
const io = socketIo(server); // Create a new instance of Socket.IO and pass the HTTP server instance

app.use(bodyParser.json());

// Route to handle incoming webhook for match ready status
app.post('/IsMatchReady', (req, res) => {
    const event = req.body;
    console.log('Received webhook event:', event);

    // Check for the specific event you are interested in
    if (event.event === 'match_status_ready') {
        // Logic to handle match ready event
        console.log('Match is ready! Sending message to team chat...');
        // Emit an event to all connected clients
        io.emit('matchReady', 'Match is ready!'); // Emitting 'matchReady' event
    }

    res.status(200).send('Webhook received');
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Socket.IO event handling
io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle 'disconnect' event
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});
