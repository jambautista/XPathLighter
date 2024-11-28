let isSidebarOpen = false;

// Listen for connections from the sidebar
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "devtools-sidebar") {
        isSidebarOpen = true;
        console.log("Sidebar opened.");

        port.onDisconnect.addListener(() => {
            isSidebarOpen = false;
            console.log("Sidebar closed.");
        });
    }
});

// Handle messages from content and devtools
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message in background script:", message);

    switch (message.action) {
        case 'startDetection':
        case 'stopDetection':
            relayToActiveTab(message, sendResponse);
            break;
        case 'displayLocator':
            if (isSidebarOpen) {
                relayToSidebar(message, sendResponse);
            } else {
                console.warn("Sidebar is not open, message not sent.");
                sendResponse({ status: "Sidebar not open, message not sent" });
            }
            break;
        default:
            console.warn("Unknown action received:", message.action);
            sendResponse({ status: "Unknown action" });
            break;
    }

    return true; // Keep the message channel open for asynchronous response
});

// Relay message to active tab content script
function relayToActiveTab(message, sendResponse) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending message to content script:", chrome.runtime.lastError.message);
                    sendResponse({ status: "Error sending message to content script", error: chrome.runtime.lastError.message });
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
}

// Relay message to sidebar
function relayToSidebar(message, sendResponse) {
    try {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error relaying locator to sidebar:", chrome.runtime.lastError.message);
                sendResponse({ status: "Error relaying locator to sidebar", error: chrome.runtime.lastError.message });
            } else {
                console.log("Locator relayed to sidebar:", response);
                sendResponse({ status: "Locator relayed to sidebar", response });
            }
        });
    } catch (error) {
        console.error("Unable to relay message to sidebar. It might be closed.", error);
        sendResponse({ status: "Error relaying locator to sidebar, sidebar might be closed." });
    }
}

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
      //Store the state in chrome.storage.local
      chrome.storage.local.set({ detectionActive: true }, () => {
          sendResponse({ status: "Detection started and stored in chrome.storage.local" });
      });
  } else if (message.action === "stopDetection") {
      detectionActive = false;
      chrome.storage.local.set({ detectionActive: false }, () => {
          sendResponse({ status: "Detection stopped and stored in chrome.storage.local" });
      });
  }
  return true; //Allow asynchronous response
});
