//popup.js
document.addEventListener('DOMContentLoaded', function () {
    const messageInput = document.getElementById('message');
    const changeButton = document.getElementById('change');

    chrome.storage.local.get(['savedMessage', 'isMessageCentered'], (data) => {
        messageInput.value = data.savedMessage || '';
        messageInput.style.textAlign = data.isMessageCentered ? 'center' : 'left';
    });

    changeButton.addEventListener('click', function () {
        const isDisabled = messageInput.disabled;
        messageInput.disabled = !isDisabled;
        messageInput.focus();
        changeButton.textContent = isDisabled ? 'Save' : 'Change';

        if (!isDisabled) {
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
        } else {
            // Reset text alignment when enabling the input
            messageInput.style.textAlign = 'left';
            chrome.storage.local.set({ 'isMessageCentered': false });
        }
    });
});
