//Display XPath or CSS in the DevTool Sidebar
function displayLocatorInSidebar(xpath, cssSelector) {
  const batchMode = document.querySelector('input[name="detection-mode"]:checked').value === 'batch';

  console.log("Displaying in sidebar - XPath:", xpath, "CSS Selector:", cssSelector, "Batch mode:", batchMode);

  const optimizeXPath = document.getElementById('check-locator-xpath');
  const optimizeCSS = document.getElementById('check-locator-css');

  if (batchMode) {
    //Add XPath and CSS locators to their respective tables
    addLocatorToTable(xpath, 'xpath');
    addLocatorToTable(cssSelector, 'css');

    //Update validation fields in batch mode to allow optimization during batch mode
    if (optimizeXPath) {
      optimizeXPath.value = xpath;
    } else {
      console.error("Validation XPath field not found.");
    }

    if (optimizeCSS) {
      optimizeCSS.value = cssSelector;
    } else {
      console.error("Validation CSS field not found.");
    }

  } else {
    //Single Element Detection Mode - Update input fields
    const xpathInput = document.getElementById('xpath-selector');
    const cssInput = document.getElementById('css-selector');

    if (xpathInput) {
      xpathInput.value = xpath;
      optimizeXPath.value = xpath;
    } else {
      console.error("XPath input field not found.");
    }

    if (cssInput) {
      cssInput.value = cssSelector;
      optimizeCSS.value = cssSelector;
    } else {
      console.error("CSS selector input field not found.");
    }
  }
}

//Set is used to filter duplicated locators
const addedLocators = new Set();

function addLocatorToTable(locator, type) {
  const tableBody = document.getElementById(type === 'xpath' ? 'xpathTableBody' : 'cssTableBody');
  if (!tableBody) {
    console.error(`Table body not found for type: ${type}`);
    return;
  }

  //Normalize locator for storage
  const normalizedLocator = locator.trim().toLowerCase();

  //Check if locator is already added using the Set
  if (addedLocators.has(normalizedLocator)) {
    console.warn(`${type.toUpperCase()} locator already exists in the table:`, locator);
    return;
  }

  //Add the locator to the Set for tracking
  addedLocators.add(normalizedLocator);

  //Create a new row for the locator
  const row = document.createElement('tr');
  row.className = 'detectedLocators';

  //Create the label cell
  const labelCell = document.createElement('td');
  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.className = 'label-input';
  labelInput.value = type === 'xpath' ? generateLabelFromXPath(locator) : generateLabelFromCSS(locator);
  labelCell.appendChild(labelInput);

  //Create the locator value cell
  const valueCell = document.createElement('td');
  valueCell.textContent = locator;

  //Create the action cell with a Copy button
  const actionCell = document.createElement('td');
  const copyButton = document.createElement('button');
  copyButton.className = 'copy-table-btn';
  copyButton.textContent = 'Copy';
  
  //Add copy functionality to the button
  copyButton.addEventListener('click', () => {
    copyToClipboard(locator);
    alert(`${type.toUpperCase()} locator copied to clipboard!`);
  });
  
  actionCell.appendChild(copyButton);

  //Append all cells to the row
  row.appendChild(labelCell);
  row.appendChild(valueCell);
  row.appendChild(actionCell);

  //Append the row to the correct table body
  tableBody.appendChild(row);
  console.log(`Successfully added ${type.toUpperCase()} locator to table: "${locator}"`);
}



//Helper function to auto-generate a label for XPath
function generateLabelFromXPath(xpath) {
  //Try to extract the tag name, ID, and class from the XPath
  const elementTagMatch = xpath.match(/^\/\/(\w+)/);
  const tagName = elementTagMatch ? elementTagMatch[1] : 'Element';

  //Extract ID and class values from the XPath string
  const idMatch = xpath.match(/@id='([^']+)'/);     //Extract ID from XPath
  const classMatch = xpath.match(/@class='([^']+)'/); //Extract class from XPath

  if (idMatch) {
    //Use tagName + ID
    return `${tagName}_${idMatch[1]}`;
  } else if (classMatch) {
    //Use tagName + first class
    //Use the first class if there are multiple
    const firstClass = classMatch[1].split(' ')[0]; 
    return `${tagName}_${firstClass}`;
  } else {
    return `${tagName}_Element`;
  }
}

//Helper function to auto-generate a label for CSS
function generateLabelFromCSS(cssSelector) {
  //Extract tag name, ID, and class from CSS Selector
  const tagMatch = cssSelector.match(/^(\w+)/); //Extract tag name
  const tagName = tagMatch ? tagMatch[1] : 'Element';

  const idMatch = cssSelector.match(/#([^.\s]+)/); //Match ID in CSS (#id)
  const classMatch = cssSelector.match(/\.(\w+)/); //Match first class in CSS (.class)

  if (idMatch) {
    //Use tagName + ID
    return `${tagName}_${idMatch[1]}`;
  } else if (classMatch) {
    //Use tagName + first class
    return `${tagName}_${classMatch[1]}`;
  } else {
    return `${tagName}_Element`;
  }
}


//Function to copy text to the clipboard
function copyToClipboard(text) {
  const tempTextArea = document.createElement("textarea");
  tempTextArea.value = text;
  document.body.appendChild(tempTextArea);
  tempTextArea.select();
  document.execCommand("copy");
  document.body.removeChild(tempTextArea);
}


//Function to clear the locators list when switching modes
function clearLocators() {
  const xpathTableBody = document.getElementById('xpathTableBody');
  const cssTableBody = document.getElementById('cssTableBody');

  if (xpathTableBody) {
    xpathTableBody.innerHTML = ''; //Clear the XPath table
  } else {
    console.error("XPath table body not found.");
  }

  if (cssTableBody) {
    cssTableBody.innerHTML = ''; //Clear the CSS table
  } else {
    console.error("CSS table body not found.");
  }

  console.log("Locator tables cleared.");
}

//Function to generate CSV content from a table body
function generateCSVContent(tableBody) {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Selector Label,Selector Value\n"; //Add headers

  const rows = tableBody.querySelectorAll('tr');

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    const labelInput = cells[0].querySelector('input');
    //Get value from the labelInput field, if not, leave blank
    const label = labelInput ? labelInput.value : ''; 
    //Get selector value
    const value = cells[1].textContent; 
    csvContent += `${label},${value}\n`;
  });

  return csvContent;
}

//Function to export locators as CSV for both XPath and CSS tables
function exportLocators() {
  const xpathTableBody = document.getElementById('xpathTableBody');
  const cssTableBody = document.getElementById('cssTableBody');

  if (xpathTableBody.rows.length === 0 && cssTableBody.rows.length === 0) {
    alert("No elements to export.");
    return;
  }

  //Export XPath table
  if (xpathTableBody) {
    const xpathCSVContent = generateCSVContent(xpathTableBody);
    if (xpathCSVContent) {
      downloadCSV(xpathCSVContent, "xpath_locators.csv");
    } else {
      console.log("No rows in XPath table to export.");
    }
  }

  //Export CSS table
  if (cssTableBody) {
    const cssCSVContent = generateCSVContent(cssTableBody);
    if (cssCSVContent) {
      downloadCSV(cssCSVContent, "css_locators.csv");
    } else {
      console.log("No rows in CSS table to export.");
    }
  }
}

//Function to download CSV content
function downloadCSV(csvContent, fileName) {
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", fileName);
  document.body.appendChild(link); //Required for Firefox
  link.click();
  document.body.removeChild(link); //Clean up
}

//Utility function to toggle the loading state
function toggleLoadingState(loadingSpinner, button, isLoading) {
  if (loadingSpinner) {
    loadingSpinner.style.display = isLoading ? 'block' : 'none';
  }
  if (button) {
    button.disabled = isLoading;
    button.textContent = isLoading ? 'Optimizing...' : 'Optimize';
  }
}

//Function to call the Cloud Function for optimizing the locator
async function optimizeLocator(locator, type) {
  const loadingSpinner = document.getElementById('loading-spinner');
  const button = document.getElementById(`optimize-locator-${type}`);

  //Show loading state
  toggleLoadingState(loadingSpinner, button, true);

  try {
    //Log the locator and type before making the request
    console.log(`Optimizing ${type.toUpperCase()} Locator:`, locator);

    //Make the request
    const response = await fetch(
      "https://us-central1-artful-logic-438218-g4.cloudfunctions.net/optimize-locators",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locator, type }),
      }
    );

    //Handle the response
    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data?.optimizedLocator) {
      throw new Error("Invalid response format");
    }

    console.log(`Optimized ${type.toUpperCase()} Locator:`, data.optimizedLocator);
    return data.optimizedLocator;

  } catch (error) {
    console.error(`Error optimizing ${type.toUpperCase()} locator:`, error);
    alert("An error occurred while optimizing. Please try again later.");
    return null;
  } finally {
    //Hide loading state
    toggleLoadingState(loadingSpinner, button, false);
  }
}

//Function to handle the click and call optimization
function handleOptimizeClick(type) {
  const locatorInput = type === "xpath"
    ? document.getElementById("check-locator-xpath")
    : document.getElementById("check-locator-css");

  if (!locatorInput) {
    console.error(`Could not find the ${type} input field`);
    return;
  }

  const locator = locatorInput.value;

  if (!locator) {
    console.warn(`Please provide a valid ${type} locator before optimizing.`);
    alert(`Please enter a valid ${type.toUpperCase()} locator to optimize.`);
    return;
  }

  console.log(`Calling optimizeLocator for ${type.toUpperCase()} with locator:`, locator);
  optimizeLocator(locator, type)
    .then((optimizedLocator) => {
      if (optimizedLocator) {
        const validationInput = type === "xpath"
          ? document.getElementById("check-locator-xpath")
          : document.getElementById("check-locator-css");

        if (validationInput) {
          validationInput.value = optimizedLocator;
          alert(`Locator has been optimized successfully: ${validationInput.value}`);
        }
      }
    })
    .catch((error) => {
      console.error(`Error occurred while optimizing ${type.toUpperCase()} locator:`, error);
      alert("An error occurred while optimizing. Please try again later.");
    });
}

//Listen for messages from the content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'displayLocator' && message.xpath && message.cssSelector) {
      console.log("Received XPath and CSS from content script:", message);

      //Use a simple flag to prevent double execution
      if (sender.tab && sender.tab.id && !sender.tab.processed) {
          sender.tab.processed = true; 

          //Delegate responsibility to displayLocatorInSidebar
          displayLocatorInSidebar(message.xpath, message.cssSelector);

          sendResponse({ status: "XPath and CSS displayed in sidebar (and added to tables if in batch mode)" });

          //Reset flag after a short delay to allow future messages if necessary
          setTimeout(() => {
              sender.tab.processed = false;
          }, 500);
      }
  } else {
      console.warn("Invalid message received or missing locators:", message);
      sendResponse({ status: "Invalid message or missing locators" });
  }
});

//Triggers the Start/Stop Detection in the content.js
document.getElementById('toggle-detection').addEventListener('click', () => {
  const button = document.getElementById('toggle-detection');
  const action = button.textContent.includes('Start') ? 'startDetection' : 'stopDetection';

  chrome.runtime.sendMessage({ action }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error sending message:", chrome.runtime.lastError);
    } else {
      console.log("Detection toggled:", response);
      button.textContent = action === 'startDetection' ? 'Stop Detection' : 'Start Detection';
      button.classList.toggle('stop', action === 'stopDetection');
    }
  });
});

//Triggers upon clicking copy buttons
document.querySelectorAll('.copy-btn').forEach((button, index) => {
  button.addEventListener('click', () => {
    let input;

    if (index === 0) {
      input = document.getElementById('xpath-selector');
    } else if (index === 1) {
      input = document.getElementById('css-selector');
    } else if (index === 2) {
      input = document.getElementById('check-locator-xpath');
    } else if (index === 3) {
      input = document.getElementById('check-locator-css');
    }

    if (input && input.value) {
      copyToClipboard(input.value);
      alert('Copied to clipboard!');
    } else {
      alert('No value to copy!');
    }
  });
});

//Event listener for radio buttons to toggle between modes
document.querySelectorAll('input[name="detection-mode"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    clearLocators();
    document.getElementById('xpath-selector').value = "XPath:";
    document.getElementById('css-selector').value = "CSS:";
  });
});

//Event listener for exporting locators
document.getElementById('export-locators').addEventListener('click', () => {
  exportLocators();
});

//Event listener to the Clear Table button
document.getElementById('clear-table').addEventListener('click', clearLocators);

document.addEventListener("DOMContentLoaded", () => {
  //Generic function to add an event listener for optimizing locators
  const addOptimizeEventListener = (locatorType) => {
    const button = document.getElementById(`optimize-locator-${locatorType}`);
    const input = document.getElementById(`check-locator-${locatorType}`);
    
    if (button && input) {
      button.addEventListener("click", async () => {
        if (!input.value) {
          alert(`Please enter a valid ${locatorType.toUpperCase()} locator to optimize.`);
          return;
        }

        console.log(`Optimize button clicked for ${locatorType.toUpperCase()}`);
        const optimizedLocator = await optimizeLocator(input.value, locatorType);
        if (optimizedLocator) {
          input.value = optimizedLocator;
        }
      });
    }
  };

  //Add event listeners for XPath and CSS buttons
  addOptimizeEventListener("xpath");
  addOptimizeEventListener("css");
});

document.addEventListener("DOMContentLoaded", () => {
  //Event listener for the XPath Optimize button
  const xpathButton = document.getElementById("optimize-locator-xpath");
  if (xpathButton) {
    xpathButton.addEventListener("click", () => {
      console.log("Optimize button clicked for XPath");
      handleOptimizeClick("xpath");
    });
  }

  //Event listener for the CSS Optimize button
  const cssButton = document.getElementById("optimize-locator-css");
  if (cssButton) {
    cssButton.addEventListener("click", () => {
      console.log("Optimize button clicked for CSS");
      handleOptimizeClick("css");
    });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const xpathTab = document.getElementById("xpath-tab");
  const cssTab = document.getElementById("css-tab");
  const xpathTable = document.getElementById("xpath-table");
  const cssTable = document.getElementById("css-table");

  //Tab click event listeners
  xpathTab.addEventListener("click", () => {
    switchTab("xpath");
  });

  cssTab.addEventListener("click", () => {
    switchTab("css");
  });

  //Function to switch tabs
  function switchTab(tab) {
    if (tab === "xpath") {
      xpathTab.classList.add("active");
      cssTab.classList.remove("active");
      xpathTable.classList.remove("hidden");
      cssTable.classList.add("hidden");
    } else if (tab === "css") {
      cssTab.classList.add("active");
      xpathTab.classList.remove("active");
      cssTable.classList.remove("hidden");
      xpathTable.classList.add("hidden");
    }
  }
});
