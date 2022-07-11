/*********************************************************** 
  Roam Bionic text
   	inspired by Bionic Reading (TM) : https://https://bionic-reading.com/
    
    Version: 0.53, Juny 4, 2022
    By: Fabrice Gallet (Twitter: @fbgallet)
        Support my work on:
            https://www.buymeacoffee.com/fbgallet
************************************************************/
var fixation, saccade, buttonInTopBar;

const version = "v0.6";
var fixNum, sacNum;
var isOn = false;
var lastTextarea, lastElt = null;
var isNewView = true;

const panelConfig = {
  tabTitle: "Bionic Text",
  settings: [
      {id:     "fixation-setting",
      name:   "Fixation",
      description: "Set fixation (percetage of word in bold, from 0 to 100):",
      action: {type:        "input",
              placeholder: "50",
              onChange:    (evt) => { 
                fixation = evt.target.value;
                console.log("Fixation changed to", fixation); }}},
      {id:     "saccade-setting",
       name:   "Saccade",
       description: "Set saccade (applies every n words, from 1 to 5):",
       action: {type:     "select",
                items:    ["1", "2", "3", "4", "5"],
                onChange: (evt) => { 
                  saccade = evt;
                  console.log("Select Changed!", evt); }}},
      {id:          "button-setting",
      name:        "Button",
      description: "Display Button 'B' in the top bar or not:",
      action:      {type:     "switch",
                    onChange: (evt) => { 
                      console.log(evt);
                      buttonToggle();
                    }}}
  ]
}; 

export default {
  onload: ({extensionAPI}) => {
    extensionAPI.settings.panel.create(panelConfig);
    if (extensionAPI.settings.get("fixation-setting") == null)
    fixation = 50;
    else fixation = extensionAPI.settings.get("fixation-setting");
    if (extensionAPI.settings.get("saccade-setting") == null)
    saccade = 1;
    else saccade = extensionAPI.settings.get("saccade-setting");
    if (extensionAPI.settings.get("button-setting") == null) {
      extensionAPI.settings.set("button-setting", true);
      buttonInTopBar = true;
    }
    else buttonInTopBar = extensionAPI.settings.get("button-setting");

    document.addEventListener('keydown', keyboardToggle);
    if (buttonInTopBar) buttonToggle();
    window.roamAlphaAPI.ui
          .commandPalette
          .addCommand({label: 'Toggle Bionic Text extension', 
               callback: BionicMode});
    console.log("Bionic text extension loaded.");
  },
  onunload: () => {
    document.removeEventListener('keydown', keyboardToggle);
    window.removeEventListener('popstate',autoToggleWhenBrowsing);
    if (buttonInTopBar) buttonToggle();
    removeBionicNodes();
    window.roamAlphaAPI.ui
          .commandPalette
          .removeCommand({label: 'Toggle Bionic Text extension'});
    console.log("Bionic text extension unloaded.");
  }
};

function keyboardToggle(e) {
  if (e.shiftKey && e.altKey && e.key.toLowerCase() == "b") BionicMode();
}

function buttonToggle() {
  var nameToUse = "bionic",
     bpIconName = "bold",
     checkForButton = document.getElementById(nameToUse + "-icon");
  if (!checkForButton) {
     var mainButton = document.createElement("span");
     (mainButton.id = nameToUse + "-button"),
     mainButton.classList.add("bp3-popover-wrapper");
     var spanTwo = document.createElement("span");
     spanTwo.classList.add("bp3-popover-target"), mainButton.appendChild(spanTwo);
     var mainIcon = document.createElement("span");
     (mainIcon.id = nameToUse + "-icon"),
     mainIcon.classList.add(
           "bp3-icon-" + bpIconName,
           "bp3-button",
           "bp3-minimal",
           "bp3-small"
        ),
        spanTwo.appendChild(mainIcon);
     var roamTopbar = document.getElementsByClassName("rm-topbar"),
        nextIconButton = roamTopbar[0].lastElementChild,
        flexDiv = document.createElement("div");
     (flexDiv.id = nameToUse + "-flex-space"),
     (flexDiv.className = "rm-topbar__spacer-sm"),
     nextIconButton.insertAdjacentElement("afterend", mainButton),
        mainButton.insertAdjacentElement("afterend", flexDiv),
        mainButton.addEventListener("click", BionicMode);
     console.log("Bionic text button added");
  }
  else {
    checkForButton.remove();
    console.log("Bionic text button removed");
  }
}

function BionicMode() {
  fixNum = parseInt(fixation);
  sacNum = parseInt(saccade);
  isOn = !isOn;
  
  let elt = document.querySelectorAll('.rm-block-text');
  
  if (isOn) {
    if (isNewView) {
      window.addEventListener('popstate',autoToggleWhenBrowsing);
      console.log("Bionic text on: "+ version);
    }
    else console.log("Bionic text refreshing current view.");
    elt.forEach( el => {
      processHtmlElement(el);
      if (isNewView) el.addEventListener('focusin', onFocusIn);
    });
    if (lastElt!=null) {
      document.getElementById(lastElt.id)
        .addEventListener('focusin', onFocusIn);
    }
  }
  else {
    console.log("Bionic text off.");
    window.removeEventListener('popstate',autoToggleWhenBrowsing);
    elt.forEach(item => {
      item.removeEventListener('focusin', onFocusIn);
    });
    removeBionicNodes();
    isNewView=true;
    lastElt=null;
  }
}
  
function processHtmlElement(el) {
  //console.log(el);
  if (el.innerHTML.includes('<bionic>')==false) {
    let nodes = el.firstChild.childNodes;
    if (nodes.length!=0) {
      for(let j=0;j<nodes.length;j++) {
        insertBionicNode(nodes[j]);
      }
    }
  }
}

function onFocusIn(ev) {
  lastElt = ev.target;
  isNewView=false;
//   console.log("from In:");
//   console.log(lastElt);
  let tArea = document.getElementsByClassName("rm-block__input--active");
  setTimeout(function () {
    if (tArea.length!=0) {
        lastTextarea = tArea[0];
        lastTextarea.addEventListener('focusout', onFocusOut);
    }
    lastElt.removeEventListener('focusin', onFocusIn);
  },100);
}
function onFocusOut(ev) {
  setTimeout(function () {
      lastTextarea.removeEventListener('focusout', onFocusOut);
   //   console.log("from Out:");
   //   console.log(lastElt);
      isOn = false;
      BionicMode();
  }, 200);
}

function insertBionicNode(node) {
  if (node.nodeType == 3) {   // nodeType 3 is Text
    let bionicChild = processTextNode(node.nodeValue);
    node.parentNode.replaceChild(bionicChild, node);
  }
  else {
    let className = node.className;
    switch (className) {
      case 'rm-bold':
      case 'rm-highlight':
      case 'rm-italics':
      case 'rm-page-ref rm-page-ref--tag':  // tag
        node = node.childNodes[0];
        break;
      case "bp3-popover-wrapper": // block ref or alias
        node = node.childNodes[0]
                    .childNodes[0]
                     .childNodes[0];
        if (node.nodeType != 3) {  // block ref
          node = node.childNodes;
          for(let i=0;i<node.length;i++) {
            insertBionicNode(node[i]);
          }
          return;
        }
        break;
      default:
        if (node.childNodes) {
          className = node.childNodes[0].className;
          switch (className) {
            case "bp3-popover-wrapper":      // alias
              node = node.childNodes[0];
              break;
            case "rm-page-ref rm-page-ref--link":  // page ref
              node = node.childNodes[0].childNodes[0];
              break;
            default:
              if (node.parentElement.className == 'rm-bq')
                node = node.childNodes[0];        // quote
              else return;
          }
        }
        else return;
    }
    insertBionicNode(node);
  }
}

function processTextNode(text, node) {
  let splitText = text.split(' ');
  let e = document.createElement('bionic');
  let spaceShift=0;
  for(let i=0;i<splitText.length;i++) {
    let t;
    if((i==0 )|| ((i+spaceShift)%sacNum)==0) {
      let word = splitText[i];
      if (word!='') {
        let midIndex = getmiddleIndex(word);
        let b = document.createElement("b");
        let boldPart = word.slice(0,midIndex);
        b.textContent = boldPart;
        e.appendChild(b);
        let notBoldPart = word.slice(midIndex)+' ';
        if (i==splitText.length-1) notBoldPart = notBoldPart.slice(0,-1);
        t = document.createTextNode(notBoldPart);
      }
      else {
        word += ' ';
        if (i==splitText.length-1) word = word.slice(0,-1);
        t = document.createTextNode(word);
        spaceShift++;
      }
      e.appendChild(t);
    }
    else {
      t = splitText[i]+' ';
      if (i==splitText.length-1) t = t.slice(0,-1);
      e.appendChild(document.createTextNode(t));
    }
  }
  return e;
}

function getmiddleIndex(word) {
  let midIndex=0;
  let len=word.length;
  if (!(/\p{Extended_Pictographic}/u.test(word))) {
    if (len>3) midIndex = Math.ceil(len * fixNum / 100);
    else {
       midIndex = Math.floor(len * fixNum / 100);
       if (midIndex<1) midIndex=1;
    }
  }
  return midIndex;
}

function autoToggleWhenBrowsing() {
  if (isOn) {
    setTimeout(function() {
      BionicMode();
      isNewView=true;
      BionicMode();
    }, 100);
  }
}

function removeBionicNodes(e = document) {
    let bionicElt = e.querySelectorAll("bionic");
    //console.log('remove:');
    //console.log(bionicElt);
    for (let i=0;i<bionicElt.length;i++) {
      let originalTxt = bionicElt[i].innerText;
      let eTxt = document.createTextNode(originalTxt);
      bionicElt[i].replaceWith(eTxt);
    }
  }
