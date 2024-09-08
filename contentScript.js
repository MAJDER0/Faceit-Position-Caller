console.log("Content script loaded and waiting for messages.");

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Received message in content script:", request);

    if (request.action === 'sendMessageToRoom') {
        const messageToSend = request.message;
        sendMessageToRoom(messageToSend);
        sendResponse({ status: 'General chat message processed' });
    } else if (request.action === 'sendMessageToTeamChat') {
        const messageToSend = request.message;
        sendTeamChatMessage(messageToSend);
        sendResponse({ status: 'Team chat message processed' });
    }
});

// Function to send message to general chat
function sendMessageToRoom(message) {
    console.log("Attempting to send message:", message);

    // Select the textarea where the placeholder starts with "Message"
    const textArea = document.querySelector('textarea[placeholder^="Message team"]');

    if (textArea) {
        console.log('Textarea found:', textArea);
        textArea.focus();
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

// Function to send message to team chat
function sendTeamChatMessage(message) {
    console.log("Attempting to send team chat message:", message);

    // Select the textarea where the placeholder starts with "Message team"
    const teamTextArea = document.querySelector('textarea[placeholder^="Message team"]');

    if (teamTextArea) {
        console.log('Team chat textarea found:', teamTextArea);
        teamTextArea.focus();
        teamTextArea.value = message;
        teamTextArea.dispatchEvent(new Event('input', { bubbles: true }));

        // Trigger Enter key
        const enterEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            keyCode: 13, // Enter key code
        });
        teamTextArea.dispatchEvent(enterEvent);

        console.log("Team chat message sent:", message);
    } else {
        console.error("Team chat textarea not found");
    }
}
