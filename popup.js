// popup.js

// popup.js

document.getElementById('save').addEventListener('click', function () {
    let message = document.getElementById('message').value;
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'sendMessage', text: message }, function (response) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
            } else {
                console.log('Message sent to content script');
            }
        });
    });
});
