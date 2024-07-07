document.addEventListener('DOMContentLoaded', function () {
    const messageInput = document.getElementById('message');
    const changeButton = document.getElementById('change');

    chrome.storage.local.get('savedMessage', (data) => {
        messageInput.value = data.savedMessage || '';
    });

    changeButton.addEventListener('click', function () {
        const isDisabled = messageInput.disabled;
        messageInput.disabled = !isDisabled;
        messageInput.focus();
        changeButton.textContent = isDisabled ? 'Save' : 'Change';

        if (!isDisabled) {
            const savedMessage = messageInput.value;
            chrome.storage.local.set({ 'savedMessage': savedMessage }, () => {
                console.log('Saved message to local storage:', savedMessage);
                chrome.runtime.sendMessage({ action: 'getSavedMessage' }, (response) => {
                    console.log('Saved message sent to background script:', response);
                });
            });
        }
    });
});
