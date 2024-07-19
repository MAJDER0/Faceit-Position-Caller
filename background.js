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
        chrome.storage.local.get('savedMessage', (data) => {
            const message = data.savedMessage || '';
            const matchUrl = `https://www.faceit.com/pl/cs2/room/${matchId}`;

            // Start polling for the match room page
            const checkTabsInterval = setInterval(() => {
                chrome.tabs.query({}, (tabs) => {
                    const matchingTab = tabs.find(tab => tab.url === matchUrl);
                    if (matchingTab) {
                        console.log('Found matching tab:', matchingTab.id);

                        // Wait an additional 2 seconds to ensure the page is fully loaded
                        setTimeout(() => {
                            chrome.scripting.executeScript({
                                target: { tabId: matchingTab.id },
                                files: ['contentScript.js']
                            }).then(() => {
                                console.log('Content script injected.');
                                chrome.tabs.sendMessage(matchingTab.id, { action: 'sendMessage', text: message });
                            }).catch((error) => {
                                console.error('Error injecting content script:', error);
                            });
                        }, 2000); // Adjust this delay as needed

                        // Clear the interval once the matching tab is found
                        clearInterval(checkTabsInterval);
                    } else {
                        console.log('Matching tab not found yet');
                    }
                });
            }, 1000); // Check every second
        });
    });
} catch (e) {
    console.error('Failed to load Socket.IO script:', e);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateSavedMessage') {
        console.log('Updated saved message:', message.savedMessage);
        chrome.storage.local.set({ savedMessage: message.savedMessage }, () => {
            sendResponse({ status: 'saved' });
        });
        return true; // Required to send a response asynchronously
    }
});
