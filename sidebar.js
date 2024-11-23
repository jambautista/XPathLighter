//Display XPath in the DevTool Sidebar
function displayXpathInSidebar(xpath, cssSelector) {
  const batchMode = document.querySelector('input[name="detection-mode"]:checked').value === 'batch';

  console.log("Displaying in sidebar - XPath:", xpath, "CSS Selector:", cssSelector, "Batch mode:", batchMode);

  //Check what is the selected mode for getting XPath
  if (batchMode) {
    addXpathToList(xpath, cssSelector);
  } else {
    
    const xpathInput = document.getElementById('xpath-selector');
    const cssInput = document.getElementById('css-selector');
    const validateXpath = document.getElementById('check-locator-xpath');
    const validateCSS = document.getElementById('check-locator-css')

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

//Function to make XPath list
function addXpathToList(xpath) {
  const outputElement = document.querySelector('.generatedLocators');

  //Validate if the XPath already exists in the table
  const existingRows = Array.from(outputElement.querySelectorAll('tr'));
  for (const row of existingRows) {
    const valueCell = row.querySelector('td:nth-child(2)');
    if (valueCell && valueCell.textContent === xpath) {
      
      //If the XPath already exists and do not add it again
      console.warn("XPath already exists in the list:", xpath);
      return;
    }
  }

  //Create a new row for the detected XPath
  const row = document.createElement('tr');
  row.className = 'detectedLocators';
  const labelCell = document.createElement('td');
  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.value = generateLabelFromXPath(xpath); //Auto-generate label based on the XPath
  labelInput.className = 'label-input';  
  labelCell.appendChild(labelInput);
  const valueCell = document.createElement('td');
  valueCell.textContent = xpath;

  const actionCell = document.createElement('td');

  //Create a button to copy the XPath
  const copyButton = document.createElement('button');
  copyButton.className = 'copy-table-btn';
  copyButton.textContent = 'Copy';
  copyButton.addEventListener('click', () => {
    copyToClipboard(xpath); 
    alert('XPath copied to clipboard!');
  });

  
  actionCell.appendChild(copyButton);
  //Append cells to the row
  row.appendChild(labelCell);
  row.appendChild(valueCell);
  row.appendChild(actionCell);
  //Append the row to the table body
  outputElement.appendChild(row);
}


//Function to generate a label from the XPath or the element itself
function generateLabelFromXPath(xpath) {
  // Try to extract the tag name, ID, and class from the XPath
  const parser = new DOMParser();
  const elementTagMatch = xpath.match(/^\/\/(\w+)/);
  const tagName = elementTagMatch ? elementTagMatch[1] : 'Element';

  //Extract ID and class values from the XPath string
  const idMatch = xpath.match(/@id='([^']+)'/);     // Extract ID from XPath
  const classMatch = xpath.match(/@class='([^']+)'/); // Extract class from XPath

  if (idMatch) {
    //Use tagName + ID
    return `${tagName}_${idMatch[1]}`;
  } else if (classMatch) {
    //Use tagName + first class
    const firstClass = classMatch[1].split(' ')[0]; //Use the first class if there are multiple
    return `${tagName}_${firstClass}`;
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

//Listen for messages from the content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'displayXpath' && message.xpath && message.cssSelector) {
    console.log("Received XPath and CSS from content script:", message);
    displayXpathInSidebar(message.xpath, message.cssSelector); // Update the sidebar with the received data
    sendResponse({ status: "XPath and CSS displayed in sidebar" });
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

//Function to clear the locators list when switching modes
function clearLocators() {
  const outputElement = document.querySelector('.generatedLocators');
  outputElement.innerHTML = ''; //Clear the existing list
}

//Event listener for exporting locators
document.getElementById('export-locators').addEventListener('click', () => {
  exportLocators();
});

//Function to export locators as CSV
function exportLocators() {
  const rows = document.querySelectorAll('.generatedLocators tr');

  //Check if there are any rows to export
  if (rows.length === 0) {
    alert("No elements to download.");
    return; //Exit the function if no rows are found
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Selector Label,Selector Value\n"; //Add headers

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    const labelInput = cells[0].querySelector('input');
    //Get value from the labelInput field, if not, put blank
    const label = labelInput ? labelInput.value : ''; 

    //Capture the selector value
    const value = cells[1].textContent;

    csvContent += `${label},${value}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "locators.csv");
  document.body.appendChild(link); //Required for Firefox
  link.click();
  document.body.removeChild(link); //Clean up
}

//Function to clear the table content
function clearTable() {
  const tableBody = document.getElementById('locatorTableBody');
  tableBody.innerHTML = ''; //Clear all rows from the table
}

//Add an event listener to the Clear Table button
document.getElementById('clear-table').addEventListener('click', clearTable);

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

//Function to display the optimized locator in the appropriate field
function displayOptimizedLocator(optimizedLocator, type) {
  const aiLocatorInput = type === "xpath" 
    ? document.getElementById("check-locator-xpath")
    : document.getElementById("check-locator-css");

  if (aiLocatorInput) {
    aiLocatorInput.value = optimizedLocator;
  } else {
    console.error(`AI Validated ${type.toUpperCase()} Locator input field not found.`);
  }
}


//Function to handle optimization for both XPath and CSS
function handleOptimizeClick(type) {
  const xpathLocator = document.getElementById("xpath-selector").value;
  const cssLocator = document.getElementById("css-selector").value;

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

//Add event listeners for the XPath and CSS Optimize buttons
document.getElementById("validate-locator-xpath").addEventListener("click", () => {
    handleOptimizeClick("xpath");
});

document.getElementById("validate-locator-css").addEventListener("click", () => {
    handleOptimizeClick("css");
});
