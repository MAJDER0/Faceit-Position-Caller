console.log('Content script loaded and running.');



document.addEventListener("DOMContentLoaded", function () {
    animateInfoText();
});

function animateInfoText() {
    const info = document.getElementById("animatedInfo");
    const infoText = "Welcome to the Faceit Position Caller Extension. Please log in via FACEIT to access the features.";
    let infoIndex = 0;

    function typeInfo() {
        let displayedText = infoText.substring(0, infoIndex);
        if (infoIndex < infoText.length) {
            displayedText += "|"; // Add cursor if typing is still ongoing
        } else {
            displayedText = displayedText.slice(0, -1); // Remove cursor after typing is completed
        }
        info.textContent = displayedText;
        if (infoIndex < infoText.length) {
            infoIndex++;
            setTimeout(typeInfo, 50); // Adjust the speed of typing here
        } else {
            blinkInfoCursor(0); // Start blinking cursor after typing is completed
        }
    }

    function blinkInfoCursor(blinkCount) {
        if (blinkCount < 2) { // Blink only twice
            setTimeout(function () {
                if (info.textContent.endsWith("|")) {
                    info.textContent = info.textContent.slice(0, -1); // Remove cursor
                } else {
                    info.textContent += "|"; // Add cursor
                }
                blinkInfoCursor(blinkCount + 1); // Recursively call the function to count the blinks
            }, 500); // Adjust the speed of blinking here
        } else {
            // Ensure the cursor is removed after the final blink
            if (info.textContent.endsWith("|")) {
                info.textContent = info.textContent.slice(0, -1); // Remove cursor
            }
        }
    }

    typeInfo(); // Start typing immediately
}
