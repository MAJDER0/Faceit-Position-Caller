// Listen for the message from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("ContentScript");
    if (request.action === 'sendMessageToRoom') {
        const messageToSend = request.message;

        // Wait for the text area to appear (dynamic loading can cause issues if it's not ready)
        const checkInterval = setInterval(() => {
            const textArea = document.querySelector('textarea[class*="Message team"]');
            if (textArea) {
                // Text area found, clear interval and send message
                clearInterval(checkInterval);

                // Focus the text area and insert the message
                textArea.focus();
                textArea.value = messageToSend;

                // Optionally trigger any event if required to simulate user typing (depends on the website)
                const inputEvent = new Event('input', { bubbles: true });
                textArea.dispatchEvent(inputEvent);

                console.log('Message sent to text area:', messageToSend);
                sendResponse({ status: 'Message sent' });
            }
        }, 500); // Check every 500ms

        // Set a timeout to stop trying after 10 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            sendResponse({ status: 'Timeout - textarea not found' });
        }, 10000); // 10 seconds timeout
    }
});


