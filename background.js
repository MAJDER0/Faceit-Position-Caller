// background.js

// Example: Listen for 'matchReady' event from server
const socket = io('http://localhost:3000'); // Replace with your actual Socket.IO server URL

socket.on('matchReady', (message) => {
    console.log('Match is ready, sending message to team chat:', message);
    setMessageInTeamChat(message);
});

function setMessageInTeamChat(message) {
    const textarea = document.querySelector('textarea[placeholder^="Message team_"]');
    if (textarea) {
        textarea.value = message;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        const enterEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            keyCode: 13, // Enter key
        });
        textarea.dispatchEvent(enterEvent);
    }
}
