//Display XPath or CSS in the DevTool Sidebar
function displayLocatorInSidebar(xpath, cssSelector) {
  const batchMode = document.querySelector('input[name="detection-mode"]:checked').value === 'batch';

  console.log("Displaying in sidebar - XPath:", xpath, "CSS Selector:", cssSelector, "Batch mode:", batchMode);

  const validateXpath = document.getElementById('check-locator-xpath');
  const validateCSS = document.getElementById('check-locator-css');

  if (batchMode) {
    //Add XPath and CSS locators to their respective tables
    addLocatorToTable(xpath, 'xpath');
    addLocatorToTable(cssSelector, 'css');

    //Update validation fields in batch mode to allow optimization during batch mode
    if (validateXpath) {
      validateXpath.value = xpath;
    } else {
      console.error("Validation XPath field not found.");
    }

    if (validateCSS) {
      validateCSS.value = cssSelector;
    } else {
      console.error("Validation CSS field not found.");
    }

  } else {
    // Single Element Detection Mode - Update input fields
    const xpathInput = document.getElementById('xpath-selector');
    const cssInput = document.getElementById('css-selector');

    if (xpathInput) {
      xpathInput.value = xpath;
      validateXpath.value = xpath;
    } else {
      console.error("XPath input field not found.");
    }

    if (cssInput) {
      cssInput.value = cssSelector;
      validateCSS.value = cssSelector;
    } else {
      console.error("CSS selector input field not found.");
    }
  }
}


//Function to add a locator to the appropriate table
function addLocatorToTable(locator, type) {
  //Determine the appropriate table based on the type
  const tableBodyId = type === 'xpath' ? 'xpathTableBody' : 'cssTableBody';
  const tableBody = document.getElementById(tableBodyId);

  if (!tableBody) {
    console.error(`Table body not found for type: ${type}`);
    return;
  }

  //Validate the locator format for XPath or CSS
  const isXPath = locator.startsWith('//');
  const isCSS = !locator.startsWith('//');

  if ((type === 'xpath' && !isXPath) || (type === 'css' && !isCSS)) {
    console.warn(`Skipping invalid locator for ${type.toUpperCase()} table:`, locator);
    return;
  }

  // Check if the locator already exists in the table
  const existingRows = Array.from(tableBody.querySelectorAll('tr'));
  for (const row of existingRows) {
    const valueCell = row.querySelector('td:nth-child(2)');
    if (valueCell && valueCell.textContent === locator) {
      console.warn(`${type.toUpperCase()} locator already exists in the table:`, locator);
      return;
    }
  }

  //Create a new row for the detected locator
  const row = document.createElement('tr');
  row.className = 'detectedLocators';

  //Generate a label for the locator
  const label = type === 'xpath' ? generateLabelFromXPath(locator) : generateLabelFromCSS(locator);

  //Label cell with auto-generated label
  const labelCell = document.createElement('td');
  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.value = label; // Auto-generate label
  labelInput.className = 'label-input';
  labelCell.appendChild(labelInput);

  //Value cell
  const valueCell = document.createElement('td');
  valueCell.textContent = locator;

  //Action cell with Copy button
  const actionCell = document.createElement('td');
  const copyButton = document.createElement('button');
  copyButton.className = 'copy-table-btn';
  copyButton.textContent = 'Copy';
  copyButton.addEventListener('click', () => {
    copyToClipboard(locator);
    alert(`${type.toUpperCase()} locator copied to clipboard!`);
  });
  actionCell.appendChild(copyButton);

  //Append cells to the row
  row.appendChild(labelCell);
  row.appendChild(valueCell);
  row.appendChild(actionCell);

  //Append the row to the correct table body
  tableBody.appendChild(row);
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
  const tagMatch = cssSelector.match(/^(\w+)/); // Extract tag name
  const tagName = tagMatch ? tagMatch[1] : 'Element';

  const idMatch = cssSelector.match(/#([^.\s]+)/); //Match ID in CSS (#id)
  const classMatch = cssSelector.match(/\.(\w+)/); //Match first class in CSS (.class)

  if (idMatch) {
    // Use tagName + ID
    return `${tagName}_${idMatch[1]}`;
  } else if (classMatch) {
    // Use tagName + first class
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

//Function to export locators as CSV for both XPath and CSS tables
function exportLocators() {
  const xpathTableBody = document.getElementById('xpathTableBody');
  const cssTableBody = document.getElementById('cssTableBody');

  if (!xpathTableBody && !cssTableBody) {
    alert("No tables found to export.");
    return;
  }

  //Function to generate CSV content from a table body
  function generateCSVContent(tableBody) {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Selector Label,Selector Value\n"; //Add headers

    const rows = tableBody.querySelectorAll('tr');

    if (rows.length === 0) {
      return null; //No rows to export
    }

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

  //Export XPath table
  if (xpathTableBody) {
    const xpathCSVContent = generateCSVContent(xpathTableBody);
    if (xpathCSVContent) {
      const xpathEncodedUri = encodeURI(xpathCSVContent);
      const xpathLink = document.createElement("a");
      xpathLink.setAttribute("href", xpathEncodedUri);
      xpathLink.setAttribute("download", "xpath_locators.csv");
      document.body.appendChild(xpathLink); //Required for Firefox
      xpathLink.click();
      document.body.removeChild(xpathLink); //Clean up
    } else {
      console.log("No rows in XPath table to export.");
    }
  }

  //Export CSS table
  if (cssTableBody) {
    const cssCSVContent = generateCSVContent(cssTableBody);
    if (cssCSVContent) {
      const cssEncodedUri = encodeURI(cssCSVContent);
      const cssLink = document.createElement("a");
      cssLink.setAttribute("href", cssEncodedUri);
      cssLink.setAttribute("download", "css_locators.csv");
      document.body.appendChild(cssLink);
      cssLink.click();
      document.body.removeChild(cssLink); 
    } else {
      console.log("No rows in CSS table to export.");
    }
  }
}

//Function to call the Cloud Function for optimizing the locator
async function optimizeLocator(locator, type) {
  try {
    const response = await fetch(
      "https://us-central1-artful-logic-438218-g4.cloudfunctions.net/optimize-locators",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locator }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`Optimized ${type.toUpperCase()} Locator:`, data.optimizedLocator);
      return data.optimizedLocator;
    } else {
      console.error("Request failed:", response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.error(`Error optimizing ${type.toUpperCase()} locator:`, error);
    return null;
  }
}

//Function to handle optimization for both XPath and CSS
function handleOptimizeClick(type) {
  const xpathLocator = document.getElementById("check-locator-xpath").value;
  const cssLocator = document.getElementById("check-locator-css").value;

  let currentLocator;

  if (type === "xpath" && xpathLocator && xpathLocator !== "XPath:") {
    currentLocator = xpathLocator;
  } else if (type === "css" && cssLocator && cssLocator !== "CSS:") {
    currentLocator = cssLocator;
  } else {
    alert(`Please enter a valid ${type.toUpperCase()} selector to optimize.`);
    return;
  }

  //Call the Cloud Function to optimize the locator
  optimizeLocator(currentLocator, type).then((optimizedLocator) => {
    if (optimizedLocator) {
      //Update the respective validated locator field
      const validatedLocatorField =
        type === "xpath"
          ? document.getElementById("check-locator-xpath")
          : document.getElementById("check-locator-css");

      if (validatedLocatorField) {
        validatedLocatorField.value = optimizedLocator; //Update the validated locator field
        alert("Locator has been optimized sucessfully \n" + optimizedLocator);//Display in the AI Validated Locator field
      } else {
        console.error(
          `Validated locator field for ${type.toUpperCase()} not found.`
        );
      }
    } else {
      alert(`Failed to optimize ${type.toUpperCase()} locator.`);
    }
  });
}

//Listen for messages from the content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'displayLocator' && message.xpath && message.cssSelector) {
    console.log("Received XPath and CSS from content script:", message);

    //Delegate responsibility to displayLocatorInSidebar
    displayLocatorInSidebar(message.xpath, message.cssSelector);

    sendResponse({ status: "XPath and CSS displayed in sidebar (and added to tables if in batch mode)" });
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

//Event listeners for the XPath and CSS Optimize buttons
document.getElementById("validate-locator-xpath").addEventListener("click", () => {
    handleOptimizeClick("xpath");
});
document.getElementById("validate-locator-css").addEventListener("click", () => {
    handleOptimizeClick("css");
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

  // Function to switch tabs
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
