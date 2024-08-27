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
    const extensionState = document.getElementById('extensionState'); // Reference to the extension state element
    const bodyElement = document.body;

    // Function to update the UI based on the login status
    function updateUI(isLoggedIn) {
        if (isLoggedIn) {
            loginContainer.style.display = 'none';
            messageContainer.style.display = 'block';

            // Increase the width and height by 50px
            bodyElement.style.width = '500px';
            bodyElement.style.height = '350px';

            // Load the saved message, user info, and toggle state from local storage
            chrome.storage.local.get(['savedMessage', 'nickname', 'country', 'extensionEnabled'], (data) => {
                messageInput.value = data.savedMessage || '';

                // Display the user's nickname and country flag
                if (data.nickname && data.country) {
                    messagePlayerInfo.innerHTML = `Hello, ${data.nickname} <img class="flague" src="https://flagsapi.com/${data.country.toUpperCase()}/shiny/64.png" width="22px" height="22px">`;
                } else {
                    console.error("Nickname or country is missing from local storage.");
                }

                // Set the extension state display with space
                if (data.extensionEnabled) {
                    extensionState.innerHTML = '<span style="color: #6BBE49;">Enabled</span>';
                } else {
                    extensionState.innerHTML = '<span style="color: #F20707;">Disabled</span>';
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
            if (changes.extensionEnabled) {
                if (changes.extensionEnabled.newValue) {
                    extensionState.innerHTML = '<span style="color: #6BBE49;">Enabled</span>';
                } else {
                    extensionState.innerHTML = '<span style="color: #F20707;">Disabled</span>';
                }
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
                'savedMessage': savedMessage
            }, () => {
                console.log('Saved message to local storage:', savedMessage);
                chrome.runtime.sendMessage({ action: 'updateSavedMessage', savedMessage: savedMessage });
            });
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
                extensionState.innerHTML = newState ? '<span style="color: #6BBE49;">Enabled</span>' : '<span style="color: #F20707;">Disabled</span>';
            });
        });
    });

    // Handle Enter key press to add 46 spaces at the end of the first line and move to the next line
    messageInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent the default action of moving to the next line

            const currentText = messageInput.value;
            const caretPosition = messageInput.selectionStart;
            const beforeCaret = currentText.substring(0, caretPosition);
            const afterCaret = currentText.substring(caretPosition);

            // Find the first newline character or end of text
            const firstLineEnd = beforeCaret.indexOf('\n') !== -1 ? beforeCaret.indexOf('\n') : beforeCaret.length;

            // Get the first line and the rest of the text
            const firstLine = beforeCaret.substring(0, firstLineEnd);
            const restOfText = beforeCaret.substring(firstLineEnd) + afterCaret;

            // Add 46 spaces to the end of the first line if they are not already present
            const paddedFirstLine = firstLine + ' '.repeat(Math.max(0, 46 - (firstLine.length % 46)));

            // Combine the padded first line with the rest of the text
            const newText = paddedFirstLine + '\n' + restOfText;

            // Set the new value in the text box
            messageInput.value = newText;

            // Move the caret to the start of the new line
            messageInput.selectionStart = messageInput.selectionEnd = paddedFirstLine.length + 1;
        }
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
