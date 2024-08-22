console.log('Background script is running.');

// Import the Socket.IO library
try {
    importScripts('libs/socket.io.min.js');
    console.log('Socket.IO script loaded successfully.');

    const socket = io('http://localhost:3000', {
        transports: ['websocket'], // Use WebSocket only for transport
    });

    socket.on('connect', () => {
        console.log('Connected to Socket.IO server');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from Socket.IO server');
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error.message);
        console.error('Error details:', error);
    });

    socket.on('matchReady', (matchId) => {
        console.log('Received matchReady event with matchId:', matchId);
        chrome.storage.local.get(['savedMessage', 'accessToken'], (data) => {
            const message = data.savedMessage || '';
            const accessToken = data.accessToken;
            const roomId = `cs2/room/${matchId}`;

            fetch(`https://open.faceit.com/chat/v1/rooms/${roomId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ body: message })
            })
                .then(response => response.json())
                .then(data => console.log('Message sent, response:', data))
                .catch(error => console.error('Error sending message:', error));
        });
    });

} catch (e) {
    console.error('Failed to load Socket.IO script:', e);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startOAuth2') {
        console.log('Starting OAuth2 flow...');

        const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org`;
        const myclientID = '';

        chrome.identity.launchWebAuthFlow({
            url: `https://accounts.faceit.com/?response_type=code&client_id=${myclientID}&redirect_uri=${encodeURIComponent(redirectUri)}`,
            interactive: true
        }, function (redirectUrl) {
            console.log('OAuth2 callback function invoked');
            if (chrome.runtime.lastError) {
                console.error('OAuth2 flow failed:', chrome.runtime.lastError);
                return;
            }

            if (!redirectUrl) {
                console.error('No redirect URL received.');
                return;
            }

            console.log("Received redirect URL:", redirectUrl);

            try {
                const urlParams = new URLSearchParams(new URL(redirectUrl).search);
                const code = urlParams.get('code');
                if (code) {
                    console.log('Authorization code received:', code);
                    // Proceed with exchanging the code for tokens
                } else {
                    console.error('No authorization code found in redirect URL.');
                }
            } catch (error) {
                console.error('Error parsing redirect URL:', error);
            }
        });
    }

    if (message.action === 'updateSavedMessage') {
        console.log('Updated saved message:', message.savedMessage);
        chrome.storage.local.set({ savedMessage: message.savedMessage }, () => {
            sendResponse({ status: 'saved' });
        });
        return true; // Required to send a response asynchronously
    }
});
