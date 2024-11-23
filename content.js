//Checks if a browser window is open
if (!window.hasRun) {
  window.hasRun = true;  

  console.log("Content script loaded and running");  //Print a log in console to determine extension is working

  let selectedElement = null;
  let detectionActive = false;

  //Function to detect elements
  function startDetection() {
    detectionActive = true;
    document.body.style.cursor = 'crosshair';
    console.log("Detection mode activated.");

    document.addEventListener('mouseover', highlightElement); //This highlights the elements in the browser
    document.addEventListener('click', handleElementClick, true); //This is trigerred upon click

  }

  //Stop element detection
  function stopDetection() {
    detectionActive = false;
    document.body.style.cursor = 'default'; 
    console.log("Detection mode deactivated.");

    //Remove event listeners
    document.removeEventListener('mouseover', highlightElement);
    document.removeEventListener('click', handleElementClick, true);

    //Remove the previous highlight
    if (selectedElement) {
      selectedElement.style.outline = "";
      selectedElement = null;
    }
  }

  //Function to highlight elements on hover
  function highlightElement(event) {
    if (!detectionActive) {
      console.log("Detection is not active, skipping highlight.");
      return;  // Exit if detection is not active
    }

    //Remove previous highlight
    if (selectedElement) {
      selectedElement.style.outline = "";
    }

    //Highlight new element
    selectedElement = event.target;
    selectedElement.style.outline = "2px solid red"; 
    console.log("Hovered element:", selectedElement);
  }


//Function to get elements
function handleElementClick(event) {
  if (!detectionActive) {
    console.log("Detection is not active, skipping click handling.");
    return;
  }

  event.preventDefault();  //Prevent default click behavior
  event.stopPropagation();  //Stop the recurring of an event.

  const element = event.target;
  const xpath = generateXPath(element);
  const cssSelector = generateCSSSelector(element);

  console.log("Detected XPath:", xpath);
  console.log("Detected CSS Selector:", cssSelector);

  copyToClipboard(xpath); //Call Copy-to-Clipboard function

   //Display the XPath in the sidebar of the DevTool
  chrome.runtime.sendMessage({ action: 'displayXpath', xpath, cssSelector }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error sending message to sidebar:", chrome.runtime.lastError.message);
    } else {
      console.log("XPath and CSS Selector sent to sidebar successfully:", response);
    }
  });

  alert(`XPath copied: ${xpath}`); //Display an alert for the detected XPath
}


//Function to copy the XPath to clipboard
function copyToClipboard(text) {
  const tempTextArea = document.createElement("textarea");
  tempTextArea.value = text;
  document.body.appendChild(tempTextArea);
  tempTextArea.select();
  document.execCommand("copy");
  document.body.removeChild(tempTextArea);
}

  //This is a function where the user can interact with the extension.
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received in content script:", message);  // Debugging log
    if (message.action === 'startDetection') {
      startDetection();
      sendResponse({ status: "Detection started" });
    } else if (message.action === 'stopDetection') {
      stopDetection();
      sendResponse({ status: "Detection stopped" });
    } else {
      sendResponse({ status: "Unknown action" });
    }
    return true;
  });

  //Function to generate an optimized XPath for an element
  function generateXPath(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const treeNode = new TreeNode(element);
    let xpath = `//${treeNode.getXPathPart()}`;

    //Check if the generated XPath is unique for the element itself
    if (isUniqueXPath(xpath, element)) {
      return xpath;
    }

    //Utilize TreeNode to get complicated and non-unique element locators
    const parts = [];
    let currentElement = element;
    let depth = 0;

    while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE && depth < 2) {
      const node = new TreeNode(currentElement);
      parts.unshift(node.getXPathPart());
      currentElement = currentElement.parentNode;
      depth++;
    }

    return `//${parts.join('/')}`;
  }

//Function to generate a more optimized relative CSS selector for an element
function generateCSSSelector(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  //If the element has an ID, use the ID
  if (element.id) { return `#${element.id}`; }

  //Create a path by to make a DOM tree
  let path = [];
  let currentElement = element;

  while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
    let selector = currentElement.tagName.toLowerCase();
    //Use class if the class there are no other element attribute
    if (currentElement.className) {
      const classes = currentElement.className.trim().split(/\s+/);
      //Filter generic class names to get more consistent CSS Locator
      const filteredClasses = classes.filter(cls => !isGenericClass(cls));
      if (filteredClasses.length > 0) { 
        selector += `.${filteredClasses.join('.')}`; 
      }
    }
    //Validate if selector is unique within the document context
    /*Check Path is greater than 0, which means it could be a potential CSS Selector.
    If yes, join it together and store as 'selector'
    */
    const potentialSelector = path.length > 0 ? `${selector} > ${path.join(' > ')}` : selector;
    if (isUniqueSelector(potentialSelector, element)) {
      path.unshift(selector);
      break;
    }
    path.unshift(selector);  //Push the detected selector in the path array.
    currentElement = currentElement.parentElement; //Set the current element value

    //Check if ID can still be used.
    if (currentElement && currentElement.id) {
      path.unshift(`#${currentElement.id}`);
      break;
    }
  }

  const cssSelector = path.join(' > '); //'>' parent-elem -> child-elem
  console.log("Generated Optimized CSS Selector:", cssSelector);
  return cssSelector;
}

//Function to filter out generic class names for css selector
function isGenericClass(className) {
  const genericClassPatterns = [
    /^col-/, /^row$/, /^container$/, /^btn$/, /^header$/, /^footer$/, /^section$/,
    /^item$/, /^list$/, /^card$/, /^box$/, /^wrapper$/, /^content$/, /^module$/,
    /^input$/, /^field$/, /^link$/, /^text$/, /^title$/, /^image$/, /^icon$/, /^nav$/,
    /^button$/, /^form$/, /^panel$/, /^grid$/, /^label$/, /^dropdown$/, /^popup$/,
    /^tab$/, /^toolbar$/, /^sidebar$/, /^menu$/, /^alert$/
  ];
  //Some -> checks array pattern that matches the provided className. test -> checks if the className exists in the pattern.
  return genericClassPatterns.some(pattern => pattern.test(className.toLowerCase())); 
}

//Check if CSS selector is unique
function isUniqueSelector(selector, element) {
  try {
    const matches = document.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === element;
  } catch (error) {
    console.error("Error evaluating selector:", selector, error);
    return false;
  }
}


//Check if XPath is unique
function isUniqueXPath(xpath, element) {
  try {
    //Check XPaths in the document if the detected XPath is unique
    const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); 
    return result.snapshotLength === 1 && result.snapshotItem(0) === element;
  } catch (error) {
    console.error("Error evaluating XPath:", xpath, error);
    return false; 
  }
}

  //Crete a TreeNode class to represent elements in a tree hierarchy
  class TreeNode {
    constructor(element) {
      this.element = element;
      this.tag = element.tagName.toLowerCase();
      this.id = element.id || null;
      this.name = element.name || null; 
      this.classes = element.className.trim().split(/\s+/).filter(Boolean); //split classes via whitespaces 
      this.attributes = this.getFilteredAttributes(element); //Get other attribute to build an XPath
    }

    //Get other attribute to build an XPath
    getFilteredAttributes(element) {
      const attrList = {};
      if (element.hasAttributes()) {
        Array.from(element.attributes).forEach(attr => {

          //This IF statement checks possible attribute names that can be used to make an XPath
          if (
            attr.value &&
            attr.value.trim() !== '' &&
            attr.value !== '#' && 
            (attr.name.startsWith('data-') ||
              ['type', 'placeholder', 'role', 'aria-label', 'href', 'title'].includes(attr.name))
          ) {
            attrList[attr.name] = attr.value;
          }
        });
      }
      return attrList;
    }

    //Generate an XPath
    getXPathPart() {
      if (this.id) {
        //If the element has an ID, use the ID
        return `${this.tag}[@id='${this.id}']`;
      }

      if (this.name) {
        //If the element has a name, use the name
        return `${this.tag}[@name='${this.name}']`;
      }

      //Use class if the class there are no other element attribute
      if (this.classes.length === 1) {
        return `${this.tag}[@class='${this.classes[0]}']`;
      }

      //Use a combination of unique attributes to make an XPath
      if (Object.keys(this.attributes).length) { //Check how many attributes the element have
        const attrConditions = Object.entries(this.attributes)
          .map(([attr, value]) => `@${attr}='${value}'`) //Make a key-value pair
          .join(' and ');
        return `${this.tag}[${attrConditions}]`; //Return the tag with the key-pair
      }

      //Check if direct usage of class is sufficient
      if (this.classes.length > 1) {
        const classCondition = `@class='${this.element.className.trim()}'`;
        if (isUniqueXPath(`//${this.tag}[${classCondition}]`, this.element)) {
          return `${this.tag}[${classCondition}]`; //return the XPath with unique class
        }
        
        //If the XPath's class is not unique, use 'contains' to make an XPath
        const classConditions = this.classes.map(cls => `contains(@class, '${cls}')`).join(' and ');
        return `${this.tag}[${classConditions}]`;
      }

      //Last resort is to display the tag if there are no unique element locators. e.g. "//body"
      return `${this.tag}`;
    }
  }
}
