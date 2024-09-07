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

// Function to retrieve match details from Faceit API using matchId
async function getMatchDetails(matchId) {
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

                // Log the retrieved map
                console.log('Map Pick:', mapPick);

                // Call function to fetch the message for the map
                fetchMessageForMap(mapPick);
            } else {
                console.error('Failed to retrieve match details:', response.status);
            }
        } catch (error) {
            console.error('Error fetching match details:', error);
        }
    });
}

// Function to fetch the message for the selected map
function fetchMessageForMap(mapPick) {
    if (!mapPick) {
        console.error('No map selected');
        return;
    }

    // Map the "de_" map names to text area IDs
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
        // Retrieve the message from local storage for the respective map
        chrome.storage.local.get(textAreaId, (data) => {
            const message = data[textAreaId] || 'No message found for this map';
            console.log(`Message for ${textAreaId}:`, message);

            // Pass the matchId and message to the next function
            chrome.storage.local.get('matchId', (storedData) => {
                const matchId = storedData.matchId;
                checkForMatchRoomTabAndSendMessage(matchId, message);
            });
        });
    } else {
        console.error('Map not recognized or no corresponding textarea found.');
    }
}

// Function to check for the match room tab and inject the message
function checkForMatchRoomTabAndSendMessage(matchId, messageToSend) {
    const matchRoomUrlPattern = `/room/${matchId}`;

    chrome.tabs.query({}, (tabs) => {
        let matchTabId = null;

        tabs.forEach(tab => {
            console.log('Checking tab URL:', tab.url);

            if (tab.url && tab.url.includes(matchRoomUrlPattern)) {
                matchTabId = tab.id;
                console.log('Match room tab found:', tab.url);
            }
        });

        if (matchTabId) {
            chrome.scripting.executeScript({
                target: { tabId: matchTabId },
                files: ['contentScript.js']
            }, () => {
                chrome.tabs.sendMessage(matchTabId, { action: 'sendMessageToRoom', message: messageToSend });
            });
        } else {
            console.log('Match room tab not found.');
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
        chrome.storage.local.set({ matchId }, () => {
            console.log('Match ID saved in local storage:', matchId);
            checkForMatchRoomTabAndSendMessage(matchId);
        });
    });

    socket.on('matchConfiguring', async (matchIdConfiguration) => {
        if (matchIdConfiguration) {
            getMatchDetails(matchIdConfiguration);
        } else {
            console.error('Match ID for configuration not provided');
        }
    });

} catch (e) {
    console.error('Failed to load Socket.IO script:', e);
}

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

setInterval(refreshAccessToken, 22 * 60 * 60 * 1000);

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
        return true;
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
                    return response.json();
                })
                .then(async data => {
                    const encryptedAccessToken = await encryptToken(data.access_token);
                    const encryptedRefreshToken = await encryptToken(data.refresh_token);

                    chrome.storage.local.set({
                        accessToken: encryptedAccessToken,
                        refreshToken: encryptedRefreshToken
                    }, () => {
                        console.log('Access and refresh tokens encrypted and saved in local storage.');
                        fetchAndSaveUserInfo(data.access_token, handleOAuth2Success);
                    });
                })
                .catch(error => console.error('Error exchanging code for token:', error));
        });
    });
};

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
