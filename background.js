// Console log to indicate the background script is running
console.log('Background script is running.');

// Load settings from appsettings.json
function loadSettings(callback) {
    fetch(chrome.runtime.getURL('appsettings.json'))
        .then(response => response.json())
        .then(json => callback(json))
        .catch(error => console.error('Error loading settings:', error));
}

// Encryption function using the Web Crypto API
async function encryptToken(token) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        enc.encode(token)
    );

    const exportedKey = await crypto.subtle.exportKey("raw", key);
    const encryptedArray = new Uint8Array(encrypted);

    console.log('Token after encryption:', encryptedArray);

    return {
        ciphertext: Array.from(encryptedArray),
        iv: Array.from(iv),
        key: Array.from(new Uint8Array(exportedKey))
    };
}

// Decryption function using the Web Crypto API
async function decryptToken(ciphertext, iv, key) {
    const importedKey = await crypto.subtle.importKey(
        "raw",
        new Uint8Array(key),
        "AES-GCM",
        true,
        ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        importedKey,
        new Uint8Array(ciphertext)
    );

    const token = new TextDecoder().decode(decrypted);
    console.log('Token after decryption:', token);
    return token;
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
        // Check if the extension is enabled before proceeding
        chrome.storage.local.get('extensionEnabled', (data) => {
            if (data.extensionEnabled) {
                console.log('Received matchReady event with matchId:', matchId);
                chrome.storage.local.set({ matchId }, () => {
                    console.log('Match ID saved in local storage:', matchId);
                    checkForMatchRoomTab(matchId);
                });
            } else {
                console.log('Extension is disabled. Ignoring matchReady event.');
            }
        });
    });

} catch (e) {
    console.error('Failed to load Socket.IO script:', e);
}

function checkForMatchRoomTab(matchId, attempts = 0) {
    const maxAttempts = 40; // 40 attempts with 1 second interval = 40 seconds
    const matchRoomUrlPattern = `/cs2/room/${matchId}`;

    console.log('Checking for match room links containing:', matchRoomUrlPattern);

    chrome.storage.local.get('extensionEnabled', (data) => {
        if (!data.extensionEnabled) {
            console.log('Extension is disabled. Stopping match room check.');
            return;
        }

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
    });
}

function triggerMessageSending(matchId) {
    chrome.storage.local.get(['savedMessage', 'accessToken', 'extensionEnabled'], async (data) => {
        if (!data.extensionEnabled) {
            console.log('Extension is disabled. Message will not be sent.');
            return;
        }

        const message = data.savedMessage || '';
        const roomId = `match-${matchId}`;

        // Decrypt the access token before using it
        const { ciphertext, iv, key } = data.accessToken;
        const decryptedToken = await decryptToken(ciphertext, iv, key);

        console.log('Sending message to room:', roomId);

        fetch(`https://open.faceit.com/chat/v1/rooms/${roomId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${decryptedToken}`,
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
        chrome.storage.local.get(['refreshToken', 'extensionEnabled'], async (data) => {
            if (!data.extensionEnabled) {
                console.log('Extension is disabled. Token refresh will not proceed.');
                return;
            }

            // Decrypt the refresh token before using it
            const { ciphertext, iv, key } = data.refreshToken;
            const decryptedRefreshToken = await decryptToken(ciphertext, iv, key);

            if (!decryptedRefreshToken) {
                console.error('Decrypted refresh token not found.');
                return;
            }

            const clientId = settings.faceit.clientId;
            const clientSecret = settings.faceit.clientSecret;
            const tokenUrl = settings.faceit.tokenUrl;

            const encodedCredentials = btoa(`${clientId}:${clientSecret}`);

            const params = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: decryptedRefreshToken,
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
                .then(async data => {

                    // Encrypt the new access token and refresh token
                    const encryptedAccessToken = await encryptToken(data.access_token);
                    const encryptedRefreshToken = await encryptToken(data.refresh_token);

                    // Save the encrypted tokens in local storage
                    chrome.storage.local.set({
                        accessToken: encryptedAccessToken,
                        refreshToken: encryptedRefreshToken
                    }, () => {
                        console.log('New access and refresh tokens encrypted and saved in local storage.');
                    });
                })
                .catch(error => console.error('Error refreshing access token:', error));
        });
    });
}

// Call this function periodically, e.g., every 22 hours to refresh the token before it expires
setInterval(refreshAccessToken, 22 * 60 * 60 * 1000); // 22 hours in milliseconds

// Fetch and save user info in local storage
function fetchAndSaveUserInfo(accessToken, callback) {
    loadSettings(settings => {
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
            const playerId = userinfo.guid;

            console.log('User nickname:', nickname);
            console.log('User country:', country);
            console.log('Player ID:', playerId);

            // Save the user's nickname, country, and player ID in local storage
            chrome.storage.local.set({ nickname, country, playerId }, () => {
                console.log('User information saved in local storage.');

                const FaceitForDevToken = settings.faceit.FaceitForDevToken;
                const WebhookSubscriptionId = settings.faceit.WebhookSubscriptionId;
                if (callback) callback(FaceitForDevToken, WebhookSubscriptionId); // Call the callback after saving the player ID
            });
        })
        .catch(error => console.error('Error fetching user info:', error));
    });
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
                .then(async data => {
                    console.log('Access token received:', data.access_token);

                    // Encrypt the access token before storing
                    const encryptedAccessToken = await encryptToken(data.access_token);
                    const encryptedRefreshToken = await encryptToken(data.refresh_token);

                    // Save the encrypted access token and refresh token in local storage
                    chrome.storage.local.set({
                        accessToken: encryptedAccessToken,
                        refreshToken: encryptedRefreshToken
                    }, () => {
                        console.log('Access and refresh tokens encrypted and saved in local storage.');

                        // Fetch and save the user info, then call the next steps
                        fetchAndSaveUserInfo(data.access_token, handleOAuth2Success);
                    });
                })
                .catch(error => console.error('Error exchanging code for token:', error));
        });
    });
};

async function handleOAuth2Success(FaceitForDevToken, WebhookSubscriptionId) {
    try {
        // Retrieve the player ID from local storage
        chrome.storage.local.get(['playerId'], async (data) => {
            const playerId = data.playerId;
            console.log('Retrieved Player ID from local storage:', playerId);

            if (!playerId) {
                console.error('Player ID not found in local storage.');
                return;
            }

            // Make a GET request to retrieve the current restrictions
            const subscriptionData = await fetch(`https://developers.faceit.com/api/webhooks/v1/subscriptions/${WebhookSubscriptionId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${FaceitForDevToken}`
                }
            }).then(response => response.json());

            const restrictions = subscriptionData.payload.restrictions || [];
            console.log('Current restrictions:', restrictions);

            // Check if player_id is in the restrictions
            const isPlayerRestricted = restrictions.some(restriction => restriction.value === playerId);

            if (!isPlayerRestricted) {
                // Player ID is not in the restrictions, proceed with the PUT request
                restrictions.push({ type: 'user', value: playerId });

                // Make a PUT request to update the restrictions
                await fetch(`https://developers.faceit.com/api/webhooks/v1/subscriptions/${WebhookSubscriptionId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${FaceitForDevToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...subscriptionData.payload,
                        restrictions: restrictions
                    })
                }).then(response => {
                    if (response.ok) {
                        console.log('Restrictions updated successfully.');
                    } else {
                        console.error('Failed to update restrictions:', response.statusText);
                    }
                });
            } else {
                console.log('Player ID already in restrictions.');
            }
        });
    } catch (error) {
        console.error('Error during the OAuth2 process:', error);
    }
}
// Call this function after OAuth2 authorization is successful
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'oauthSuccess') {
        handleOAuth2Success(message.accessToken);
    }
});