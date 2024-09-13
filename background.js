// Console log to indicate the background script is running
console.log('Background script is running.');

// Caching settings for better performance
let cachedSettings = null;

// Load settings from appsettings.json with caching to avoid redundant loads
function loadSettings(callback) {
    if (cachedSettings) {
        callback(cachedSettings);
    } else {
        fetch(chrome.runtime.getURL('appsettings.json'))
            .then(response => response.json())
            .then(json => {
                cachedSettings = json;
                callback(json);
            })
            .catch(error => console.error('Error loading settings:', error));
    }
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

// Function to retrieve match details from Faceit API using matchId
async function getMatchDetails(matchId, callback) {
    loadSettings(async (settings) => {
        const faceitKey = settings.faceit.FaceitKey;
        const apiUrl = `https://open.faceit.com/data/v4/matches/${matchId}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${faceitKey}`,
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const matchData = await response.json();
                const mapPick = matchData?.voting?.map?.pick[0] || '';
                console.log('Map Pick:', mapPick);

                if (mapPick) {
                    fetchMessageForMap(mapPick);
                }
                if (callback) callback(mapPick); // Trigger callback if provided
            } else {
                console.error('Failed to retrieve match details:', response.status);
            }
        } catch (error) {
            console.error('Error fetching match details:', error);
        }
    });
}

// Function to fetch the message for the selected map and decide whether to send it to Team Chat or General Chat
function fetchMessageForMap(mapPick) {
    if (!mapPick) {
        console.error('No map selected');
        return;
    }

    const mapTextAreas = {
        "de_ancient": "Ancient",
        "de_mirage": "Mirage",
        "de_dust2": "Dust2",
        "de_anubis": "Anubis",
        "de_inferno": "Inferno",
        "de_vertigo": "Vertigo",
        "de_nuke": "Nuke"
    };

    const textAreaId = mapTextAreas[mapPick];

    if (textAreaId) {
        chrome.storage.local.get([textAreaId, 'mapPicks', 'matchId'], (data) => {
            const message = data[textAreaId] || '';
            const mapPicksState = data.mapPicks;
            const matchId = data.matchId;

            if (!message) {
                console.error(`No message found for ${textAreaId}`);
                return;
            }
            console.log('xxx',mapPicksState);
            if (mapPicksState === 'TeamChatMap') {
                console.log(`Sending message to Team Chat for map: ${mapPick}`);
                checkForMatchRoomTabAndSendMessage(matchId, message);  // Call the function for Team Chat
            } else if (mapPicksState === 'GeneralChat') {
                console.log(`Sending message to General Chat for map: ${mapPick}`);
                triggerMessageSendingForMapPick(matchId, message);  // Call the function for General Chat
            } else if (mapPicksState === 'BothChat') {
                checkForMatchRoomTabAndSendMessage(matchId, message)
                triggerMessageSendingForMapPick(matchId, message);               
            } else {
                console.error('Unknown mapPicks state');
            }
        });
    } else {
        console.error('Map not recognized or no corresponding textarea found.');
    }
}

// Function to trigger message sending to General Chat for a selected map pick
function triggerMessageSendingForMapPick(matchId, message) {
    chrome.storage.local.get(['accessToken', 'extensionEnabled'], async (data) => {
        if (!data.extensionEnabled) {
            console.log('Extension is disabled. Message will not be sent.');
            return;
        }

        const roomId = `match-${matchId}`;

        // Decrypt the access token before using it
        const { ciphertext, iv, key } = data.accessToken;
        const decryptedToken = await decryptToken(ciphertext, iv, key);

        console.log(`Sending message to General Chat room: ${roomId}, Message: ${message}`);

        // Send the message to the general chat via POST request
        fetch(`https://open.faceit.com/chat/v1/rooms/${roomId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${decryptedToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ body: message })
        })
            .then(response => response.json())
            .then(responseData => console.log('Message sent, response:', responseData))
            .catch(error => console.error('Error sending message:', error));
    });
}


// Optimized function to check for the match room tab and send a message
function checkForMatchRoomTabAndSendMessage(matchId, messageToSend) {
    chrome.storage.local.get(['extensionEnabled', 'CurrentTabId'], (data) => {
        if (!data.extensionEnabled) {
            console.log('Extension is disabled. Stopping match room check.');
            return;
        }

        const matchTabId = data.CurrentTabId;

        if (matchTabId) {
            console.log('Found CurrentTabId:', matchTabId);

            console.log('Attempting to inject content script into tab:', matchTabId);
            chrome.scripting.executeScript({
                target: { tabId: matchTabId },
                files: ['contentScript.js']
            }).then(() => {
                console.log('Content script successfully injected into tab:', matchTabId);
                chrome.tabs.sendMessage(matchTabId, { action: 'sendMessageToRoom', message: messageToSend }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error sending message:', chrome.runtime.lastError);
                    } else {
                        console.log('Message successfully sent to content script:', response);
                    }
                });
            }).catch((error) => {
                console.error('Error injecting content script:', error);
            });
        } else {
            console.error('CurrentTabId not found in local storage.');
        }
    });
}

// Import the Socket.IO library
try {
    importScripts('libs/socket.io.min.js');
    console.log('Socket.IO script loaded successfully.');

    const socket = io('http://localhost:3000', {
        transports: ['websocket'],
    });

    socket.on('connect', () => {
        console.log('Connected to Socket.IO server');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from Socket.IO server');
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error.message);
    });

    socket.on('matchReady', (matchId) => {
        chrome.storage.local.get('extensionEnabled', (data) => {
            if (data.extensionEnabled) {
                console.log('Received matchReady event with matchId:', matchId);
                chrome.storage.local.set({ matchId }, () => {
                    console.log('Match ID saved in local storage:', matchId);
                    checkForMatchRoomTab(matchId); // Logic for handling match object created
                });
            } else {
                console.log('Extension is disabled. Ignoring matchReady event.');
            }
        });
    });

    socket.on('matchConfiguring', async () => {
        console.log('Received matchConfiguring event');
        chrome.storage.local.get('matchId', (data) => {
            const matchId = data.matchId;
            if (matchId) {
                console.log('Fetching match details for matchId:', matchId);
                getMatchDetails(matchId);
            } else {
                console.error('Match ID not found in local storage');
            }
        });
    });

} catch (e) {
    console.error('Failed to load Socket.IO script:', e);
}

function checkForMatchRoomTab(matchId, attempts = 0) {
    const maxAttempts = 160;
    const matchRoomUrlPattern = `/cs2/room/${matchId}`;

    console.log('Checking for match room links containing:', matchRoomUrlPattern);

    chrome.storage.local.get(['extensionEnabled', 'TeamChat'], (data) => {
        if (!data.extensionEnabled) {
            console.log('Extension is disabled. Stopping match room check.');
            return;
        }

        chrome.tabs.query({}, (tabs) => {
            let matchTabId = null;

            for (let tab of tabs) {
                if (tab.url && tab.url.includes(matchRoomUrlPattern)) {
                    console.log('Match room tab found:', tab.url);
                    matchTabId = tab.id;

                    // Save the matchTabId to local storage
                    chrome.storage.local.set({ CurrentTabId: matchTabId }, () => {
                        console.log('CurrentTabId saved in local storage:', matchTabId);
                    });

                    // Send general chat message
                    triggerMessageSending(matchId);

                    // Send team chat message if there's one in the TeamChat textarea
                    const teamChatMessage = data.TeamChat || '';
                    if (teamChatMessage) {
                        sendTeamChatMessage(matchTabId, teamChatMessage);
                    }

                    break;
                }
            }

            if (matchTabId) {
                console.log('Match room tab found, stopping further attempts.');
                return;
            }

            if (attempts < maxAttempts) {
                setTimeout(() => {
                    console.log(`Attempt ${attempts + 1} to find match room tab...`);
                    checkForMatchRoomTab(matchId, attempts + 1);
                }, 250);
            } else {
                console.log('Match room tab not found after 160 attempts.');
            }
        });
    });
}

// Function to send a message to the team chat
function sendTeamChatMessage(matchTabId, message) {
    chrome.scripting.executeScript({
        target: { tabId: matchTabId },
        files: ['contentScript.js']
    }).then(() => {
        chrome.tabs.sendMessage(matchTabId, { action: 'sendMessageToTeamChat', message: message }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error sending team chat message:', chrome.runtime.lastError);
            } else {
                console.log('Team chat message successfully sent:', response);
            }
        });
    }).catch((error) => {
        console.error('Error injecting content script for team chat:', error);
    });
}

// Function to trigger general chat message sending
function triggerMessageSending(matchId) {
    chrome.storage.local.get(['GeneralChat', 'accessToken', 'extensionEnabled'], async (data) => {
        if (!data.extensionEnabled) {
            console.log('Extension is disabled. Message will not be sent.');
            return;
        }

        const message = data.GeneralChat || '';
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

// Function to refresh access token
function refreshAccessToken() {
    loadSettings(settings => {
        chrome.storage.local.get(['refreshToken', 'extensionEnabled'], async (data) => {
            if (!data.extensionEnabled) {
                console.log('Extension is disabled. Token refresh will not proceed.');
                return;
            }

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
                    const encryptedAccessToken = await encryptToken(data.access_token);
                    const encryptedRefreshToken = await encryptToken(data.refresh_token);

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

// Set interval to refresh access token every 22 hours
setInterval(refreshAccessToken, 22 * 60 * 60 * 1000);

// Function to fetch and save user info in local storage
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

                chrome.storage.local.set({ nickname, country, playerId }, () => {
                    console.log('User information saved in local storage.');

                    const FaceitForDevToken = settings.faceit.FaceitForDevToken;
                    const WebhookSubscriptionId = settings.faceit.WebhookSubscriptionId;
                    if (callback) callback(FaceitForDevToken, WebhookSubscriptionId);
                });
            })
            .catch(error => console.error('Error fetching user info:', error));
    });
}

// OAuth2 flow related functions
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
                        if (chrome.runtime.lastError) {
                            console.error('OAuth2 flow failed:', chrome.runtime.lastError);
                            return;
                        }

                        if (!redirectUrl) {
                            console.error('No redirect URL received.');
                            return;
                        }

                        const urlParams = new URLSearchParams(new URL(redirectUrl).search);
                        const code = urlParams.get('code');
                        if (code) {
                            exchangeCodeForToken(code, clientId, redirectUri, tokenUrl);
                        } else {
                            console.error('No authorization code found in redirect URL.');
                        }
                    });
                });
            });
        });
    }

    if (message.action === 'updateSavedMessage') {
        chrome.storage.local.set({ savedMessage: message.savedMessage }, () => {
            sendResponse({ status: 'saved' });
        });
        return true;
    }
});

// Exchange authorization code for access token
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
                .then(response => response.json())
                .then(async data => {
                    const encryptedAccessToken = await encryptToken(data.access_token);
                    const encryptedRefreshToken = await encryptToken(data.refresh_token);

                    chrome.storage.local.set({
                        accessToken: encryptedAccessToken,
                        refreshToken: encryptedRefreshToken
                    }, () => {
                        fetchAndSaveUserInfo(data.access_token, handleOAuth2Success);
                    });
                })
                .catch(error => console.error('Error exchanging code for token:', error));
        });
    });
};

// OAuth2 success handling
async function handleOAuth2Success(FaceitForDevToken, WebhookSubscriptionId) {
    try {
        chrome.storage.local.get(['playerId'], async (data) => {
            const playerId = data.playerId;

            if (!playerId) {
                console.error('Player ID not found in local storage.');
                return;
            }

            const subscriptionData = await fetch(`https://developers.faceit.com/api/webhooks/v1/subscriptions/${WebhookSubscriptionId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${FaceitForDevToken}`
                }
            }).then(response => response.json());

            const restrictions = subscriptionData.payload.restrictions || [];

            const isPlayerRestricted = restrictions.some(restriction => restriction.value === playerId);

            if (!isPlayerRestricted) {
                restrictions.push({ type: 'user', value: playerId });

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

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'oauthSuccess') {
        handleOAuth2Success(message.accessToken);
    }
});
