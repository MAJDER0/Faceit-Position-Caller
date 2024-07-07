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

    socket.on('matchReady', () => {
        console.log('Received matchReady event');
        chrome.storage.local.get('savedMessage', (data) => {
            console.log('before sending1');
            const message = data.savedMessage || '';
            chrome.tabs.query({}, (tabs) => {
                const urlPattern = /\/cs2\/room/;
                const matchingTabs = tabs.filter(tab => urlPattern.test(tab.url));
                if (matchingTabs.length === 0) {
                    console.log('No matching tabs found');
                    return;
                }
                matchingTabs.forEach((tab) => {
                    console.log('Found tab:', tab.id);

                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['contentScript.js']
                    }).then(() => {
                        console.log('Content script injected.');
                        chrome.tabs.sendMessage(tab.id, { action: 'sendMessage', text: message });
                    }).catch((error) => {
                        console.error('Error injecting content script:', error);
                    });
                });
            });
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
