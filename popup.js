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

    let isThirdScreenVisible = false;  // Track if the third screen is visible

    function updateUI(isLoggedIn) {
        if (isLoggedIn) {
            loginContainer.style.display = 'none';
            messageContainer.style.display = isThirdScreenVisible ? 'none' : 'block';
            thirdScreen.style.display = isThirdScreenVisible ? 'block' : 'none';

            bodyElement.style.width = '630px';
            bodyElement.style.height = '525px';

            FAQElement.style.display = 'block';
            logoElement.style.top = '5%';

            chrome.storage.local.get(['savedMessage', 'nickname', 'country', 'extensionEnabled'], (data) => {
                messageInput.value = data.savedMessage || '';

                if (data.nickname && data.country) {
                    messagePlayerInfo.innerHTML = `Hello, ${data.nickname} <img class="flague" src="https://flagsapi.com/${data.country.toUpperCase()}/shiny/64.png" width="22px" height="22px">`;
                }

                extensionState.innerHTML = data.extensionEnabled
                    ? '<span style="color: #6BBE49;">Enabled</span>'
                    : '<span style="color: #F20707;">Disabled</span>';

                toggleExtensionButton.querySelector('span').textContent = data.extensionEnabled ? 'OFF' : 'ON';

                animateMessageText();
            });
        } else {
            loginContainer.style.display = 'block';
            messageContainer.style.display = 'none';
            thirdScreen.style.display = 'none';

            bodyElement.style.width = '460px';
            bodyElement.style.height = '270px';

            logoElement.style.top = '10%';
            FAQElement.style.display = 'none';

            animateInfoText();
        }
    }

    function checkLoginState() {
        chrome.storage.local.get(['nickname', 'playerId', 'extensionEnabled'], function (data) {
            const isLoggedIn = !!data.nickname && !!data.playerId;
            if (data.extensionEnabled === undefined) {
                chrome.storage.local.set({ extensionEnabled: true }, function () {
                    updateUI(isLoggedIn);
                });
            } else {
                updateUI(isLoggedIn);
            }
        });
    }

    FAQElement.addEventListener('click', function () {
        isThirdScreenVisible = !isThirdScreenVisible;  // Toggle the third screen visibility
        if (isThirdScreenVisible) {
            messageContainer.style.display = 'none';
            thirdScreen.style.display = 'block';
            FAQElement.textContent = "BACK";
        } else {
            thirdScreen.style.display = 'none';
            messageContainer.style.display = 'block';
            FAQElement.textContent = "DETAILS";
        }
    });

    chrome.storage.onChanged.addListener(function (changes, areaName) {
        if (areaName === 'local') {
            if (changes.nickname && changes.playerId) {
                updateUI(!!(changes.nickname.newValue && changes.playerId.newValue));
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
            chrome.storage.local.set({ savedMessage }, () => {
                console.log('Message saved to local storage:', savedMessage);
            });
        }
    });

    logoutButton.addEventListener('click', function () {
        chrome.storage.local.remove(['nickname', 'country', 'accessToken', 'refreshToken', 'playerId'], function () {
            console.log('Local storage cleared, but savedMessage is intact.');
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
                    : '<span style="color: #F20707;">Disabled</span>';
            });
        });
    });

    positionItems.forEach(item => {
        item.addEventListener('click', function () {
            const positionText = item.textContent.trim().replace(/^\+\s*/, '');

            if (messageInput.value.trim() === '') {
                messageInput.value = positionText;
            } else {
                messageInput.value += ` ${positionText}`;
            }
            chrome.storage.local.set({ savedMessage: messageInput.value.trim() }, () => {
                console.log('Message updated with position and saved to local storage:', messageInput.value.trim());
            });
        });
    });

    animateInfoText();
    animateMessageText();

    checkLoginState(); // Initial check for login state on DOMContentLoaded
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
        if (blinkCount < 4) {
            setTimeout(function () {
                if (messageElement.textContent.endsWith(cursor)) {
                    messageElement.textContent = messageText;
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