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
        chrome.storage.local.set({ matchId }, () => {
            console.log('Match ID saved in local storage:', matchId);
            checkForMatchRoomTab(matchId);
        });
    });

} catch (e) {
    console.error('Failed to load Socket.IO script:', e);
}

function checkForMatchRoomTab(matchId, attempts = 0) {
    const maxAttempts = 40; // 40 attempts with 1 second interval = 40 seconds
    const matchRoomUrlPattern = `/cs2/room/${matchId}`;

    console.log('Checking for match room links containing:', matchRoomUrlPattern);

    chrome.tabs.query({}, (tabs) => {
        let matchTabFound = false;

        for (let tab of tabs) {
            if (tab.url && tab.url.includes(matchRoomUrlPattern)) {
                console.log('Match room tab found:', tab.url);
                triggerMessageSending(matchId);
                matchTabFound = true;
                break;
            }
        }

        if (!matchTabFound && attempts < maxAttempts) {
            setTimeout(() => {
                console.log(`Attempt ${attempts + 1} to find match room tab...`);
                checkForMatchRoomTab(matchId, attempts + 1);
            }, 1000); // Retry every 1 second
        } else if (!matchTabFound) {
            console.log('Match room tab not found after 40 attempts (40 seconds).');
        }
    });
}

function triggerMessageSending(matchId) {
    chrome.storage.local.get(['savedMessage', 'accessToken'], (data) => {
        const message = data.savedMessage || '';
        const roomId = `match-${matchId}`;

        console.log('Sending message to room:', roomId);

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
}

function refreshAccessToken() {
    loadSettings(settings => {
        chrome.storage.local.get(['refreshToken'], (data) => {
            const refreshToken = data.refreshToken;

            if (!refreshToken) {
                console.error('Refresh token not found.');
                return;
            }

            const clientId = settings.faceit.clientId;
            const clientSecret = settings.faceit.clientSecret;
            const tokenUrl = settings.faceit.tokenUrl;

            const encodedCredentials = btoa(`${clientId}:${clientSecret}`);

            const params = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: clientId
            });

            fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${encodedCredentials}`,
                },
                body: params.toString(),
            })
                .then(response => response.json())
                .then(data => {
                    console.log('New access token received:', data.access_token);

                    // Save the new access token in local storage
                    chrome.storage.local.set({ accessToken: data.access_token }, () => {
                        console.log('New access token saved in local storage.');
                    });

                    // Optionally, update the refresh token if it has changed
                    if (data.refresh_token) {
                        chrome.storage.local.set({ refreshToken: data.refresh_token }, () => {
                            console.log('Refresh token updated in local storage.');
                        });
                    }
                })
                .catch(error => console.error('Error refreshing access token:', error));
        });
    });
}

// Call this function periodically, e.g., every 22 hours to refresh the token before it expires
setInterval(refreshAccessToken, 22 * 60 * 60 * 1000); // 22 hours in milliseconds

// Fetch and save user info in local storage
function fetchAndSaveUserInfo(accessToken) {
    fetch('https://api.faceit.com/auth/v1/resources/userinfo', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    })
        .then(response => response.json())
        .then(userinfo => {
            const nickname = userinfo.nickname;
            const country = userinfo.locale;
            console.log('User nickname:', nickname);
            console.log('User country:', country);

            // Save the user's nickname and country in local storage
            chrome.storage.local.set({ nickname, country }, () => {
                console.log('User information saved in local storage.');
            });
        })
        .catch(error => console.error('Error fetching user info:', error));
}

// OAuth2 related functions
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

// Start the OAuth2 flow
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

                        console.log("Received redirect URL:", redirectUrl);

                        try {
                            const urlParams = new URLSearchParams(new URL(redirectUrl).search);
                            const code = urlParams.get('code');
                            if (code) {
                                console.log('Authorization code received:', code);
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

// Exchange the authorization code for an access token
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
                    console.log('Full response:', response); // Log the entire response
                    if (!response.ok) {
                        return response.text().then(text => {
                            console.error(`Error response body: ${text}`);
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        });
                    }
                    return response.json(); // Parse the response as JSON
                })
                .then(data => {
                    console.log('Access token received:', data.access_token);

                    // Save the access token and refresh token in local storage
                    chrome.storage.local.set({
                        accessToken: data.access_token,
                        refreshToken: data.refresh_token
                    }, () => {
                        console.log('Access and refresh tokens saved in local storage.');

                        // Fetch and save the user info
                        fetchAndSaveUserInfo(data.access_token);
                    });
                })
                .catch(error => console.error('Error exchanging code for token:', error));
        });
    });
};
