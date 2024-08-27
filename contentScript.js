console.log('Content script loaded and running.');

document.addEventListener('DOMContentLoaded', function () {
    const messageInput = document.getElementById('message');

    messageInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent the default action of moving to the next line

            const currentText = messageInput.value;
            const caretPosition = messageInput.selectionStart;
            const beforeCaret = currentText.substring(0, caretPosition);
            const afterCaret = currentText.substring(caretPosition);

            // Add 46 spaces after the current line and then move to the next line
            const newText = beforeCaret + ' '.repeat(46) + '\n' + afterCaret;

            // Set the new value in the text box
            messageInput.value = newText;

            // Move the caret to the position after the added spaces and the new line
            messageInput.selectionStart = messageInput.selectionEnd = caretPosition + 47;
        }
    });
});
