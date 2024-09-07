const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

app.use(bodyParser.json());

function loadSettings() {
    const filePath = path.join(__dirname, 'appsettings.json');
    const settings = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return settings;
}

app.post('/IsMatchReady', async (req, res) => {
    const event = req.body;
    console.log('Received webhook event:', event);

    // Handle match_object_created event
    if (event.event && event.event === 'match_object_created') {
        const matchId = event.payload.id;
        console.log('Match object created, matchId:', matchId);
        io.emit('matchReady', matchId);
        console.log('Emitted matchReady event with matchId:', matchId);
        res.status(200).send('Webhook received');

        // Handle match_status_configuring event
    } else if (event.event && event.event === 'match_status_configuring') {
        const matchIdConfiguration = event.payload.id;
        console.log("Match is configuring with matchId:", matchIdConfiguration);
        io.emit('matchConfiguring', matchIdConfiguration);
        console.log('Emitted matchConfiguring event with matchId:', matchIdConfiguration);
        res.status(200).send('Webhook received');
    } else {
        res.status(200).send('Event ignored');
    }
});

app.post('/saveAccessToken', (req, res) => {
    const { accessToken } = req.body;

    if (!accessToken) {
        return res.status(400).send({ error: 'Access token is missing' });
    }

    const filePath = path.join(__dirname, 'appsettings.json');
    const settings = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    settings.faceit.accessToken = accessToken;

    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');

    console.log('Access token saved to appsettings.json');

    res.status(200).send({ success: true });
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
