document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('message');
    const button = document.getElementById('save');

    button.addEventListener('click', () => {
        const message = input.value;
        console.log('Message from text box:', message);

        // Save the message to chrome.storage.sync
        chrome.storage.sync.set({ 'matchMessage': message }, () => {
            console.log('Message saved:', message);
        });
    });
});