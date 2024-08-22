console.log('Content script loaded and running.');

function sendMessage(text) {
    console.log('Attempting to send message:', text);
    const textarea = document.querySelector('textarea[placeholder^="Message FACEIT"]');

    if (textarea) {
        textarea.focus(); // Ensure the textarea is focused
        textarea.value = text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        // Poll for textarea readiness
        const checkInterval = setInterval(() => {
            if (textarea === document.activeElement) {
                console.log('Textarea is focused and ready');
                clearInterval(checkInterval); // Stop checking

                textarea.dispatchEvent(new KeyboardEvent('keydown', {
                    bubbles: true,
                    cancelable: true,
                    keyCode: 13, // Enter key
                }));

                console.log('Message sent');
            } else {
                console.log('Waiting for textarea to be focused...');
            }
        }, 100); // Check every 100ms

    } else {
        console.log('Textarea for team chat not found');
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendMessage') {
        sendMessage(request.text);
        sendResponse({ received: true });
    }
});