document.addEventListener('DOMContentLoaded', function () {
    const loginButton = document.getElementById('login');
    const loginContainer = document.getElementById('login-container');
    const messageContainer = document.getElementById('message-container');
    const changeButton = document.getElementById('change');
    const clearButton = document.getElementById('Clear');
    const logoutButton = document.getElementById('logout');
    const toggleExtensionButton = document.getElementById('toggleExtension');
    const messagePlayerInfo = document.getElementById('messagePlayerInfo');
    const extensionState = document.getElementById('extensionState');
    const bodyElement = document.body;
    const positionItems = document.querySelectorAll('.Position-item');
    const logoElement = document.getElementById('logo');
    const FAQElement = document.getElementById('FAQ-text');
    const thirdScreen = document.getElementById('third-screen');
    const mapSelector = document.getElementById('mapSelector');
    const mapPicksDropdown = document.getElementById('mapPicks');

    let isThirdScreenVisible = false;

    // Adjust the width of the mapPicks dropdown based on the current selection
    function adjustWidth(selectedValue) {
        if (selectedValue === 'TeamChatMap') {
            mapPicksDropdown.style.width = '50%';
        } else if (selectedValue === 'GeneralChat') {
            mapPicksDropdown.style.width = '60%';
        } else if (selectedValue === 'BothChat') {
            mapPicksDropdown.style.width = '75%';
        }
    }

    // Load saved mapPicks and mapSelector state on popup load
    chrome.storage.local.get(['mapPicks', 'mapSelector'], function (data) {
        // Load or set default for mapPicks
        if (data.mapPicks) {
            mapPicksDropdown.value = data.mapPicks;
            adjustWidth(data.mapPicks);
        } else {
            // Default to 'TeamChatMap' if mapPicks is not set
            chrome.storage.local.set({ 'mapPicks': 'TeamChatMap' }, function () {
                mapPicksDropdown.value = 'TeamChatMap';
                adjustWidth('TeamChatMap');
                console.log('mapPicks set to TeamChatMap by default');
            });
        }

        // Load saved mapSelector value
        if (data.mapSelector) {
            mapSelector.value = data.mapSelector;
        } else {
            // Default to 'GeneralChat' on first load if mapSelector is not set
            chrome.storage.local.set({ 'mapSelector': 'GeneralChat' }, function () {
                mapSelector.value = 'GeneralChat';
                console.log('mapSelector set to GeneralChat by default');
            });
        }
        updatePlaceholders();
        switchTextarea();
    });

    // Save the selected mapPicks value to local storage whenever it changes
    mapPicksDropdown.addEventListener('change', function () {
        const selectedValue = mapPicksDropdown.value;
        chrome.storage.local.set({ 'mapPicks': selectedValue }, function () {
            console.log(`MapPicks state saved: ${selectedValue}`);
        });
        adjustWidth(selectedValue);
    });

    // Save the selected mapSelector value to local storage whenever it changes
    mapSelector.addEventListener('change', function () {
        const selectedValue = mapSelector.value;
        chrome.storage.local.set({ 'mapSelector': selectedValue }, function () {
            console.log(`MapSelector state saved: ${selectedValue}`);
        });
        updatePlaceholders();
        switchTextarea();
    });

    function updatePlaceholders() {
        const chatType = document.getElementById('mapPicks').value;
        const map = document.getElementById('mapSelector').value;

        let chatLabel = chatType === 'TeamChatMap' ? 'team chat' : chatType === 'GeneralChat' ? 'general chat' : 'both chats';

        const maps = ['Ancient', 'Mirage', 'Dust2', 'Anubis', 'Inferno', 'Vertigo', 'Nuke'];

        maps.forEach(mapName => {
            const textarea = document.getElementById(mapName);
            if (textarea) {
                textarea.placeholder = `Send your message to the ${chatLabel} after ${mapName} has been picked...`;
            }
        });
    }

    const textareas = {
        GeneralChat: document.getElementById('message'),
        TeamChat: document.getElementById('TeamChat'),
        Ancient: document.getElementById('Ancient'),
        Mirage: document.getElementById('Mirage'),
        Dust2: document.getElementById('Dust2'),
        Anubis: document.getElementById('Anubis'),
        Inferno: document.getElementById('Inferno'),
        Vertigo: document.getElementById('Vertigo'),
        Nuke: document.getElementById('Nuke')
    };

    function switchTextarea() {
        const selectedMap = mapSelector.value;
        for (let map in textareas) {
            textareas[map].style.display = (map === selectedMap) ? 'block' : 'none';
        }
    }

    function updateUI(isLoggedIn, extensionEnabled) {
        if (isLoggedIn) {
            loginContainer.style.display = 'none';
            messageContainer.style.display = isThirdScreenVisible ? 'none' : 'block';
            thirdScreen.style.display = isThirdScreenVisible ? 'block' : 'none';

            bodyElement.style.width = '645px';
            bodyElement.style.height = '555px';

            FAQElement.style.display = 'block';
            logoElement.style.top = '5%';

            toggleUIElements(extensionEnabled);

            chrome.storage.local.get(['nickname', 'country', 'mapPicks'], (data) => {
                if (data.nickname && data.country) {
                    messagePlayerInfo.innerHTML = `Hello, ${data.nickname} <img class="flague" src="https://flagsapi.com/${data.country.toUpperCase()}/shiny/64.png" width="22px" height="22px">`;
                }

                extensionState.innerHTML = extensionEnabled
                    ? '<span style="color: #6BBE49;">Enabled</span>'
                    : '<span style="color: #F20707;">Disabled</span>';

                toggleExtensionButton.querySelector('span').textContent = extensionEnabled ? 'OFF' : 'ON';

                // Ensure the correct width is set based on the saved mapPicks
                if (data.mapPicks) {
                    mapPicksDropdown.value = data.mapPicks;  // Set the dropdown to the saved value
                    adjustWidth(data.mapPicks);              // Adjust width based on saved state
                } else {
                    adjustWidth('TeamChatMap');  // Default to TeamChatMap if no mapPicks saved
                }

                animateInfoText();
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
        }
    }

    function loadSavedMessages() {
        chrome.storage.local.get(Object.keys(textareas), function (data) {
            for (let map in textareas) {
                textareas[map].value = data[map] || '';
                textareas[map].disabled = true;
            }
        });
    }

    function toggleUIElements(enable) {
        const elementsToToggle = [changeButton, clearButton, ...positionItems];

        elementsToToggle.forEach(element => {
            element.disabled = !enable;
        });
    }

    switchTextarea();

    changeButton.addEventListener('click', function () {
        const selectedMap = mapSelector.value;
        const currentTextarea = textareas[selectedMap];

        if (currentTextarea.disabled) {
            currentTextarea.disabled = false;
            currentTextarea.focus();
            changeButton.querySelector('span').textContent = 'SAVE';
        } else {
            const savedMessage = currentTextarea.value.trim();
            const storageKey = selectedMap;

            chrome.storage.local.set({ [storageKey]: savedMessage }, () => {
                currentTextarea.disabled = true;
                changeButton.querySelector('span').textContent = 'ENTER A MESSAGE';
            });
        }
    });

    clearButton.addEventListener('click', function () {
        const selectedMap = mapSelector.value;
        const currentTextarea = textareas[selectedMap];
        currentTextarea.value = '';

        const storageKey = selectedMap;
        chrome.storage.local.set({ [storageKey]: '' }, () => {
            console.log(`${storageKey} message cleared.`);
        });
    });

    mapSelector.addEventListener('change', switchTextarea);

    loginButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'startOAuth2' });
    });

    logoutButton.addEventListener('click', function () {
        // Reset mapSelector to GeneralChat on logout
        chrome.storage.local.set({ 'mapPicks': null, 'mapSelector': 'GeneralChat' }, function () {
            chrome.storage.local.clear(function () {
                if (chrome.runtime.lastError) {
                    console.error("Error clearing local storage: ", chrome.runtime.lastError);
                } else {
                    console.log('Local storage cleared.');
                    mapPicksDropdown.value = 'TeamChatMap'; // Reset the dropdown to default visually
                    mapSelector.value = 'GeneralChat'; // Reset mapSelector to GeneralChat
                    adjustWidth('TeamChatMap'); // Reset the width to default
                    updateUI(false, false);  // Update the UI to reflect logged out state
                }
            });
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

                toggleUIElements(newState);
            });
        });
    });

    positionItems.forEach(item => {
        item.addEventListener('click', function () {
            const positionText = item.textContent.trim().replace(/^\+\s*/, '');
            const selectedMap = mapSelector.value;
            const currentTextarea = textareas[selectedMap];

            if (currentTextarea.value.trim() === '') {
                currentTextarea.value = positionText;
            } else {
                currentTextarea.value += ` ${positionText}`;
            }

            const storageKey = selectedMap;
            chrome.storage.local.set({ [storageKey]: currentTextarea.value.trim() }, () => {
                console.log('Message updated with position and saved to local storage:', currentTextarea.value.trim());
            });
        });
    });

    FAQElement.addEventListener('click', function () {
        isThirdScreenVisible = !isThirdScreenVisible;
        if (isThirdScreenVisible) {
            messageContainer.style.display = 'none';
            thirdScreen.style.display = 'block';
            FAQElement.textContent = "BACK";
            bodyElement.style.width = '705px';
            bodyElement.style.height = '598px';
        } else {
            thirdScreen.style.display = 'none';
            messageContainer.style.display = 'block';
            FAQElement.textContent = "DETAILS";
            bodyElement.style.width = '635px';
            bodyElement.style.height = '545px';
        }
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

    checkLoginState();

    function checkLoginState() {
        chrome.storage.local.get(['nickname', 'playerId', 'extensionEnabled', 'mapPicks'], function (data) {
            const isLoggedIn = !!data.nickname && !!data.playerId;

            if (data.extensionEnabled === undefined) {
                chrome.storage.local.set({ extensionEnabled: false }, function () {
                    updateUI(isLoggedIn, false);
                });
            } else {
                updateUI(isLoggedIn, data.extensionEnabled);
            }

            console.log(data.mapPicks);

            // Set mapPicks to TeamChatMap if it's not defined (first login)
            if (!data.mapPicks) {
                chrome.storage.local.set({ mapPicks: 'TeamChatMap' }, function () {
                    mapPicksDropdown.value = 'TeamChatMap'; // Set the dropdown to TeamChatMap
                    adjustWidth('TeamChatMap'); // Adjust width based on TeamChatMap
                    console.log('mapPicks state set to TeamChatMap by default');
                });
            } else {
                adjustWidth(data.mapPicks); // Adjust width based on saved mapPicks
            }
        });
    }

    chrome.storage.onChanged.addListener(function (changes, areaName) {
        if (areaName === 'local') {
            if (changes.nickname && changes.playerId) {
                updateUI(!!(changes.nickname.newValue && changes.playerId.newValue), changes.extensionEnabled?.newValue);
            }
            if (changes.GeneralChat) {
                textareas.GeneralChat.value = changes.GeneralChat.newValue || '';
            }
            Object.keys(textareas).forEach((map) => {
                if (changes[map]) {
                    textareas[map].value = changes[map].newValue || '';
                }
            });
            if (changes.extensionEnabled) {
                extensionState.innerHTML = changes.extensionEnabled.newValue
                    ? '<span style="color: #6BBE49;">Enabled</span>'
                    : '<span style="color: #F20707;">Disabled</span>';

                toggleUIElements(changes.extensionEnabled.newValue);
            }
        }
    });

    loadSavedMessages();
});
