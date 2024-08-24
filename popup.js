document.addEventListener('DOMContentLoaded', function () {
    const loginButton = document.getElementById('login');
    const loginContainer = document.getElementById('login-container');
    const messageContainer = document.getElementById('message-container');
    const messageInput = document.getElementById('message');
    const changeButton = document.getElementById('change');

    // Function to update the UI based on the login status
    function updateUI(isLoggedIn) {
        if (isLoggedIn) {
            loginContainer.style.display = 'none';
            messageContainer.style.display = 'block';

            // Load the saved message and alignment from local storage
            chrome.storage.local.get(['savedMessage', 'isMessageCentered'], (data) => {
                messageInput.value = data.savedMessage || '';
                messageInput.style.textAlign = data.isMessageCentered ? 'center' : 'left';
            });
        } else {
            loginContainer.style.display = 'block';
            messageContainer.style.display = 'none';
        }
    }

    // Check if user is already logged in
    chrome.storage.local.get(['accessToken'], function (data) {
        updateUI(!!data.accessToken);
    });

    // Listen for changes in storage to dynamically update the UI
    chrome.storage.onChanged.addListener(function (changes, areaName) {
        if (areaName === 'local') {
            if (changes.accessToken) {
                updateUI(!!changes.accessToken.newValue);
            }
            if (changes.savedMessage) {
                messageInput.value = changes.savedMessage.newValue || '';
            }
        }
    });

    loginButton.addEventListener('click', () => {
        // Send a message to the background script to start the OAuth2 flow
        chrome.runtime.sendMessage({ action: 'startOAuth2' });
    });

    changeButton.addEventListener('click', function () {
        const isDisabled = messageInput.disabled;
        messageInput.disabled = !isDisabled;
        messageInput.focus();
        changeButton.textContent = isDisabled ? 'Save' : 'Change';

        if (!isDisabled) { // Save mode
            const savedMessage = messageInput.value;
            chrome.storage.local.set({
                'savedMessage': savedMessage,
                'isMessageCentered': true
            }, () => {
                console.log('Saved message to local storage:', savedMessage);
                chrome.runtime.sendMessage({ action: 'updateSavedMessage', savedMessage: savedMessage });
                // Center the text
                messageInput.style.textAlign = 'center';
            });
        } else { // Edit mode
            // Reset text alignment when enabling the input
            messageInput.style.textAlign = 'left';
            chrome.storage.local.set({ 'isMessageCentered': false });
        }
    });
});
