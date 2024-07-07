console.log('Content script loaded and running.');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendMessage') {
        console.log('Received message to send:', request.text);
        const textarea = document.querySelector('textarea[placeholder^="Message team_"]');
        if (textarea) {
            textarea.value = request.text;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new KeyboardEvent('keydown', {
                bubbles: true,
                cancelable: true,
                keyCode: 13, // Enter key
            }));
            sendResponse({ received: true });
        } else {
            console.log('Textarea for team chat not found');
            sendResponse({ received: false });
        }
    }
});
