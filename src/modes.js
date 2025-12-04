import {
  ROAM_APP_ELT,
  autoToggleWhenBrowsing,
  bionicMode,
  fixation,
  isNewView,
  letterSpacing,
  lineHeight,
  readOnlyMode,
  saccade,
  selectOnClickMode,
} from ".";

export function applyModesToSelection(elt) {
  if (isNewView) {
    window.addEventListener("popstate", autoToggleWhenBrowsing);
    //console.log("Bionic text on: " + version);
  }
  if (elt) {
    if (readOnlyMode.isOn) readOnlyInKanban();

    // Optimize: check mode states once before loop
    const shouldApplyBionic = bionicMode.isOn;
    const shouldApplyReadOnly = readOnlyMode.isOn;
    const shouldApplySelectOnClick = selectOnClickMode.isOn;

    // Single loop with combined mode checks for better performance
    for (let i = 0; i < elt.length; i++) {
      const element = elt[i];
      //console.log(element);
      if (shouldApplyBionic) processHtmlElement(element);
      if (shouldApplyReadOnly) readOnly(element);
      if (shouldApplySelectOnClick) prepareBlockToSelectOnClick(element);
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
// Readonly mode
////////////////////////////////////////////////////////////////////////////////

export function readOnly(elt) {
  if (elt) {
    elt.style.pointerEvents = "none";
    elt.contentEditable = "false";
    let eltToExclude = elt.querySelectorAll(
      ".rm-page-ref, .rm-block-ref, .check-container, a, button, iframe, .rm-inline-img__resize, .react-resizable"
    );
    eltToExclude.forEach((e) => (e.style.pointerEvents = "all"));
    let codeBlocks = elt.querySelectorAll(".cm-content");
    codeBlocks.forEach((e) => (e.contentEditable = "false"));
  }
}

export function readOnlyInKanban() {
  let kanban = document.querySelectorAll(".kanban-board");
  if (kanban) kanban.forEach((e) => (e.style.pointerEvents = "none"));
}

export function readOnlyPageTitle() {
  let pageTitle = document.querySelector(".rm-title-display");
  if (pageTitle) pageTitle.style.pointerEvents = "none";
}

export function removeReadOnly() {
  let elt = document.querySelectorAll(".rm-block-text");
  if (!selectOnClickMode.isOn)
    elt.forEach((item) => {
      item.style.pointerEvents = "all";
      item.contentEditable = "true";
      let codeBlocks = item.querySelectorAll(".cm-content");
      if (codeBlocks) codeBlocks.forEach((e) => (e.contentEditable = "true"));
    });
  ROAM_APP_ELT.classList.remove(
    `read-ls-${letterSpacing.toString().replace(".", "")}`
  );
  ROAM_APP_ELT.classList.remove(
    `read-lh-${lineHeight.toString().replace(".", "")}`
  );
  ROAM_APP_ELT.removeAttribute("data-font-family");
  let pageTitle = document.querySelector(".rm-title-display");
  if (pageTitle) pageTitle.style.pointerEvents = "all";
  let kanban = document.querySelectorAll(".kanban-board");
  if (kanban) kanban.forEach((e) => (e.style.pointerEvents = "all"));
}

////////////////////////////////////////////////////////////////////////////////
// Select on click mode
////////////////////////////////////////////////////////////////////////////////

function prepareBlockToSelectOnClick(e) {
  e.style.pointerEvents = "none";
  e.parentElement.addEventListener("mousedown", highlightBlockOnClick);
}

export function highlightBlockOnClick(e) {
  let rmBlockMain = e.target.closest(".rm-block-main");
  let rmBlockText = e.target.querySelector(".rm-block-text");
  if (
    ![...rmBlockMain.classList]?.includes("block-highlight-blue") ||
    [...rmBlockMain.classList]?.includes("cm-content")
    // &&  e.target.classList.contains("rm-block-text")
  ) {
    //console.log("click => blue");
    cleanBlue();
    rmBlockMain.classList.add("block-highlight-blue");
    if (!readOnlyMode.isOn && rmBlockText)
      rmBlockText.style.pointerEvents = "all";
    //    e.preventDefault();
  } else {
    // console.log("click when blue");
    rmBlockMain.classList.remove("block-highlight-blue");
  }
}

export function cleanBlue(off = false) {
  let blues = document.querySelectorAll(".block-highlight-blue");
  blues.forEach((block) => {
    block.classList.remove("block-highlight-blue");
    if (!off) applyModesToSelection([block.querySelector(".rm-block-text")]);
  });
}

export function addListenerOnZoom() {
  let zoom = document.querySelector(".zoom-path-view");
  if (zoom && zoom.childNodes.length > 1) {
    zoom.addEventListener("click", onZoomClick);
  }
}

function onZoomClick() {
  setTimeout(() => {
    const escapeEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      keyCode: 27,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escapeEvent);
    document.dispatchEvent(escapeEvent);
  }, 10);
}

export function onClickToCleanBlue(e) {
  if (e.target === document.querySelector(".rm-article-wrapper")) cleanBlue();
}

/********************************************************************************************** 
  Bionic text feature is inspired by Bionic Reading (TM) : https://https://bionic-reading.com/
***********************************************************************************************/

export function processHtmlElement(el) {
  if (el.innerHTML.includes("<bionic>") === false) {
    let nodes = el.firstChild.childNodes;
    //console.log(nodes);
    if (nodes.length !== 0) {
      for (let j = 0; j < nodes.length; j++) {
        insertBionicNode(nodes[j]);
      }
    }
  }
}

export function insertBionicNode(node) {
  //console.log(node);
  if (node.nodeType === 3) {
    // nodeType 3 is Text
    let bionicChild = processTextNode(node.nodeValue);
    node.parentNode.replaceChild(bionicChild, node);
  } else {
    let className = node.className;
    switch (className) {
      case "rm-bold":
      case "rm-highlight":
      case "rm-italics":
      case "rm-page-ref rm-page-ref--tag": // tag
        node = node.childNodes[0];
        break;
      case "bp3-popover-wrapper": // block ref or alias
        node = node.childNodes[0].childNodes[0].childNodes[0];
        if (node.nodeType !== 3) {
          // block ref
          node = node.childNodes;
          for (let i = 0; i < node.length; i++) {
            insertBionicNode(node[i]);
          }
          return;
        }
        break;
      case "rm-block-ref dont-focus-block ": // block ref 2nd level
        node = node.childNodes[0].childNodes[0];
        break;
      default:
        if (node.childNodes) {
          className = node.childNodes[0].className;
          switch (className) {
            case "bp3-popover-wrapper": // alias
              node = node.childNodes[0];
              break;
            case "rm-page-ref rm-page-ref--link": // page ref
              node = node.childNodes[0].childNodes[0];
              break;
            case "rm-page-ref__brackets": // page ref inside brackets
              node = node.childNodes[1].childNodes[0];
              break;
            default:
              if (node.parentElement.className === "rm-bq")
                node = node.childNodes[0]; // quote
              else return;
          }
        } else return;
    }
    insertBionicNode(node);
  }
}

function sanitizeText(text) {
  // Sanitize input to prevent XSS - ensure we're only working with safe text content
  if (typeof text !== "string") return "";
  // Remove any potential HTML/script content by validating it's plain text
  return text.replace(/[<>]/g, "");
}

function processTextNode(text) {
  // Sanitize input text to prevent XSS vulnerabilities
  const sanitizedText = sanitizeText(text);
  if (!sanitizedText) return document.createTextNode("");

  let splitText = sanitizedText.split(" ");
  let e = document.createElement("bionic");
  let spaceShift = 0;

  for (let i = 0; i < splitText.length; i++) {
    let t;
    if (i === 0 || (i + spaceShift) % saccade === 0) {
      let word = splitText[i];
      if (word !== "") {
        let midIndex = getmiddleIndex(word);
        let b = document.createElement("b");
        let boldPart = word.slice(0, midIndex);
        b.textContent = boldPart;
        e.appendChild(b);
        let notBoldPart = word.slice(midIndex) + " ";
        if (i === splitText.length - 1) notBoldPart = notBoldPart.slice(0, -1);
        t = document.createTextNode(notBoldPart);
      } else {
        word += " ";
        if (i === splitText.length - 1) word = word.slice(0, -1);
        t = document.createTextNode(word);
        spaceShift++;
      }
      e.appendChild(t);
    } else {
      t = splitText[i] + " ";
      if (i === splitText.length - 1) t = t.slice(0, -1);
      e.appendChild(document.createTextNode(t));
    }
  }
  return e;
}

function getmiddleIndex(word) {
  let midIndex = 0;
  let len = word.length;
  if (!/\p{Extended_Pictographic}/u.test(word)) {
    if (len > 3) midIndex = Math.ceil((len * fixation) / 100);
    else {
      midIndex = Math.floor((len * fixation) / 100);
      if (midIndex < 1) midIndex = 1;
    }
  }
  return midIndex;
}

export function removeBionicNodes(e = document) {
  let bionicElt = e.querySelectorAll("bionic");
  for (let i = 0; i < bionicElt.length; i++) {
    let originalTxt = bionicElt[i].innerText;
    let eTxt = document.createTextNode(originalTxt);
    bionicElt[i].replaceWith(eTxt);
  }
}

////////////////////////////////////////////////////////////////////////////////
// Navigation mode - Re-exported from navigation.js
////////////////////////////////////////////////////////////////////////////////

export {
  initializeNavigation,
  updateNavigation,
  updateChevronsElts,
  updateChevronDisplaySettings,
  removeChevronsListener,
  removeChevrons,
  navigateToBlock,
  BlockContext,
  clearBlockContextCache,
} from "./navigation";
