document.addEventListener('DOMContentLoaded', function () {
    const loginButton = document.getElementById('login');

    // Check if user is already logged in (optional)
    chrome.storage.local.get(['accessToken'], function (data) {
        if (data.accessToken) {
            // User is logged in, show message container
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('message-container').style.display = 'block';
        } else {
            // User is not logged in, show login button
            document.getElementById('login-container').style.display = 'block';
            document.getElementById('message-container').style.display = 'none';
        }
    });

    loginButton.addEventListener('click', () => {
        // Send a message to the background script to start the OAuth2 flow
        chrome.runtime.sendMessage({ action: 'startOAuth2' });
    });

    // Handle the change button to update the saved message
    document.getElementById('change').addEventListener('click', () => {
        const message = document.getElementById('message').value;
        chrome.runtime.sendMessage({ action: 'updateSavedMessage', savedMessage: message }, (response) => {
            if (response.status === 'saved') {
                alert('Message updated successfully!');
            } else {
                alert('Failed to update message.');
            }
        });
    });
});
