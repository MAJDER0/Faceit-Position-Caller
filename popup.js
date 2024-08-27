document.addEventListener('DOMContentLoaded', function () {
    const loginButton = document.getElementById('login');
    const loginContainer = document.getElementById('login-container');
    const messageContainer = document.getElementById('message-container');
    const messageInput = document.getElementById('message');
    const changeButton = document.getElementById('change');
    const logoutButton = document.getElementById('logout');
    const toggleExtensionButton = document.getElementById('toggleExtension');
    const messageInfo = document.getElementById('messageInfo');
    const messagePlayerInfo = document.getElementById('messagePlayerInfo');
    const bodyElement = document.body;

    // Function to update the UI based on the login status
    function updateUI(isLoggedIn) {
        if (isLoggedIn) {
            loginContainer.style.display = 'none';
            messageContainer.style.display = 'block';

            // Increase the width and height by 50px
            bodyElement.style.width = '500px';
            bodyElement.style.height = '350px';

            // Load the saved message, alignment, user info, and toggle state from local storage
            chrome.storage.local.get(['savedMessage', 'isMessageCentered', 'nickname', 'country', 'extensionEnabled'], (data) => {
                messageInput.value = data.savedMessage || '';
                messageInput.style.textAlign = data.isMessageCentered ? 'center' : 'left';

                // Display the user's nickname and country flag
                if (data.nickname && data.country) {
                    messagePlayerInfo.innerHTML = `Hello, ${data.nickname} <img class="flague" src="https://flagsapi.com/${data.country.toUpperCase()}/shiny/64.png" width="22px" height="22px">`;
                } else {
                    console.error("Nickname or country is missing from local storage.");
                }

                // Set the initial state of the toggle button (reversed logic)
                toggleExtensionButton.querySelector('span').textContent = data.extensionEnabled ? 'OFF' : 'ON';

                animateMessageText(); // Trigger the second animation when the message is displayed
            });
        } else {
            loginContainer.style.display = 'block';
            messageContainer.style.display = 'none';

            // Reset the width and height to the original size
            bodyElement.style.width = '420px';
            bodyElement.style.height = '270px';

            animateInfoText(); // Trigger the first animation on initial load
        }
    }

    // Check if user is already logged in
    chrome.storage.local.get(['accessToken', 'extensionEnabled'], function (data) {
        // If extensionEnabled is undefined, set it to true (default ON state)
        if (data.extensionEnabled === undefined) {
            chrome.storage.local.set({ extensionEnabled: true }, function () {
                updateUI(!!data.accessToken);
            });
        } else {
            updateUI(!!data.accessToken);
        }
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
        changeButton.querySelector('span').textContent = isDisabled ? 'SAVE' : 'ENTER A MESSAGE';

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

    logoutButton.addEventListener('click', function () {
        // Clear all data from local storage
        chrome.storage.local.clear(function () {
            console.log('Local storage cleared.');
            // Reset the UI to the login screen
            updateUI(false);
        });
    });

    toggleExtensionButton.addEventListener('click', function () {
        // Toggle the extension functionality
        chrome.storage.local.get('extensionEnabled', function (data) {
            const newState = !data.extensionEnabled;
            chrome.storage.local.set({ 'extensionEnabled': newState }, function () {
                toggleExtensionButton.querySelector('span').textContent = newState ? 'OFF' : 'ON';
                console.log('Extension state set to:', newState ? 'Enabled' : 'Disabled');
            });
        });
    });
});

function animateInfoText() {
    const info = document.getElementById("animatedInfo");
    const infoText = "Please log in via FACEIT to access the features.";
    let infoIndex = 0;
    const cursor = "|";

    function typeInfo() {
        let displayedText = infoText.substring(0, infoIndex);
        if (infoIndex < infoText.length) {
            displayedText += cursor;
        } else {
            displayedText = infoText;
        }
        info.textContent = displayedText;
        if (infoIndex < infoText.length) {
            infoIndex++;
            setTimeout(typeInfo, 15);
        } else {
            blinkInfoCursor(0);
        }
    }

    function blinkInfoCursor(blinkCount) {
        if (blinkCount < 4) {
            setTimeout(function () {
                if (info.textContent.endsWith(cursor)) {
                    info.textContent = infoText;
                } else {
                    info.textContent = infoText + cursor;
                }
                blinkInfoCursor(blinkCount + 1);
            }, 500);
        } else {
            info.textContent = infoText;
        }
    }

    typeInfo();
}

function animateMessageText() {
    const messageElement = document.getElementById("messageInfo");
    const messageText = "Please enter the message you'd like to instantly send to the match room within the blink of an eye.";
    let messageIndex = 0;
    const cursor = "|";

    function typeMessage() {
        let displayedText = messageText.substring(0, messageIndex);
        if (messageIndex < messageText.length) {
            displayedText += cursor;
        } else {
            displayedText = messageText;
        }
        messageElement.textContent = displayedText;
        if (messageIndex < messageText.length) {
            messageIndex++;
            setTimeout(typeMessage, 15);
        } else {
            blinkMessageCursor(0);
        }
    }

    function blinkMessageCursor(blinkCount) {
        if (blinkCount < 4) { // Blink only twice
            setTimeout(function () {
                if (messageElement.textContent.endsWith(cursor)) {
                    messageElement.textContent = messageText; // Remove cursor and show full text
                } else {
                    messageElement.textContent = messageText + cursor; // Add cursor
                }
                blinkMessageCursor(blinkCount + 1); // Recursively call the function to count the blinks
            }, 500); // Adjust the speed of blinking here
        } else {
            messageElement.textContent = messageText; // Ensure the full text is displayed without the cursor after the final blink
        }
    }

    typeMessage(); // Start typing immediately
}
