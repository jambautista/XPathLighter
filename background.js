//This is a background script which interacts with the browser DevTools and content scripts.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message in background script:", message);

  //Handle messages for starting or stopping detection mode
  if (message.action === 'startDetection' || message.action === 'stopDetection') {
    //Query the active tab in the current window
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        //Relay the message to the content script in the active tab
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message to content script:", chrome.runtime.lastError);
            sendResponse({ status: "Error sending message to content script", error: chrome.runtime.lastError });
          } else {
            console.log("Message relayed to content script:", response);
            sendResponse({ status: "Message relayed to content script", response });
          }
        });
      } else {
        console.warn("No active tab found.");
        sendResponse({ status: "No active tab found" });
      }
    });
    return true; //Keep the message channel open for asynchronous response
  } 
  //Handle messages for displaying locators
  else if (message.action === 'displayLocator') {
    console.log("Received locator message in background script:", message);

    //Relay the locator data to the sidebar
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error relaying locator to sidebar:", chrome.runtime.lastError.message);
        sendResponse({ status: "Error relaying locator to sidebar", error: chrome.runtime.lastError.message });
      } else {
        console.log("Locator relayed to sidebar:", response);
        sendResponse({ status: "Locator relayed to sidebar", response });
      }
    });
    return true;
  } 
  //Unknown actions or error handling
  else {
    console.warn("Unknown action received in background script:", message.action);
    sendResponse({ status: "Unknown action", action: message.action });
    return true;
  }
});

//Helper function to check if the URL is valid for script injection
function isValidURL(url) {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
}

//Store the detection state in chrome.storage.local
let detectionActive = false;

//Listen for tab updates to re-inject the content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && tab.url.startsWith("http")) {
    //Inject content script on page reload
    chrome.scripting.executeScript(
      { target: { tabId: tabId },
        files: ["content.js"],
      },
      () => { //Callback function to allow detection upon reload
        console.log("Content script injected after page reload.");
        //Restore detection mode if it was active before the reload
        if (detectionActive) {
          chrome.tabs.sendMessage(tabId, { action: "startDetection" }, (response) => {
            if (chrome.runtime.lastError) {
              console.error("Error resuming detection:", chrome.runtime.lastError.message);
            } else {
              console.log("Detection mode resumed:", response);
            }
          });
        }
      }
    );
  }
});

//Handle start/stop detection messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startDetection") {
    detectionActive = true;
    sendResponse({ status: "Detection started and stored in memory" });
  } else if (message.action === "stopDetection") {
    detectionActive = false;
    sendResponse({ status: "Detection stopped and stored in memory" });
  }
});
