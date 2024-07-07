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

    socket.on('matchReady', (message) => {
        console.log('check');
        chrome.tabs.query({ url: 'https://www.faceit.com/*' }, (tabs) => {
            tabs.forEach((tab) => {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (msg) => {
                        chrome.runtime.sendMessage({ action: 'sendMessage', text: msg });
                    },
                    args: [message]
                });
            });
        });
    });
} catch (e) {
    console.error('Failed to load Socket.IO script:', e);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getSavedMessage') {
        chrome.storage.local.get('savedMessage', (data) => {
            sendResponse(data.savedMessage || '');
        });
        return true;
    }
});
