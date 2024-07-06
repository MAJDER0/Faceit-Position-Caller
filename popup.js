// popup.js

// Retrieve the saved message from local storage
let savedMessage = localStorage.getItem('savedMessage') || '';
const messageInput = document.getElementById('message');
messageInput.value = savedMessage;

// Toggle input and change button visibility
const changeButton = document.getElementById('change');
changeButton.addEventListener('click', function () {
    const isDisabled = messageInput.disabled;
    messageInput.disabled = !isDisabled;
    messageInput.focus(); // Focus on input when enabled
    changeButton.textContent = isDisabled ? 'Save' : 'Change';
    if (!isDisabled) {
        // Save the message to local storage
        savedMessage = messageInput.value;
        localStorage.setItem('savedMessage', savedMessage);
    }
});

// Handle automatic message sending on match ready (simulated with a button click)
document.getElementById('save').addEventListener('click', function () {
    // Simulate match ready event
    simulateMatchReady(savedMessage);
});

// Replace the simulateMatchReady function with actual logic to handle match ready event
function simulateMatchReady(message) {
    console.log('Match is ready! Sending message to team chat:', message);
    // Replace with logic to send message to team chat
    // For testing, you can log the message to the console or display an alert
    alert('Match is ready! Sending message to team chat: ' + message);
}

