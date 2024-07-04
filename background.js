//background.js

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension Installed");
});

if (chrome.webNavigation) {
    chrome.webNavigation.onCompleted.addListener(async (details) => {
        if (details.url.includes('faceit.com') && details.url.includes('match')) {
            console.log('Navigated to match page:', details.url);
            await chrome.scripting.executeScript({
                target: { tabId: details.tabId },
                files: ['contentScript.js']
            });
        }
    }, { url: [{ urlMatches: 'https://*.faceit.com/*' }] });
} else {
    console.error('chrome.webNavigation API is not available.');
}
