import React from "react";
import ReactDOM from "react-dom";
import { Intent, Position, Toaster, TagInput, Slider } from "@blueprintjs/core";

import {
  addListenerOnZoom,
  applyModesToSelection,
  cleanBlue,
  getBlockContext,
  highlightBlockOnClick,
  initializeNavigation,
  navigateToBlock,
  onClickToCleanBlue,
  removeBionicNodes,
  removeChevrons,
  removeChevronsListener,
  updateNavigation,
} from "./modes";
import {
  connectObservers,
  disconnectAllObservers,
  onKeydown,
  runners,
} from "./observers";

/*********************************************************** 
  Bionic text is inspired by Bionic Reading (TM) : https://https://bionic-reading.com/
************************************************************/
var fixation, saccade, buttonInTopBar;

export var fixNum, sacNum;
export var isOn = false;
export var isNewView = true;

const IsOnSmartphone = window.matchMedia("(max-width:1024px)").matches;

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
    if (this.onLoad || (IsOnSmartphone && this.onSmartphone)) this.isOn = true;
  }
}

export var bionicMode = new Mode(),
  readOnlyMode = new Mode(),
  selectOnClickMode = new Mode(),
  focusMode = new Mode(),
  navMode = new Mode();

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
    if (!extensionAPI.settings.get("Slider"))
      extensionAPI.settings.set("Slider", 20);
    if (!extensionAPI.settings.get("taginput"))
      extensionAPI.settings.set("taginput", ["test"]);

    const wrappedBlueprintSlider = () => blueprintSlider({ extensionAPI });
    const wrappedBlueprintTagInput = () => blueprintTagInput({ extensionAPI });

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
          action: {
            type: "input",
            placeholder: "50",
            onChange: (evt) => {
              fixation = evt.target.value;
              fixNum = parseInt(fixation);
            },
          },
        },
        {
          id: "saccade-setting",
          name: "Saccade",
          description: "Set saccade (applies every n words, from 1 to 5):",
          action: {
            type: "select",
            items: ["1", "2", "3", "4", "5"],
            onChange: (evt) => {
              saccade = evt;
              sacNum = parseInt(saccade);
            },
          },
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
        {
          id: "Slider",
          name: "React Slider",
          description:
            "Set fixation (percetage of word in bold, from 0 to 100)",
          action: { type: "reactComponent", component: wrappedBlueprintSlider },
        },
        {
          id: "taginput",
          name: "React tag input",
          description: "some description",
          action: {
            type: "reactComponent",
            component: wrappedBlueprintTagInput,
          },
        },
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

    if (extensionAPI.settings.get("bionic-setting") == null) {
      extensionAPI.settings.set("button-setting", "With command palette only");
      bionicMode.setToggleWay("With command palette only");
    } else bionicMode.setToggleWay(extensionAPI.settings.get("bionic-setting"));
    bionicMode.initialize();
    if (extensionAPI.settings.get("fixation-setting") == null) fixation = 50;
    else fixation = extensionAPI.settings.get("fixation-setting");
    fixNum = parseInt(fixation);
    if (extensionAPI.settings.get("saccade-setting") == null) saccade = 1;
    else saccade = extensionAPI.settings.get("saccade-setting");
    sacNum = parseInt(saccade);
    if (extensionAPI.settings.get("button-setting") == null) {
      extensionAPI.settings.set("button-setting", true);
      buttonInTopBar = true;
    } else buttonInTopBar = extensionAPI.settings.get("button-setting");

    extensionAPI.ui.commandPalette.addCommand({
      label: "Reading Modes: Toggle Read only mode",
      callback: () => {
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
      label: "Reading Modes: Toggle Select on click mode",
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
    onToggleOf(true);
    disconnectAllObservers();
    if (buttonInTopBar) buttonToggle();
    window.roamAlphaAPI.ui.commandPalette.removeCommand({
      label: "Toggle Reading mode",
    });
    console.log("Reading mode extension unloaded.");
  },
};

function blueprintSlider({ extensionAPI }) {
  const [sliderValue, setSliderValue] = React.useState(
    extensionAPI.settings.get("Slider")
  );
  return React.createElement(Slider, {
    className: "slider",
    min: 0,
    max: 100,
    stepSize: 5,
    labelStepSize: 50,
    value: sliderValue,
    onChange: (value) => {
      setSliderValue(value);
      extensionAPI.settings.set("fixation-setting", value);
      onToggleOf();
      isOn = false;
      enableReadingMode();
    },
  });
}

function blueprintTagInput({ extensionAPI }) {
  const [tagInputValues, setTagInpuValues] = React.useState(
    extensionAPI.settings.get("taginput")
  );
  return React.createElement(TagInput, {
    className: "tag-input",
    fill: true,
    leftIcon: "lock",
    placeholder: "Enter page/tag name separated by commas...",
    // tagProps: { minimal: true },
    values: tagInputValues,
    onChange: (values) => {
      setTagInpuValues(values);
      console.log(values);
    },
  });
}

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
    if (readOnlyMode.onButton) readOnlyMode.isOn = false;
    if (bionicMode.onButton) bionicMode.isOn = false;
    if (selectOnClickMode.onButton) selectOnClickMode.isOn = false;
    if (focusMode.onButton) focusMode.isOn = false;
    if (navMode.onButton) navMode.isOn = false;
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
    let elt = document.querySelectorAll(".rm-block-text");
    applyModesToSelection(elt);
    if (selectOnClickMode.isOn) {
      document
        .querySelector(".rm-article-wrapper")
        .addEventListener("click", onClickToCleanBlue);
    } else {
      if (runners.observers.length == 0) connectObservers();
    }
    if (selectOnClickMode.isOn || readOnlyMode.isOn) addListenerOnZoom();
  }
  if (focusMode.isOn && !refresh) {
    let roamAppElt = document.querySelector(".roam-app");
    roamAppElt.classList.add("read-focus");
  }
  if (navMode.isOn) {
    refresh ? await updateNavigation() : await initializeNavigation();
  }
}

// async function enableReadingMode() {
//   fixNum = parseInt(fixation);
//   sacNum = parseInt(saccade);
//   isOn = !isOn;

//   if (isOn) {
//     let icon = document.querySelector("#reading-mode-icon");
//     icon.classList.remove("bp3-icon-unlock");
//     icon.classList.add("bp3-icon-lock");
//     icon.classList.add("bp3-intent-primary");
//     connectObservers();
//     if (selectOnClickMode)
//       document
//         .querySelector(".rm-article-wrapper")
//         .addEventListener("click", onClickToCleanBlue);
//     if (focusMode) {
//       let roamAppElt = document.querySelector(".roam-app");
//       roamAppElt.classList.add("read-focus");
//     }
//     navMode = true;
//     document.addEventListener("keydown", onKeydown);
//     let elt = document.querySelectorAll(".rm-block-text");
//     applyModesToSelection(elt);
//     if (navMode) {
//       await initializeNavigation();
//     }
//     if (selectOnClickMode || readOnlyMode) addListenerOnZoom();
//   } else {
//     let icon = document.querySelector("#reading-mode-icon");
//     icon.classList.remove("bp3-icon-lock");
//     icon.classList.add("bp3-icon-unlock");
//     icon.classList.remove("bp3-intent-primary");
//     onToggleOf();
//   }
// }

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
    elt.forEach((item) => {
      item.style.pointerEvents = "all";
    });
  }
  if (!bionicMode.isOn) {
    removeBionicNodes();
  }
  if (selectOnClickMode.isOn) {
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
    let roamAppElt = document.querySelector(".roam-app");
    roamAppElt.classList.remove("read-focus");
  }
  if (!navMode.isOn) {
    removeChevronsListener();
    removeChevrons();
  }
  document.removeEventListener("keydown", onKeydown);
  window.removeEventListener("popstate", autoToggleWhenBrowsing);
}
