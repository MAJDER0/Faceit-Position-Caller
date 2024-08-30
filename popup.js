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
    const extensionState = document.getElementById('extensionState');
    const bodyElement = document.body;
    const positionItems = document.querySelectorAll('.Position-item');
    const logoElement = document.getElementById('logo');
    const FAQElement = document.getElementById('FAQ-text');
    const thirdScreen = document.getElementById('third-screen');

    // Function to update the UI based on the login status
    function updateUI(isLoggedIn) {
        if (isLoggedIn) {
            loginContainer.style.display = 'none';
            messageContainer.style.display = 'block';
            thirdScreen.style.display = 'none'; // Ensure third screen is hidden

            bodyElement.style.width = '630px';
            bodyElement.style.height = '525px';

            FAQElement.style.display = 'block';
            logoElement.style.top = '5%';

            chrome.storage.local.get(['savedMessage', 'nickname', 'country', 'extensionEnabled'], (data) => {
                messageInput.value = data.savedMessage || '';

                if (data.nickname && data.country) {
                    messagePlayerInfo.innerHTML = `Hello, ${data.nickname} <img class="flague" src="https://flagsapi.com/${data.country.toUpperCase()}/shiny/64.png" width="22px" height="22px">`;
                } else {
                    messagePlayerInfo.innerHTML = 'Hello, User';
                }

                extensionState.innerHTML = data.extensionEnabled
                    ? '<span style="color: #6BBE49;">Enabled</span>'
                    : '<span style="color: #F20707;">Disabled</span>';

                toggleExtensionButton.querySelector('span').textContent = data.extensionEnabled ? 'OFF' : 'ON';

                // Ensure this is called after setting up the UI elements
                animateMessageText();
            });
        } else {
            loginContainer.style.display = 'block';
            messageContainer.style.display = 'none';
            thirdScreen.style.display = 'none'; // Ensure third screen is hidden

            bodyElement.style.width = '460px';
            bodyElement.style.height = '270px';

            logoElement.style.top = '10%';
            FAQElement.style.display = 'none';

            animateInfoText();
        }
    }

    // Event listener for the "DETAILS" button
    FAQElement.addEventListener('click', function () {
        if (FAQElement.textContent === "DETAILS") {
            messageContainer.style.display = 'none';
            thirdScreen.style.display = 'block';
            FAQElement.textContent = "BACK";
        } else {
            thirdScreen.style.display = 'none';
            messageContainer.style.display = 'block';
            FAQElement.textContent = "DETAILS";
        }
    });

    // Save the message to local storage
    function saveMessage(message) {
        chrome.storage.local.set({
            'savedMessage': message
        }, () => {
            console.log('Saved message to local storage:', message);
            chrome.runtime.sendMessage({ action: 'updateSavedMessage', savedMessage: message });
        });
    }

    // Check if user is already logged in
    chrome.storage.local.get(['accessToken', 'extensionEnabled'], function (data) {
        if (data.extensionEnabled === undefined) {
            chrome.storage.local.set({ extensionEnabled: true }, function () {
                updateUI(!!data.accessToken);
            });
        } else {
            updateUI(!!data.accessToken);
        }
    });

    chrome.storage.onChanged.addListener(function (changes, areaName) {
        if (areaName === 'local') {
            if (changes.accessToken) {
                updateUI(!!changes.accessToken.newValue);
            }
            if (changes.savedMessage) {
                messageInput.value = changes.savedMessage.newValue || '';
            }
            if (changes.extensionEnabled) {
                extensionState.innerHTML = changes.extensionEnabled.newValue
                    ? '<span style="color: #6BBE49;">Enabled</span>'
                    : '<span style="color: #F20707;">Disabled</span>';
            }
        }
    });

    loginButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'startOAuth2' });
    });

    changeButton.addEventListener('click', function () {
        const isDisabled = messageInput.disabled;
        messageInput.disabled = !isDisabled;
        messageInput.focus();
        changeButton.querySelector('span').textContent = isDisabled ? 'SAVE' : 'ENTER A MESSAGE';

        if (!isDisabled) {
            const savedMessage = messageInput.value;
            saveMessage(savedMessage);
        }
    });

    logoutButton.addEventListener('click', function () {
        chrome.storage.local.remove(['nickname', 'savedMessage', 'country', 'accessToken', 'refreshToken'], function () {
            console.log('Local storage cleared.');
            updateUI(false);
        });
    });

    toggleExtensionButton.addEventListener('click', function () {
        chrome.storage.local.get('extensionEnabled', function (data) {
            const newState = !data.extensionEnabled;
            chrome.storage.local.set({ 'extensionEnabled': newState }, function () {
                toggleExtensionButton.querySelector('span').textContent = newState ? 'OFF' : 'ON';
                extensionState.innerHTML = newState
                    ? '<span style="color: #6BBE49;">Enabled</span>'
                    : '<span style="color: #F20707;">Disabled';
            });
        });
    });

    // Add event listeners to each Position-item
    positionItems.forEach(item => {
        item.addEventListener('click', function () {
            // Extract the position name by removing the leading "+ " from the text
            const positionText = item.textContent.trim().replace(/^\+\s*/, '');

            // Check if there's already text in the textarea
            if (messageInput.value.trim() === '') {
                messageInput.value = positionText;
            } else {
                messageInput.value += ` ${positionText}`;
            }
            saveMessage(messageInput.value.trim());
        });
    });

    // Initial animations
    animateInfoText();
    animateMessageText();  // Ensure this is called at the start
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
                    messageElement.textContent = messageText + cursor;
                }
                blinkMessageCursor(blinkCount + 1);
            }, 500);
        } else {
            messageElement.textContent = messageText;
        }
    }

    typeMessage();
}
