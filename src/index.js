/********************************************************************************************** 
  Bionic text feature is inspired by Bionic Reading (TM) : https://https://bionic-reading.com/
***********************************************************************************************/

import React from "react";
// import ReactDOM from "react-dom";
import { Intent, Position, Toaster, TagInput, Slider } from "@blueprintjs/core";

import {
  addListenerOnZoom,
  applyModesToSelection,
  cleanBlue,
  highlightBlockOnClick,
  initializeNavigation,
  insertBionicNode,
  navigateToBlock,
  onClickToCleanBlue,
  readOnlyPageTitle,
  removeBionicNodes,
  removeChevrons,
  removeChevronsListener,
  removeReadOnly,
  updateNavigation,
} from "./modes";
import {
  connectObservers,
  disconnectAllObservers,
  onKeydown,
} from "./observers";

var buttonInTopBar, unfocusedOpacity;

export var fixation, saccade;
export var letterSpacing,
  lineHeight = 0;
export var isOn = false;
export var isNewView = true;

export const ROAM_APP_ELT = document.querySelector(".roam-app");
const IS_ON_SMARTPHONE =
  window.roamAlphaAPI.platform.isTouchDevice ||
  window.roamAlphaAPI.platform.isMobileApp ||
  window.matchMedia("(max-width:1024px)").matches;

const AppToaster = Toaster.create({
  className: "color-toaster",
  position: Position.TOP,
  maxToasts: 1,
});

const toggleWaySet = new Set([
  "With command palette only",
  "With topbar button",
  "Always",
]);
class Mode {
  constructor() {
    this.onLoad = false;
    this.onButton = false;
    this.onSmartphone = false;
    this.isOn = false;
  }
  setToggleWay(way) {
    let toggleWayArray = Array.from(toggleWaySet);
    switch (way) {
      case toggleWayArray[1]:
        this.onButton = true;
        break;
      case toggleWayArray[2]:
        this.onLoad = true;
        break;
      default:
        this.onButton = false;
        this.onLoad = false;
    }
  }
  initialize() {
    if (this.onLoad || (IS_ON_SMARTPHONE && this.onSmartphone))
      this.isOn = true;
  }
  set(status) {
    if (status == "on") this.isOn = true;
    if (status == "off") this.isOn = false;
  }
}

export var bionicMode = new Mode(),
  readOnlyMode = new Mode(),
  selectOnClickMode = new Mode(),
  focusMode = new Mode(),
  navMode = new Mode();
var modesArray = [
  bionicMode,
  readOnlyMode,
  selectOnClickMode,
  focusMode,
  navMode,
];

function setSmartphoneSettings(modesOn) {
  switch (modesOn) {
    case "Read only":
      readOnlyMode.onSmartphone = true;
      break;
    case "Navigation controls":
      navMode.onSmartphone = true;
      break;
    case "Read only + Navigation controls":
      readOnlyMode.onSmartphone = true;
      navMode.onSmartphone = true;
  }
}

export default {
  onload: ({ extensionAPI }) => {
    // if (!extensionAPI.settings.get("Slider"))
    //   extensionAPI.settings.set("Slider", 20);
    // if (!extensionAPI.settings.get("taginput"))
    //   extensionAPI.settings.set("taginput", ["test"]);

    const wrappedLetterSpacingSlider = () =>
      letterSpacingSlider({ extensionAPI });
    const wrappedLineHeightSlider = () => lineHeightSlider({ extensionAPI });
    const wrappedFixationSlider = () => fixationSlider({ extensionAPI });
    const wrappedSaccadeSlider = () => saccadeSlider({ extensionAPI });
    // const wrappedBlueprintTagInput = () => blueprintTagInput({ extensionAPI });

    const panelConfig = {
      tabTitle: "Reading mode",
      settings: [
        {
          id: "readonly-setting",
          name: "Read Only",
          description: "Enable Read Only mode (blocks not directly editable):",
          action: {
            type: "select",
            items: [...toggleWaySet],
            onChange: (evt) => {
              readOnlyMode.setToggleWay(evt);
            },
          },
        },
        {
          id: "letterSpacing-setting",
          name: "Letter spacing",
          description: "Set letter spacing in Read Only mode (+x rem):",
          action: {
            type: "reactComponent",
            component: wrappedLetterSpacingSlider,
          },
        },
        {
          id: "lineHeight-setting",
          name: "Line height",
          description:
            "Line height (more space between lines) in Read Only mode:",
          action: {
            type: "reactComponent",
            component: wrappedLineHeightSlider,
          },
        },
        {
          id: "textForTest1-setting",
          name: "Example of text to which parameters are applied",
          description:
            "Lorem ipsum dolor sit amet consectetur adipisicing elit. Rem enim veritatis commodi vel similique consequatur animi adipisci deleniti soluta unde?",
        },
        {
          id: "navigation-setting",
          name: "Navigation controls",
          description:
            "Display Nagiation controls to browse from one block to another:",
          action: {
            type: "select",
            items: [...toggleWaySet],
            onChange: (evt) => {
              navMode.setToggleWay(evt);
            },
          },
        },
        {
          id: "select-setting",
          name: "Select on click",
          description: "Select a block on click instead of editing it:",
          action: {
            type: "select",
            items: [...toggleWaySet],
            onChange: (evt) => {
              selectOnClickMode.setToggleWay(evt);
            },
          },
        },
        {
          id: "focus-setting",
          name: "Focus mode",
          description:
            "Focus on the hovered block, and reduce visibility of other blocks and interface components:",
          action: {
            type: "select",
            items: [...toggleWaySet],
            onChange: (evt) => {
              focusMode.setToggleWay(evt);
            },
          },
        },
        {
          id: "focusOpacity-setting",
          name: "Unfocused opacity",
          description:
            "Opacity of unfocused elements (0: invisible, 0.5: semi-opacity)",
          action: {
            type: "select",
            items: ["0", "0.03", "0.05", "0.1", "0.2", "0.3", "0.5"],
            onChange: (evt) => {
              let oldOpacity = unfocusedOpacity;
              unfocusedOpacity = evt.replace(".", "");
              if (focusMode.isOn) {
                ROAM_APP_ELT.classList.remove(`rf-${oldOpacity}`);
                ROAM_APP_ELT.classList.add(`rf-${unfocusedOpacity}`);
              }
            },
          },
        },
        {
          id: "bionic-setting",
          name: "Bionic reading Mode",
          description: "Bionic reading mode (emphasize first part of words):",
          action: {
            type: "select",
            items: [...toggleWaySet],
            onChange: (evt) => {
              bionicMode.setToggleWay(evt);
            },
          },
        },
        {
          id: "fixation-setting",
          name: "Fixation",
          description:
            "Set fixation (percetage of word in bold, from 0 to 100):",
          action: { type: "reactComponent", component: wrappedFixationSlider },
        },
        {
          id: "saccade-setting",
          name: "Saccade",
          description: "Set saccade (applies every n words, from 1 to 5):",
          action: { type: "reactComponent", component: wrappedSaccadeSlider },
        },
        {
          id: "textForTest2-setting",
          name: "Example of text to which parameters are applied",
          description:
            "Lorem ipsum dolor sit amet consectetur adipisicing elit. Rem enim veritatis commodi vel similique consequatur animi adipisci deleniti soluta unde?",
        },
        {
          id: "button-setting",
          name: "Button",
          description: "Display 🔓 button in the top bar or not:",
          action: {
            type: "switch",
            onChange: (evt) => {
              buttonToggle();
            },
          },
        },
        // {
        //   id: "taginput",
        //   name: "React tag input",
        //   description: "some description",
        //   action: {
        //     type: "reactComponent",
        //     component: wrappedBlueprintTagInput,
        //   },
        // },
        {
          id: "smartphone-setting",
          name: "On Smartphone",
          description: "Always enable:",
          action: {
            type: "select",
            items: [
              "Default",
              "Read only",
              "Navigation controls",
              "Read only + Navigation controls",
            ],
            onChange: (evt) => {
              setSmartphoneSettings(evt);
            },
          },
        },
      ],
      onOpen: () => {
        applyToTestText();
      },
    };

    extensionAPI.settings.panel.create(panelConfig);

    if (extensionAPI.settings.get("smartphone-setting") == null) {
      extensionAPI.settings.set("smartphone-setting", "Default");
    } else
      setSmartphoneSettings(extensionAPI.settings.get("smartphone-setting"));

    if (!toggleWaySet.has(extensionAPI.settings.get("readonly-setting"))) {
      extensionAPI.settings.set("readonly-setting", "With topbar button");
      readOnlyMode.setToggleWay("With topbar button");
    } else
      readOnlyMode.setToggleWay(extensionAPI.settings.get("readonly-setting"));
    readOnlyMode.initialize();
    if (extensionAPI.settings.get("letterSpacing-setting") == null) {
      letterSpacing = 0;
      extensionAPI.settings.set("letterSpacing-setting", letterSpacing);
    } else
      letterSpacing = reduceToFixedValue(
        extensionAPI.settings.get("letterSpacing-setting"),
        0,
        2
      );
    if (extensionAPI.settings.get("lineHeight-setting") == null) {
      lineHeight = 1.5;
      extensionAPI.settings.set("lineHeight-setting", lineHeight);
    } else
      lineHeight = reduceToFixedValue(
        extensionAPI.settings.get("lineHeight-setting"),
        1.5,
        1
      );

    if (extensionAPI.settings.get("navigation-setting") == null) {
      extensionAPI.settings.set("navigation-setting", "With topbar button");
      navMode.setToggleWay("With topbar button");
    } else
      navMode.setToggleWay(extensionAPI.settings.get("navigation-setting"));
    navMode.initialize();

    if (extensionAPI.settings.get("select-setting") == null) {
      extensionAPI.settings.set("select-setting", "With command palette only");
      selectOnClickMode.setToggleWay("With command palette only");
    } else
      selectOnClickMode.setToggleWay(
        extensionAPI.settings.get("select-setting")
      );
    selectOnClickMode.initialize();

    if (extensionAPI.settings.get("focus-setting") == null) {
      extensionAPI.settings.set("focus-setting", "With command palette only");
      focusMode.setToggleWay("With command palette only");
    } else focusMode.setToggleWay(extensionAPI.settings.get("focus-setting"));
    focusMode.initialize();
    if (extensionAPI.settings.get("focusOpacity-setting") == null) {
      extensionAPI.settings.set("focusOpacity-setting", "0.1");
      unfocusedOpacity = "01";
    } else
      unfocusedOpacity = extensionAPI.settings
        .get("focusOpacity-setting")
        .replace(".", "");

    if (extensionAPI.settings.get("bionic-setting") == null) {
      extensionAPI.settings.set("button-setting", "With command palette only");
      bionicMode.setToggleWay("With command palette only");
    } else bionicMode.setToggleWay(extensionAPI.settings.get("bionic-setting"));
    bionicMode.initialize();
    if (extensionAPI.settings.get("fixation-setting") == null) {
      fixation = 50;
      extensionAPI.settings.set("fixation-setting", fixation);
    } else fixation = extensionAPI.settings.get("fixation-setting");
    if (extensionAPI.settings.get("saccade-setting") == null) {
      saccade = 1;
      extensionAPI.settings.set("saccade-setting", saccade);
    } else saccade = extensionAPI.settings.get("saccade-setting");
    if (extensionAPI.settings.get("button-setting") == null) {
      extensionAPI.settings.set("button-setting", true);
      buttonInTopBar = true;
    } else buttonInTopBar = extensionAPI.settings.get("button-setting");

    extensionAPI.ui.commandPalette.addCommand({
      label: "Reading Modes: Toggle Read only mode",
      callback: () => {
        isOn = !isOn;
        toggleButtonIcon();
        readOnlyMode.isOn = !readOnlyMode.isOn;
        updateAfterSettingsChange("Read only mode", readOnlyMode.isOn);
      },
    });
    extensionAPI.ui.commandPalette.addCommand({
      label: "Reading Modes: Toggle Navigation controls display",
      callback: () => {
        navMode.isOn = !navMode.isOn;
        updateAfterSettingsChange("Navigation controls display", navMode.isOn);
      },
    });
    extensionAPI.ui.commandPalette.addCommand({
      label: "Reading Modes: Toggle Click-to-Select mode",
      callback: () => {
        selectOnClickMode.isOn = !selectOnClickMode.isOn;
        updateAfterSettingsChange(
          "Select on click mode",
          selectOnClickMode.isOn
        );
      },
    });
    extensionAPI.ui.commandPalette.addCommand({
      label: "Reading Modes: Toggle Focus mode",
      callback: () => {
        focusMode.isOn = !focusMode.isOn;
        updateAfterSettingsChange("Focus mode", focusMode.isOn);
      },
    });
    extensionAPI.ui.commandPalette.addCommand({
      label: "Reading Modes: Toggle Bionic mode",
      callback: () => {
        bionicMode.isOn = !bionicMode.isOn;
        updateAfterSettingsChange("Bionic mode", bionicMode.isOn);
      },
    });
    extensionAPI.ui.commandPalette.addCommand({
      label: "Reading Modes: Toggle modes triggered by the button",
      callback: () => {
        isOn = !isOn;
        onClickOnTopbarButton();
      },
    });
    extensionAPI.ui.commandPalette.addCommand({
      label: "Reading Modes: Disable all modes",
      callback: () => {
        modesArray.forEach((mode) => mode.set("off"));
        isOn = false;
        toggleButtonIcon();
        onToggleOf();
      },
    });

    extensionAPI.ui.commandPalette.addCommand({
      label: "Reading Modes: Navigate to parent block",
      callback: async () => {
        navigateToBlock("left");
      },
      "default-hotkey": "ctrl-alt-left",
    });
    extensionAPI.ui.commandPalette.addCommand({
      label: "Reading Modes: Navigate to first child block",
      callback: async () => {
        navigateToBlock("right");
      },
      "default-hotkey": "ctrl-alt-right",
    });
    extensionAPI.ui.commandPalette.addCommand({
      label: "Reading Modes: Navigate to previous sibling block",
      callback: async () => {
        navigateToBlock("top");
      },
      "default-hotkey": "ctrl-alt-up",
    });
    extensionAPI.ui.commandPalette.addCommand({
      label: "Reading Modes: Navigate to next sibling block",
      callback: async () => {
        navigateToBlock("bottom");
      },
      "default-hotkey": "ctrl-alt-down",
    });

    if (buttonInTopBar) buttonToggle();
    if (readOnlyMode.isOn) {
      isOn = true;
      toggleButtonIcon();
    }
    window.addEventListener("popstate", autoToggleWhenBrowsing);
    applyEnabledModes();
    console.log("Reading mode extension loaded.");
  },
  onunload: () => {
    modesArray.forEach((mode) => (mode.isOn = false));
    onToggleOf(true);
    // disconnectAllObservers();
    if (buttonInTopBar) buttonToggle();
    console.log("Reading mode extension unloaded.");
  },
};

function fixationSlider({ extensionAPI }) {
  const [sliderValue, setSliderValue] = React.useState(
    extensionAPI.settings.get("fixation-setting")
  );
  return React.createElement(Slider, {
    className: "reading-mode-slider",
    min: 0,
    max: 100,
    stepSize: 5,
    labelStepSize: 25,
    value: sliderValue,
    onChange: (value) => {
      setSliderValue(value);
      extensionAPI.settings.set("fixation-setting", value);
      fixation = value;
      applyToTestText();
    },
  });
}

function saccadeSlider({ extensionAPI }) {
  const [sliderValue, setSliderValue] = React.useState(
    extensionAPI.settings.get("saccade-setting")
  );
  return React.createElement(Slider, {
    className: "reading-mode-slider",
    min: 0,
    max: 5,
    stepSize: 1,
    labelStepSize: 1,
    value: sliderValue,
    onChange: (value) => {
      setSliderValue(value);
      extensionAPI.settings.set("saccade-setting", value);
      saccade = value;
      applyToTestText();
    },
  });
}

function letterSpacingSlider({ extensionAPI }) {
  const [sliderValue, setSliderValue] = React.useState(
    extensionAPI.settings.get("letterSpacing-setting")
  );
  return React.createElement(Slider, {
    className: "reading-mode-slider",
    min: 0,
    max: 0.1,
    stepSize: 0.02,
    labelStepSize: 0.1,
    value: sliderValue,
    onChange: (value) => {
      setSliderValue(value);
      let oldLetterSpacing = letterSpacing;
      extensionAPI.settings.set("letterSpacing-setting", value);
      letterSpacing = reduceToFixedValue(value, 0, 2);
      // value < 0.04 ? 0 : value.toFixed(2);
      if (isOn) {
        if (letterSpacing != 0)
          ROAM_APP_ELT.classList.remove(
            `read-ls-${oldLetterSpacing.toString().replace(".", "")}`
          );
        if (letterSpacing != 0)
          ROAM_APP_ELT.classList.add(
            `read-ls-${letterSpacing.toString().replace(".", "")}`
          );
      }
      applyToTestText();
    },
  });
}

function lineHeightSlider({ extensionAPI }) {
  const [sliderValue, setSliderValue] = React.useState(
    extensionAPI.settings.get("lineHeight-setting")
  );
  return React.createElement(Slider, {
    className: "reading-mode-slider",
    min: 1.5,
    max: 2,
    stepSize: 0.1,
    labelStepSize: 0.5,
    value: sliderValue,
    onChange: (value) => {
      setSliderValue(value);
      let oldLineHeight = lineHeight;
      extensionAPI.settings.set("lineHeight-setting", value);
      lineHeight = reduceToFixedValue(value, 1.5, 1);
      // value < 1.59 ? 1.5 : value.toFixed(1);
      if (isOn) {
        if (oldLineHeight != 1.5)
          ROAM_APP_ELT.classList.remove(
            `read-lh-${oldLineHeight.toString().replace(".", "")}`
          );
        if (lineHeight != 1.5)
          ROAM_APP_ELT.classList.add(
            `read-lh-${lineHeight.toString().replace(".", "")}`
          );
      }
      applyToTestText();
    },
  });
}

function reduceToFixedValue(value, min, fixedTo) {
  return value < min + 0.01 ? min : value.toFixed(fixedTo);
}

function applyToTestText() {
  let elt = document.querySelectorAll(".rm-settings-panel h4");
  let testTextElt = [];
  for (var i = 0; i < elt.length; i++) {
    if (
      elt[i].innerText === "Example of text to which parameters are applied"
    ) {
      testTextElt.push(elt[i]);
      if (testTextElt.length == 2) break;
    }
  }
  if (testTextElt.length != 0) {
    testTextElt.forEach((text, index) => {
      text.nextElementSibling.style.letterSpacing = `${letterSpacing}rem`;
      text.nextElementSibling.style.wordSpacing = `${letterSpacing}rem`;
      text.nextElementSibling.style.lineHeight = `${lineHeight}rem`;
      if (index == 1) removeBionicNodes(text.nextElementSibling);
      if (index == 1) insertBionicNode(text.nextElementSibling.childNodes[0]);
    });
  }
}

// function blueprintTagInput({ extensionAPI }) {
//   const [tagInputValues, setTagInpuValues] = React.useState(
//     extensionAPI.settings.get("taginput")
//   );
//   return React.createElement(TagInput, {
//     className: "tag-input",
//     fill: true,
//     leftIcon: "lock",
//     placeholder: "Enter page/tag name separated by commas...",
//     // tagProps: { minimal: true },
//     values: tagInputValues,
//     onChange: (values) => {
//       setTagInpuValues(values);
//       console.log(values);
//     },
//   });
// }

function buttonToggle() {
  var nameToUse = "reading-mode",
    bpIconName = "unlock",
    checkForButton = document.getElementById(nameToUse + "-icon");
  if (!checkForButton) {
    var mainButton = document.createElement("span");
    (mainButton.id = nameToUse + "-button"),
      mainButton.classList.add("bp3-popover-wrapper");
    var spanTwo = document.createElement("span");
    spanTwo.classList.add("bp3-popover-target"),
      mainButton.appendChild(spanTwo);
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
      mainButton.addEventListener("click", onClickOnTopbarButton);
    console.log("Reading mode button added");
  } else {
    document.getElementById(nameToUse + "-flex-space").remove();
    document.getElementById(nameToUse + "-button").remove();
    checkForButton.remove();
    console.log("Reading mode button removed");
  }
}

function onClickOnTopbarButton() {
  isOn = !isOn;
  toggleButtonIcon();
  if (isOn) {
    if (readOnlyMode.onButton) readOnlyMode.isOn = true;
    if (bionicMode.onButton) bionicMode.isOn = true;
    if (selectOnClickMode.onButton) selectOnClickMode.isOn = true;
    if (focusMode.onButton) focusMode.isOn = true;
    if (navMode.onButton) navMode.isOn = true;
    applyEnabledModes();
  } else {
    if (readOnlyMode.onButton || readOnlyMode.isOn) readOnlyMode.isOn = false;
    if (bionicMode.onButton || (bionicMode.onLoad && bionicMode.isOn))
      bionicMode.isOn = false;
    if (
      selectOnClickMode.onButton ||
      (selectOnClickMode.onLoad && selectOnClickMode.isOn)
    )
      selectOnClickMode.isOn = false;
    if (focusMode.onButton || (focusMode.onLoad && focusMode.isOn))
      focusMode.isOn = false;
    if (navMode.onButton || (navMode.onLoad && navMode.isOn))
      navMode.isOn = false;
    onToggleOf();
  }
}

function toggleButtonIcon() {
  if (isOn) {
    let icon = document.querySelector("#reading-mode-icon");
    icon.classList.remove("bp3-icon-unlock");
    icon.classList.add("bp3-icon-lock");
    icon.classList.add("bp3-intent-primary");
  } else {
    let icon = document.querySelector("#reading-mode-icon");
    icon.classList.remove("bp3-icon-lock");
    icon.classList.add("bp3-icon-unlock");
    icon.classList.remove("bp3-intent-primary");
  }
}

function updateAfterSettingsChange(mode, status) {
  toasterOnModeToggle(mode, status);
  onToggleOf();
  applyEnabledModes();
}

function toasterOnModeToggle(mode, status, timeout = 3000) {
  AppToaster.show({
    message: `${mode} is now ${status ? "ON" : "OFF"}`,
    intent: status ? Intent.PRIMARY : Intent.WARNING,
    timeout: timeout,
  });
}

async function applyEnabledModes(refresh = false) {
  if (readOnlyMode.isOn || selectOnClickMode.isOn || bionicMode.isOn) {
    if (readOnlyMode.isOn) {
      readOnlyPageTitle();
    }
    if (readOnlyMode.isOn && !refresh) {
      ROAM_APP_ELT.classList.add(
        `read-ls-${letterSpacing.toString().replace(".", "")}`
      );
      ROAM_APP_ELT.classList.add(
        `read-lh-${lineHeight.toString().replace(".", "")}`
      );
    }
    let elt = document.querySelectorAll(".rm-block-text");
    if (!refresh) {
      console.log("Connect observers");
      connectObservers();
    }
    applyModesToSelection(elt);
    if (selectOnClickMode.isOn && !refresh) {
      document.addEventListener("keydown", onKeydown);
      document
        .querySelector(".rm-article-wrapper")
        .addEventListener("click", onClickToCleanBlue);
    }
    if (selectOnClickMode.isOn || readOnlyMode.isOn) addListenerOnZoom();
  }
  if (focusMode.isOn && !refresh) {
    ROAM_APP_ELT.classList.add("read-focus");
    ROAM_APP_ELT.classList.add(`rf-${unfocusedOpacity}`);
  }
  if (navMode.isOn) {
    refresh ? await updateNavigation() : await initializeNavigation();
  }
}

export function autoToggleWhenBrowsing() {
  if (isOn) {
    setTimeout(async () => {
      isNewView = true;
      // let elt = document.querySelectorAll(".rm-block-text");
      // applyModesToSelection(elt);
      await applyEnabledModes(true);
    }, 100);
    isNewView = false;
  }
}

export function onToggleOf() {
  let elt = document.querySelectorAll(".rm-block-text");
  if (!readOnlyMode.isOn && !bionicMode.isOn) {
    disconnectAllObservers();
  }
  if (!readOnlyMode.isOn) {
    removeReadOnly();
  }
  if (!bionicMode.isOn) {
    removeBionicNodes();
  }
  if (!selectOnClickMode.isOn) {
    document.removeEventListener("keydown", onKeydown);
    document
      .querySelector(".rm-article-wrapper")
      .removeEventListener("click", onClickToCleanBlue);
    cleanBlue(true);
    elt.forEach((item) => {
      item.parentElement.removeEventListener(
        "mousedown",
        highlightBlockOnClick
        //{ once: true }
      );
    });
  }
  if (!focusMode.isOn) {
    ROAM_APP_ELT.classList.remove("read-focus");
    ROAM_APP_ELT.classList.remove(`rf-${unfocusedOpacity}`);
  }
  if (!navMode.isOn) {
    removeChevronsListener();
    removeChevrons();
  }
  window.removeEventListener("popstate", autoToggleWhenBrowsing);
}
