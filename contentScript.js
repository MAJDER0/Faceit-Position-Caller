// contentScript.js

// Listen for messages from popup.js or other parts of the extension
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'sendMessage') {
        setMessageInTeamChat(message.text);
        // Optionally, send a response back
        sendResponse({ received: true });
    }
});

// Function to set message in the team chat textarea
function setMessageInTeamChat(message) {
    const textarea = document.querySelector('textarea[placeholder^="Message team_"]');
    if (textarea) {
        // Set the message in the textarea
        textarea.value = message;

        // Dispatch input event to trigger any listeners
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        // Optionally, trigger the form submit event if necessary
        const form = textarea.closest('form');
        if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true }));
        }
    }
}
