async (args) => {
  const { doHighlightElements, focusHighlightIndex, viewportExpansion } = args;
  let highlightIndex = 0;
  const ID = { current: 0 };
  const DOM_HASH_MAP = {};

  const HIGHLIGHT_CONTAINER_ID = "playwright-highlight-container";

  const highlightColors = [
    { border: 'rgba(255, 99, 71, 1)', background: 'rgba(255, 99, 71, 0.3)' },   // Tomato
    { border: 'rgba(60, 179, 113, 1)', background: 'rgba(60, 179, 113, 0.3)' },  // MediumSeaGreen
    { border: 'rgba(100, 149, 237, 1)', background: 'rgba(100, 149, 237, 0.3)' }, // CornflowerBlue (Original)
    { border: 'rgba(255, 165, 0, 1)', background: 'rgba(255, 165, 0, 0.3)' },   // Orange
    { border: 'rgba(153, 50, 204, 1)', background: 'rgba(153, 50, 204, 0.3)' },  // DarkOrchid
    { border: 'rgba(0, 191, 255, 1)', background: 'rgba(0, 191, 255, 0.3)' },    // DeepSkyBlue
    { border: 'rgba(218, 112, 214, 1)', background: 'rgba(218, 112, 214, 0.3)' }, // Orchid
    { border: 'rgba(127, 255, 0, 1)', background: 'rgba(127, 255, 0, 0.3)' }     // Chartreuse
  ];
    // Array to store data about elements that are successfully highlighted
    const successfullyHighlightedData = [];

  // Add caching mechanisms
  const DOM_CACHE = {
    boundingRects: new WeakMap(),
    computedStyles: new WeakMap(),
    clearCache: () => {
      DOM_CACHE.boundingRects = new WeakMap();
      DOM_CACHE.computedStyles = new WeakMap();
    }
  };

   // Cache helper functions - CORRECTED
   function getCachedBoundingRect(element) {
    if (!element) return null;

    if (DOM_CACHE.boundingRects.has(element)) {
      return DOM_CACHE.boundingRects.get(element);
    }

    // --- ADDED ---
    // If not in cache, calculate, store, and return it
    try {
        const rect = element.getBoundingClientRect();
        DOM_CACHE.boundingRects.set(element, rect);
        return rect;
    } catch (e) {
        // Handle cases where getBoundingClientRect might fail (rare)
        console.warn('Error getting bounding client rect:', e, element);
        return null; // Return null on error to avoid undefined issues
    }
    // --- END ADDED ---
  }

  function getCachedComputedStyle(element) {
    if (!element) return null;

    if (DOM_CACHE.computedStyles.has(element)) {
      return DOM_CACHE.computedStyles.get(element);
    }

    // --- ADDED ---
    // If not in cache, calculate, store, and return it
    try {
        const style = window.getComputedStyle(element);
        DOM_CACHE.computedStyles.set(element, style);
        return style;
    } catch (e) {
        // Handle cases where getComputedStyle might fail (rare)
        console.warn('Error getting computed style:', e, element);
        return null; // Return null on error
    }
    // --- END ADDED ---
  } 

  function isTextNodeVisible(textNode) {
    try {
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const rect = range.getBoundingClientRect();

      // Simple size check
      if (rect.width === 0 || rect.height === 0) {
        return false;
      }

      const isInViewport = !(
        rect.bottom < -viewportExpansion ||
        rect.top > window.innerHeight + viewportExpansion ||
        rect.right < -viewportExpansion ||
        rect.left > window.innerWidth + viewportExpansion
      ) || viewportExpansion === -1;

      // Check parent visibility
      const parentElement = textNode.parentElement;
      if (!parentElement) return false;

      try {
        return isInViewport && parentElement.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        });
      } catch (e) {
        // Fallback if checkVisibility is not supported
        const style = window.getComputedStyle(parentElement);
        return isInViewport &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0';
      }
    } catch (e) {
      console.warn('Error checking text node visibility:', e);
      return false;
    }
  }

  function isElementAccepted(element) {
    if (!element || !element.tagName) return false;

    // Always accept body and common container elements
    const alwaysAccept = new Set([
      "body", "div", "main", "article", "section", "nav", "header", "footer"
    ]);
    const tagName = element.tagName.toLowerCase();

    if (alwaysAccept.has(tagName)) return true;

    const leafElementDenyList = new Set([
      "svg",
      "script",
      "style",
      "link",
      "meta",
      "noscript",
      "template",
    ]);

    return !leafElementDenyList.has(tagName);
  }

  function isElementVisible(element) {
    if (!element) return false;
    const style = getCachedComputedStyle(element);
    if (!style) return false;
    return (
      element.offsetWidth > 0 &&
      element.offsetHeight > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    );
  }

    function isInteractiveElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const interactiveCursors = new Set([
      'pointer',    // Link/clickable elements
      'move',       // Movable elements
      'text',       // Text selection
      'grab',       // Grabbable elements
      'grabbing',   // Currently grabbing
      'cell',       // Table cell selection
      'copy',       // Copy operation
      'alias',     // Alias creation
      'all-scroll', // Scrollable content
      'col-resize', // Column resize
      'context-menu', // Context menu available
      'crosshair',  // Precise selection
      'e-resize',   // East resize
      'ew-resize',  // East-west resize
      'help',       // Help available
      'n-resize',   // North resize
      'ne-resize',  // Northeast resize
      'nesw-resize', // Northeast-southwest resize
      'ns-resize',  // North-south resize
      'nw-resize',  // Northwest resize
      'nwse-resize', // Northwest-southeast resize
      'row-resize', // Row resize
      's-resize',   // South resize
      'se-resize',  // Southeast resize
      'sw-resize',  // Southwest resize
      'vertical-text', // Vertical text selection
      'w-resize',   // West resize
      'zoom-in',    // Zoom in
      'zoom-out'    // Zoom out
    ]);

    // Define non-interactive cursors
    const nonInteractiveCursors = new Set([
      'not-allowed', // Action not allowed
      'no-drop',      // Drop not allowed
      'wait',         // Processing
      'progress',     // In progress
      'initial',      // Initial value
      'inherit'      // Inherited value
    ]);

    function doesElementHaveInteractivePointer(element) {
      if (element.tagName.toLowerCase() === "html") return false;
      const style = getCachedComputedStyle(element);

      if (interactiveCursors.has(style.cursor)) return true;

      return false;
    }

    let isInteractiveCursor = doesElementHaveInteractivePointer(element);

    // Genius fix for almost all interactive elements
    if (isInteractiveCursor) {
      return true;
    }

    const interactiveElements = new Set([
      "a",       // Links
      "button",    // Buttons
      "input",     // All input types (text, checkbox, radio, etc.)
      "select",    // Dropdown menus
      "textarea",  // Text areas
      "details",   // Expandable details
      "summary",   // Summary element (clickable part of details)
      "label",     // Form labels (often clickable)
      "option",    // Select options
      "optgroup",  // Option groups
      "fieldset",  // Form fieldsets (can be interactive with legend)
      "legend",    // Fieldset legends
    ]);

    // Define explicit disable attributes and properties
    const explicitDisableTags = new Set([
      'disabled',          // Standard disabled attribute
      'readonly',          // Read-only state
    ]);

    // handle inputs, select, checkbox, radio, textarea, button and make sure they are not cursor style disabled/not-allowed
    if (interactiveElements.has(element.tagName.toLowerCase())) {
      const style = getCachedComputedStyle(element);

      // Check for non-interactive cursor
      if (nonInteractiveCursors.has(style.cursor)) {
        return false;
      }

      // Check for explicit disable attributes
      for (const disableTag of explicitDisableTags) {
        if (element.hasAttribute(disableTag) ||
          element.getAttribute(disableTag) === 'true' ||
          element.getAttribute(disableTag) === '') {
          return false;
        }
      }

      // Check for disabled property on form elements
      if (element.disabled) {
        return false;
      }

      // Check for readonly property on form elements
      if (element.readOnly) {
        return false;
      }

      // Check for inert property
      if (element.inert) {
        return false;
      }

      return true;
    }

    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute("role");
    const ariaRole = element.getAttribute("aria-role");
    const tabIndex = element.getAttribute("tabindex");

    if (element.classList && (
      element.classList.contains("button") ||
      element.classList.contains('dropdown-toggle') ||
      element.getAttribute('data-index') ||
      element.getAttribute('data-toggle') === 'dropdown' ||
      element.getAttribute('aria-haspopup') === 'true'
    )) {
      return true;
    }

    const interactiveRoles = new Set([
      'button',          // Directly clickable element
      'menuitem',        // Clickable menu item
      'menuitemradio',   // Radio-style menu item (selectable)
      'menuitemcheckbox',// Checkbox-style menu item (toggleable)
      'radio',           // Radio button (selectable)
      'checkbox',        // Checkbox (toggleable)
      'tab',             // Tab (clickable to switch content)
      'switch',          // Toggle switch (clickable to change state)
      'slider',          // Slider control (draggable)
      'spinbutton',      // Number input with up/down controls
      'combobox',        // Dropdown with text input
      'searchbox',       // Search input field
      'textbox',         // Text input field
      'listbox',         // Selectable list
      'option',          // Selectable option in a list
      'scrollbar'        // Scrollable control
    ]);

    // Basic role/attribute checks
    const hasInteractiveRole =
      interactiveElements.has(tagName) ||
      interactiveRoles.has(role) ||
      interactiveRoles.has(ariaRole);

    if (hasInteractiveRole) return true;

    return false;
  }

  function isTopElement(element) {
    const rect = getCachedBoundingRect(element);

    if (viewportExpansion <= 0) {
      if (rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth) {
        return false;
      }
    } else {
      if (rect.bottom < -viewportExpansion ||
        rect.top > window.innerHeight + viewportExpansion ||
        rect.right < 0 ||
        rect.left > window.innerWidth) {
        return false;
      }
    }

    // Find the correct document context
    let doc = element.ownerDocument;

    // If we're in an iframe, elements are considered top by default
    if (doc !== window.document) {
      return true;
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    try {
      const topEl = document.elementFromPoint(centerX, centerY);
      if (!topEl) return false;

      let current = topEl;
      while (current && current !== document.documentElement) {
        if (current === element) return true;
        current = current.parentElement;
      }
      return false;
    } catch (e) {
      return true;
    }
  }

  function isInExpandedViewport(element, viewportExpansion) {
    if (viewportExpansion === -1) {
      return true;
    }
    const rect = getCachedBoundingRect(element);
    return !(
      rect.bottom < -viewportExpansion ||
      rect.top > window.innerHeight + viewportExpansion ||
      rect.right < -viewportExpansion ||
      rect.left > window.innerWidth + viewportExpansion
    );
  }

  function getEffectiveScroll(element) {
    let currentEl = element;
    let scrollX = 0;
    let scrollY = 0;

    while (currentEl && currentEl !== document.documentElement) {
      if (currentEl.scrollLeft || currentEl.scrollTop) {
        scrollX += currentEl.scrollLeft;
        scrollY += currentEl.scrollTop;
      }
      currentEl = currentEl.parentElement;
    }

    scrollX += window.scrollX;
    scrollY += window.scrollY;

    return { scrollX, scrollY };
  }

  function isInteractiveCandidate(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    const tagName = element.tagName.toLowerCase();

    // Fast-path for common interactive elements
    const interactiveElements = new Set([
      "a", "button", "input", "select", "textarea", "details", "summary"
    ]);

    if (interactiveElements.has(tagName)) return true;

    const hasQuickInteractiveAttr = element.hasAttribute("onclick") ||
      element.hasAttribute("role") ||
      element.hasAttribute("tabindex") ||
      element.hasAttribute("aria-") ||
      element.hasAttribute("data-action") ||
      element.getAttribute("contenteditable") == "true";

    return hasQuickInteractiveAttr;
  }

function getLargestVisibleRect(element, viewportExpansion) {
    if (!element) return { x: 0, y: 0, width: 0, height: 0, visible: false };

    const elementRect = getCachedBoundingRect(element);

    if (viewportExpansion <= 0) {
      if (elementRect.bottom < 0 ||
        elementRect.top > window.innerHeight ||
        elementRect.right < 0 ||
        elementRect.left > window.innerWidth) {
        return { x: 0, y: 0, width: 0, height: 0, visible: false };
      }
    } else {
      if (elementRect.bottom < -viewportExpansion ||
        elementRect.top > window.innerHeight + viewportExpansion ||
        elementRect.right < -viewportExpansion ||
        elementRect.left > window.innerWidth + viewportExpansion) {
        return { x: 0, y: 0, width: 0, height: 0, visible: false };
      }
    }

    let visibleRect = {
      x: Math.max(elementRect.left, 0),
      y: Math.max(elementRect.top, 0),
      width: Math.min(elementRect.right, window.innerWidth) - Math.max(elementRect.left, 0),
      height: Math.min(elementRect.bottom, window.innerHeight) - Math.max(elementRect.top, 0),
      visible: true,
    };

    if (viewportExpansion > 0) {
      visibleRect.x = Math.max(elementRect.left, -viewportExpansion);
      visibleRect.y = Math.max(elementRect.top, -viewportExpansion);
      visibleRect.width = Math.min(elementRect.right, window.innerWidth + viewportExpansion) - Math.max(elementRect.left, -viewportExpansion);
      visibleRect.height = Math.min(elementRect.bottom, window.innerHeight + viewportExpansion) - Math.max(elementRect.top, -viewportExpansion);
    }

    visibleRect.width = Math.max(0, visibleRect.width);
    visibleRect.height = Math.max(0, visibleRect.height);

    const style = getCachedComputedStyle(element);
    if (style && style.overflow !== 'visible') {
      const { overflowX, overflowY } = style;

      if (overflowX !== 'visible') {
        const scrollLeft = element.scrollLeft || 0;
        visibleRect.x = Math.max(visibleRect.x, elementRect.left - scrollLeft);
        visibleRect.width = Math.min(visibleRect.width, elementRect.right - scrollLeft - Math.max(0, elementRect.left - scrollLeft));
      }
      if (overflowY !== 'visible') {
        const scrollTop = element.scrollTop || 0;
        visibleRect.y = Math.max(visibleRect.y, elementRect.top - scrollTop);
        visibleRect.height = Math.min(visibleRect.height, elementRect.bottom - scrollTop - Math.max(0, elementRect.top - scrollTop));
      }
    }

    return { ...visibleRect, visible: visibleRect.width > 0 && visibleRect.height > 0 };
  }

  function getElementText(element) {
    if (!element) return "";

    let text = "";
    if (element.nodeType === Node.TEXT_NODE) {
      text = element.textContent?.trim() || "";
    } else {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while ((node = walker.nextNode())) {
        if (isTextNodeVisible(node)) { // Use the visibility check
          text += node.textContent?.trim() + " ";
        }
      }
      text = text.trim();
    }
    return text;
  }

  function getTextColor(element) {
    if (!element) return '';
    const style = getCachedComputedStyle(element);
    return style ? style.color : '';
  }

  function getBackgroundColor(element) {
    if (!element) return '';
    const style = getCachedComputedStyle(element);
    return style ? style.backgroundColor : '';
  }

  function getFontWeight(element) {
      if (!element) return '';
      const style = getCachedComputedStyle(element);
      return style ? style.fontWeight : '';
  }

function getCssSelector(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';

    const MAX_LENGTH = 120; // Maximum length for the selector string.
    const uniqueId = element.id;
    if (uniqueId) {
      return `#${CSS.escape(uniqueId)}`;
    }

    const tagName = element.tagName.toLowerCase();
    const elementClass = element.className;
    if (elementClass && typeof elementClass === 'string') {
      const classes = elementClass.split(' ')
        .filter(c => c) // Remove empty strings
        .map(c => `.${CSS.escape(c)}`)
        .join('');
      const selector = `${tagName}${classes}`;
      if (selector.length <= MAX_LENGTH && document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }

    if (element.parentElement) {
      const parentSelector = getCssSelector(element.parentElement);
      if (parentSelector) {
        const index = Array.from(element.parentElement.children).indexOf(element) + 1;
        const selector = `${parentSelector} > ${tagName}:nth-child(${index})`;
        if (selector.length <= MAX_LENGTH && document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      }
    }
    return tagName;
  }

  function generateId() {
    ID.current += 1;
    return `id-${ID.current}`;
  }

  function createHighlightElement() {
    const highlight = document.createElement("div");
    highlight.id = generateId(); // Use your existing ID generation
    highlight.classList.add("playwright-visual-highlight");
    highlight.style.position = "absolute";
    // Colors will be set in addHighlight now
    // highlight.style.backgroundColor = "rgba(100, 149, 237, 0.3)"; // Default removed
    // highlight.style.border = "2px solid cornflowerblue"; // Default removed
    highlight.style.borderRadius = "3px";
    highlight.style.pointerEvents = "none";
    highlight.style.zIndex = "1000000";
    highlight.style.boxSizing = 'border-box';
    highlight.style.overflow = 'hidden'; // Hide overflow from label if needed

    // --- ADDED FOR INDEX LABEL ---
    const label = document.createElement("span");
    label.classList.add("playwright-highlight-index-label"); // Class to find it later
    label.style.position = "absolute";
    label.style.top = "0px";
    label.style.left = "0px";
    label.style.backgroundColor = "black"; // Opaque background for label
    label.style.color = "white";
    label.style.padding = "1px 3px";
    label.style.fontSize = "10px";
    label.style.fontWeight = "bold";
    label.style.lineHeight = "1"; // Ensure consistent height
    label.style.zIndex = "1000001"; // Ensure label is above highlight bg
    label.style.pointerEvents = "none"; // Label shouldn't interfere either
    label.style.borderRadius = "0 0 3px 0"; // Optional: style the corner
    label.textContent = '?'; // Placeholder text

    highlight.appendChild(label);
    // --- END ADDED ---

    return highlight;
  }

  function ensureHighlightContainer() {
    let container = document.getElementById(HIGHLIGHT_CONTAINER_ID);
    if (!container) {
      container = document.createElement("div");
      container.id = HIGHLIGHT_CONTAINER_ID;
      container.style.position = "fixed";  // Use fixed positioning
      container.style.top = "0";
      container.style.left = "0";
      container.style.width = "100vw"; // Span the entire viewport
      container.style.height = "100vh";
      container.style.pointerEvents = "none"; // So it doesn't interfere with user interactions
      container.style.zIndex = "999999"; // High z-index, but below the highest (1000000)
      container.style.overflow = "visible"; // Important, to contain absolutely positioned highlights
      document.body.appendChild(container);
    }
    return container;
  }
  let container = ensureHighlightContainer();
  container.innerHTML = ''; // Clear previous highlights

  const highlightedElements = new Map();
  let numHighlight = 0;

 // --- Modified addHighlight function ---
 function addHighlight(element, viewportExpansion) {
  // --- Existing checks ---
  if (!element || highlightedElements.has(element)) return null;

  const largestRect = getLargestVisibleRect(element, viewportExpansion);
  // Add null check for rect which might be returned from corrected getCachedBoundingRect
  if (!largestRect || !largestRect.visible) return null;

  // --- Index and Color Calculation (Existing) ---
  const currentIndex = highlightedElements.size; // Get 0-based index before adding
  const colorIndex = currentIndex % highlightColors.length;
  const color = highlightColors[colorIndex];

  // --- Create Highlight Element (Existing) ---
  let highlight = createHighlightElement(); // Assumes this creates div + label span
  const selector = getCssSelector(element); // Calculate selector

  // --- Get Element Details (Existing or slightly modified) ---
  const elementText = getElementText(element);
  const textColor = getTextColor(element);       // Optional: Keep if needed elsewhere
  const backgroundColor = getBackgroundColor(element); // Optional: Keep if needed elsewhere
  const fontWeight = getFontWeight(element);     // Optional: Keep if needed elsewhere

  // --- Apply Positioning (Existing) ---
  highlight.style.left = `${largestRect.x}px`;
  highlight.style.top = `${largestRect.y}px`;
  highlight.style.width = `${largestRect.width}px`;
  highlight.style.height = `${largestRect.height}px`;

  // --- Apply Visual Styling (Existing) ---
  highlight.style.backgroundColor = color.background;
  highlight.style.borderColor = color.border;
  highlight.style.borderWidth = '2px';
  highlight.style.borderStyle = 'solid';

  // Set label text (Existing)
  const label = highlight.querySelector('.playwright-highlight-index-label');
  if (label) {
    label.textContent = currentIndex; // Use the 0-based index
  }

  // --- *** NEW: CAPTURE ELEMENT DATA *** ---
  const elementData = {
    index: currentIndex, // 0-based index matching the label
    tagName: element.tagName,
    text: elementText.substring(0, 150).replace(/\s+/g, ' ').trim(), // Extract text, limit length, normalize space
    selector: selector,
    attributes: { // Extract key attributes relevant for LLM understanding
      id: element.id || null,
      class: element.className && typeof element.className === 'string' ? element.className : null,
      role: element.getAttribute('role') || null,
      'aria-label': element.getAttribute('aria-label') || null,
      'aria-hidden': element.getAttribute('aria-hidden') || null,
      'placeholder': element.getAttribute('placeholder') || null,
      'name': element.getAttribute('name') || null,
      'value': element.value !== undefined ? String(element.value).substring(0, 50) : null, // Get input value if present
      'href': element.tagName === 'A' ? element.getAttribute('href') : null
    },
    // Optional: Include geometry if useful
    // rect: { x: largestRect.x, y: largestRect.y, width: largestRect.width, height: largestRect.height }
  };
  successfullyHighlightedData.push(elementData);
  // --- *** END NEW SECTION *** ---


  // --- Existing: Add to container and map ---
  container.appendChild(highlight);
  highlightedElements.set(element, highlight); // Store the highlight element itself, or just true

  return highlight; // Return the created highlight element
}

  function removeHighlight(element) {
    const highlight = highlightedElements.get(element);
    if (highlight) {
      highlight.remove();
      highlightedElements.delete(element);
      numHighlight--;
    }
  }

  function updateHighlight(element, viewportExpansion) {
    const highlight = highlightedElements.get(element);
    if (!highlight) return;

    const largestRect = getLargestVisibleRect(element, viewportExpansion);
    if (!largestRect.visible) {
      removeHighlight(element);
      return;
    }

    highlight.style.left = `${largestRect.x}px`;
    highlight.style.top = `${largestRect.y}px`;
    highlight.style.width = `${largestRect.width}px`;
    highlight.style.height = `${largestRect.height}px`;
  }

  function clearHighlights() {
    container.innerHTML = '';
    highlightedElements.clear();
    numHighlight = 0;
    DOM_CACHE.clearCache();
  }

  function getElementsInViewport(viewportExpansion) {
    const elements = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      if (isElementAccepted(node) && isInExpandedViewport(node, viewportExpansion)) {
        elements.push(node);
      }
    }
    return elements;
  }

  function getInteractiveElements(elements, viewportExpansion) {
    const interactiveElements = [];
    for (const element of elements) {
      if (isInteractiveElement(element) && isTopElement(element) && isInExpandedViewport(element, viewportExpansion)) {
        interactiveElements.push(element);
      }
    }
    return interactiveElements;
  }

  function highlightElements(elements, viewportExpansion) {
    elements.forEach(el => addHighlight(el, viewportExpansion));
  }

  function focusHighlight(index) {
    if (index >= 0 && index < highlightedElements.size) {
      const element = Array.from(highlightedElements.keys())[index];
      if (element) {
        const highlight = highlightedElements.get(element);
        if (highlight) {
          highlight.style.backgroundColor = "rgba(255, 255, 0, 0.5)"; // Yellow, with opacity
          highlight.style.border = "2px solid yellow";
          highlight.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });
        }
      }
    }
  }

  const elements = getElementsInViewport(viewportExpansion);
  const interactiveElements = getInteractiveElements(elements, viewportExpansion);

  if (doHighlightElements) {
    highlightElements(interactiveElements, viewportExpansion);
    if (focusHighlightIndex) {
      focusHighlight(focusHighlightIndex);
    }
  }
  return {
    highlightCount: highlightedElements.size, // Total number of highlights added
    elementsData: successfullyHighlightedData   // Array containing data for each highlighted element
  };
};