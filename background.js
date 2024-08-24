console.log('Background script is running.');

// Load settings from appsettings.json
function loadSettings(callback) {
    fetch(chrome.runtime.getURL('appsettings.json'))
        .then(response => response.json())
        .then(json => callback(json))
        .catch(error => console.error('Error loading settings:', error));
}

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
            const roomId = `cs2/room/${matchId}`;

            fetch(`https://open.faceit.com/chat/v1/rooms/${roomId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${data.accessToken}`,
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

function generateCodeVerifier() {
    const array = new Uint32Array(56 / 2);
    crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
}

function generateCodeChallenge(verifier) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
        .then(buffer => {
            return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)))
                .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startOAuth2') {
        console.log('Starting OAuth2 flow...');

        loadSettings(settings => {
            const { clientId, authUrl, tokenUrl, redirectUri } = settings.faceit;
            const codeVerifier = generateCodeVerifier();

            generateCodeChallenge(codeVerifier).then(codeChallenge => {
                chrome.storage.local.set({ codeVerifier }, () => {
                    chrome.identity.launchWebAuthFlow({
                        url: `${authUrl}?response_type=code&client_id=${clientId}&state=state&scope=openid%20email%20membership%20profile%20chat.messages.read%20chat.messages.write%20chat.rooms.read&redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge=${codeChallenge}&code_challenge_method=S256&redirect_popup=true`,
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


                        try {
                            const urlParams = new URLSearchParams(new URL(redirectUrl).search);
                            const code = urlParams.get('code');
                            if (code) {
                                exchangeCodeForToken(code, clientId, redirectUri, tokenUrl);
                            } else {
                                console.error('No authorization code found in redirect URL.');
                            }
                        } catch (error) {
                            console.error('Error parsing redirect URL:', error);
                        }
                    });
                });
            });
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

const exchangeCodeForToken = (code, clientId, redirectUri, tokenUrl) => {
    loadSettings(settings => {
        const clientSecret = settings.faceit.clientSecret;

        chrome.storage.local.get('codeVerifier', (data) => {
            const codeVerifier = data.codeVerifier;

            if (!codeVerifier) {
                console.error('Code verifier not found.');
                return;
            }

            const encodedCredentials = btoa(`${clientId}:${clientSecret}`);

            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: clientId,
                code_verifier: codeVerifier,
            });

            fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${encodedCredentials}`,
                },
                body: params.toString(),
            })
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => {
                            console.error(`Error response body: ${text}`);
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        });
                    }
                    return response.json(); // Parse the response as JSON
                })
                .then(data => {
                    chrome.storage.local.set({ accessToken: data.access_token });
                })
                .catch(error => console.error('Error exchanging code for token:', error));
        });
    });
};
