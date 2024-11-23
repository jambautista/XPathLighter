//This is a background script which interacts with the browser devtools.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle messages for starting or stopping detection mode
  if (message.action === 'startDetection' || message.action === 'stopDetection') {
    //Pass the message to current tab.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message to content script:", chrome.runtime.lastError);
          } else {
            console.log("Message relayed to content script:", response);
          }
        });
      }
    });
    sendResponse({ status: "Message relayed to content script" });

  } else if (message.action === 'displayXpath') {
     //Display a log message in the Console of the DevTool
     console.log("Received XPath message in background script:", message);

     //Pass the xpath to the panel of the extension.
     chrome.runtime.sendMessage(message, (response) => {
       if (chrome.runtime.lastError) {
         console.error("Error relaying XPath to sidebar:", chrome.runtime.lastError.message);
       } else {
         console.log("XPath relayed to sidebar:", response);
       }
     });

     sendResponse({ status: "XPath relayed to sidebar" });

  } else {
    //Catch errors or other actions not needed
    console.log("Unknown action received in background script:", message.action);
    sendResponse({ status: "Unknown action" });
  }

  //Return true to indicate asynchronous response
  return true;
});

//Check if extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed or updated");
});

//Function to make sure that the page can be interacted upon changing tab or refreshing the page.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    // Inject content.js into the active tab if the page is completely loaded
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }, () => {
      console.log("Content script injected successfully on tab update.");
    });
  }
});

//Ensures extension is active on the current tab.
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url && tab.url.startsWith('http')) { //Check if tab has a valid URL
      chrome.scripting.executeScript({
        target: { tabId: activeInfo.tabId },
        files: ['content.js']
      }, () => {
        console.log("Content script injected successfully on tab activation.");
      });
    }
  });
});
