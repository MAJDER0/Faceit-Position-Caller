console.log("Content script loaded and waiting for messages.");

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Received message in content script:", request);

    if (request.action === 'sendMessageToRoom') {
        const messageToSend = request.message;
        sendMessageToRoom(messageToSend);
        sendResponse({ status: 'Message processed' });
    }
});

function sendMessageToRoom(message) {
    console.log("Attempting to send message:", message);

    // Select the textarea where the placeholder starts with "Message team"
    const textArea = document.querySelector('textarea[placeholder^="Message team"]');

    if (textArea) {
        console.log('Textarea found:', textArea);
        textArea.focus(); // Ensure the textarea is focused
        textArea.value = message;
        textArea.dispatchEvent(new Event('input', { bubbles: true }));

        // Trigger Enter key
        const enterEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            keyCode: 13, // Enter key code
        });
        textArea.dispatchEvent(enterEvent);

        console.log("Message sent:", message);
    } else {
        console.error("Textarea not found");
    }
}
