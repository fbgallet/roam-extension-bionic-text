import {
  autoToggleWhenBrowsing,
  bionicMode,
  fixNum,
  isNewView,
  isOn,
  navMode,
  onToggleOf,
  readOnlyMode,
  sacNum,
  selectOnClickMode,
} from ".";
import {
  getChildrenTree,
  getFirstChildUid,
  getFirstChildren,
  getFirstLevelChildren,
  getFirstLevelOfChildrenOrdered,
  getParentUID,
  getSiblingsAndOrder,
} from "./utils";

export function applyModesToSelection(elt) {
  // if (isOn) {
  if (isNewView) {
    window.addEventListener("popstate", autoToggleWhenBrowsing);
    //console.log("Bionic text on: " + version);
  }
  if (elt)
    for (let i = 0; i < elt.length; i++) {
      //console.log(elt[i]);
      if (bionicMode.isOn) processHtmlElement(elt[i]);
      if (readOnlyMode.isOn) readOnly(elt[i]);
      if (selectOnClickMode.isOn) selectOnClick(elt[i]);
    }
  // } else {
  //   onToggleOf();
  // }
}

////////////////////////////////////////////////////////////////////////////////
// Readonly mode
////////////////////////////////////////////////////////////////////////////////

export function readOnly(elt) {
  elt.style.pointerEvents = "none";
  let eltToExclude = elt.querySelectorAll(
    ".rm-page-ref, .rm-block-ref, .check-container, a, button, iframe, .rm-inline-img__resize, .react-resizable"
  );
  eltToExclude.forEach((e) => (e.style.pointerEvents = "all"));
  let eltToForce = elt.querySelectorAll(".kanban-card");
  eltToForce.forEach((e) => (e.style.pointerEvents = "none"));
}

////////////////////////////////////////////////////////////////////////////////
// Select on click mode
////////////////////////////////////////////////////////////////////////////////

export function onlySelect(elt) {
  elt.addEventListener("click", selectOnClick);
}

function selectOnClick(e) {
  //let classes = [...e?.classList];
  // if (
  //   (classes.includes("rm-block__input") &&
  //     ![...e.closest(".rm-block").classList].includes("block-highlight-blue") &&
  //     !classes.includes("rm-block__input--active")) ||
  //   [...e.parentElement.classList].includes("cm-content")
  // )
  if (
    (![...e.parentElement?.classList]?.includes("block-highlight-blue") ||
      [...e.parentElement?.classList]?.includes("cm-content")) &&
    e.classList.contains("rm-block-text")
  ) {
    e.style.pointerEvents = "none";
    e.parentElement.addEventListener("mousedown", highlightBlockOnClick, {
      once: true,
    });
  } else {
    e.parentElement?.classList?.remove("block-highlight-blue");
    setTimeout(() => {
      applyModesToSelection([e]);
    }, 100);
  }
}

export function highlightBlockOnClick(e) {
  cleanBlue();
  e.target.classList.add("block-highlight-blue");
  if (!readOnlyMode.isOn)
    e.target.querySelector(".rm-block-text").style.pointerEvents = "all";
  e.preventDefault();
}

export function cleanBlue(off = false) {
  let blues = document.querySelectorAll(".block-highlight-blue");
  blues.forEach((block) => {
    block.classList?.remove("block-highlight-blue");
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

////////////////////////////////////////////////////////////////////////////////
// Bionic mode
////////////////////////////////////////////////////////////////////////////////

function processHtmlElement(el) {
  if (el.innerHTML.includes("<bionic>") == false) {
    let nodes = el.firstChild.childNodes;
    //console.log(nodes);
    if (nodes.length != 0) {
      for (let j = 0; j < nodes.length; j++) {
        insertBionicNode(nodes[j]);
      }
    }
  }
}

function insertBionicNode(node) {
  //console.log(node);
  if (node.nodeType == 3) {
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
        if (node.nodeType != 3) {
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
              if (node.parentElement.className == "rm-bq")
                node = node.childNodes[0]; // quote
              else return;
          }
        } else return;
    }
    insertBionicNode(node);
  }
}

function processTextNode(text, node) {
  let splitText = text.split(" ");
  let e = document.createElement("bionic");
  let spaceShift = 0;
  for (let i = 0; i < splitText.length; i++) {
    let t;
    if (i == 0 || (i + spaceShift) % sacNum == 0) {
      let word = splitText[i];
      if (word != "") {
        let midIndex = getmiddleIndex(word);
        let b = document.createElement("b");
        let boldPart = word.slice(0, midIndex);
        b.textContent = boldPart;
        e.appendChild(b);
        let notBoldPart = word.slice(midIndex) + " ";
        if (i == splitText.length - 1) notBoldPart = notBoldPart.slice(0, -1);
        t = document.createTextNode(notBoldPart);
      } else {
        word += " ";
        if (i == splitText.length - 1) word = word.slice(0, -1);
        t = document.createTextNode(word);
        spaceShift++;
      }
      e.appendChild(t);
    } else {
      t = splitText[i] + " ";
      if (i == splitText.length - 1) t = t.slice(0, -1);
      e.appendChild(document.createTextNode(t));
    }
  }
  return e;
}

function getmiddleIndex(word) {
  let midIndex = 0;
  let len = word.length;
  if (!/\p{Extended_Pictographic}/u.test(word)) {
    if (len > 3) midIndex = Math.ceil((len * fixNum) / 100);
    else {
      midIndex = Math.floor((len * fixNum) / 100);
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
// Navigation mode
////////////////////////////////////////////////////////////////////////////////

var topViewBlockContext;
const chevrons = document.createElement("div");
const topChevron = document.createElement("span");
const middleDiv = document.createElement("div");
const leftChevron = document.createElement("span");
const rightChevron = document.createElement("span");
const bottomChevron = document.createElement("span");

export async function initializeNavigation() {
  chevrons.classList.add("chevrons");
  topChevron.title = "Previous sibling";
  topChevron.classList.add("chevron", "top-chevron");
  topChevron.innerText = "〈";
  middleDiv.classList.add("middle");
  leftChevron.title = "Parent";
  leftChevron.classList.add("chevron", "left-chevron");
  leftChevron.innerText = "〈";
  rightChevron.title = "First child";
  rightChevron.classList.add("chevron", "right-chevron");
  rightChevron.innerText = "〉";
  bottomChevron.title = "Next Sibling";
  bottomChevron.classList.add("chevron", "bottom-chevron");
  bottomChevron.innerText = "〉";

  chevrons.appendChild(topChevron);
  middleDiv.appendChild(leftChevron);
  middleDiv.appendChild(rightChevron);
  chevrons.appendChild(middleDiv);
  chevrons.appendChild(bottomChevron);
  document.querySelector(".roam-app").appendChild(chevrons);

  addChevronsListener();
  await updateNavigation();
}

export async function updateNavigation() {
  topViewBlockContext = null;
  topViewBlockContext = new BlockContext(
    await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid()
  );
  console.log(topViewBlockContext);
  if (navMode.isOn) updateChevronsElts();
}

export function updateChevronsElts() {
  topViewBlockContext.hasPreviousSibling
    ? topChevron.style.removeProperty("opacity")
    : (topChevron.style.opacity = "0");
  topViewBlockContext.firstChild
    ? rightChevron.style.removeProperty("opacity")
    : (rightChevron.style.opacity = "0");
  topViewBlockContext.nextBlock
    ? bottomChevron.style.removeProperty("opacity")
    : (bottomChevron.style.opacity = "0");
  let isAnimated = bottomChevron.classList.contains("bottom-chevron-anim");
  if (topViewBlockContext.hasNextSibling) {
    if (bottomChevron.classList.contains("double-chevron")) {
      bottomChevron.title = "Next Sibling";
      isAnimated
        ? setTimeout(
            () => bottomChevron.classList.remove("double-chevron"),
            1000
          )
        : bottomChevron.classList.remove("double-chevron");
    }
  } else {
    bottomChevron.title = "Next Parent sibling";
    isAnimated
      ? setTimeout(() => bottomChevron.classList.add("double-chevron"), 1000)
      : bottomChevron.classList.add("double-chevron");
  }
  !topViewBlockContext.isPage
    ? leftChevron.style.removeProperty("opacity")
    : (leftChevron.style.opacity = "0");
}

function addChevronsListener() {
  let directions = ["top", "right", "bottom", "left"];
  directions.forEach((direction) => {
    let chevron = document.querySelector(`.${direction}-chevron`);
    chevron.addEventListener("click", async () => {
      await navigateToBlock(direction);
      animChevron(chevron, direction);
    });
  });
}

export function removeChevronsListener() {
  let directions = ["top", "right", "bottom", "left"];
  directions.forEach((direction) => {
    let chevron = document.querySelector(`.${direction}-chevron`);
    if (chevron)
      chevron.removeEventListener("click", () => {
        navigateToBlock(direction);
        animChevron(chevron, direction);
      });
  });
}

function animChevron(chevron, direction) {
  chevron.classList.add(`${direction}-chevron-anim`);
  setTimeout(() => {
    chevron.classList.remove(`${direction}-chevron-anim`);
  }, 2000);
}

export function removeChevrons() {
  let chevrons = document.querySelector(".chevrons");
  if (chevrons) {
    // topChevron.style.visibility = "hidden";
    // rightChevron.style.opacity = "0";
    // bottomChevron.style.visibility = "hidden";
    // leftChevron.style.visibility = "hidden";
    chevrons.remove();
  }
}

export async function navigateToBlock(direction) {
  // let topUid = await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
  // let topUid = topViewBlockContext.uid;
  // let parent;
  if (!navMode.isOn) await updateNavigation();
  let targetUid;
  switch (direction) {
    case "top":
      targetUid = topViewBlockContext.hasPreviousSibling
        ? topViewBlockContext.getPreviousSibling()
        : topViewBlockContext.getParent();
      break;
    case "bottom":
      targetUid = topViewBlockContext.nextBlock;
      break;
    case "right":
      targetUid = topViewBlockContext.firstChild;
      break;
    case "left":
      targetUid = topViewBlockContext.getParent();
      break;
  }
  console.log(targetUid);
  if (targetUid) {
    if (navMode.isOn)
      animChevron(document.querySelector(`.${direction}-chevron`), direction);
    window.roamAlphaAPI.ui.mainWindow.openBlock({
      block: { uid: targetUid },
    });
  }
}

export class BlockContext {
  constructor(uid) {
    this.uid = uid;
    this.parent = getParentUID(uid);
    this.firstChild = getFirstChildUid(uid);
    let thisBlock = getSiblingsAndOrder(uid, this.parent);
    this.siblings = thisBlock.siblings;
    //console.log(this.siblings);
    this.isPage = !this.siblings ? true : false;
    this.order = thisBlock.order;
    this.hasNextSibling =
      !this.isPage && this.order + 1 < this.siblings.length ? true : false;
    this.nextBlock = this.isPage ? null : this.getNextSibling();
    this.hasPreviousSibling =
      !this.isPage && this.order - 1 >= 0 ? true : false;
  }
  getNextSibling() {
    if (this.hasNextSibling) return this.siblings[this.order + 1].uid;
    return this.getNextParentBlockRecursively();
  }
  getPreviousSibling() {
    if (this.hasPreviousSibling) return this.siblings[this.order - 1].uid;
    return this.parent;
  }
  getNextParentBlockRecursively() {
    let parentBlockContext = new BlockContext(this.parent);
    if (parentBlockContext.isPage) return null;
    if (parentBlockContext.hasNextSibling)
      return parentBlockContext.getNextSibling();
    else return parentBlockContext.getNextParentBlockRecursively();
  }
  getParent() {
    if (!this.isPage) return this.parent;
    return null;
  }
}
