import React from "react";
import ReactDOM from "react-dom";
import { Intent, Position, Toaster } from "@blueprintjs/core";

import {
  addListenerOnZoom,
  applyModesToSelection,
  cleanBlue,
  highlightBlockOnClick,
  initializeNavigation,
  navigateToBlock,
  onClickToCleanBlue,
  readOnlyPageTitle,
  removeBionicNodes,
  removeChevrons,
  removeChevronsListener,
  removeReadOnly,
  updateNavigation,
  updateChevronDisplaySettings,
} from "./modes";
import {
  connectObservers,
  disconnectAllObservers,
  onKeydown,
} from "./observers";
import { PopoverMenu } from "./components/PopoverMenu";
import {
  FixationSlider,
  SaccadeSlider,
  LetterSpacingSlider,
  LineHeightSlider,
} from "./components/Sliders";
import {
  SampleTextForReadonly,
  SampleTextForBionic,
} from "./components/SampleText";
import { reduceToFixedValue } from "./utils/roamAPI";

// Wrapped components for settings panel
function wrappedFixationSlider(props) {
  return React.createElement(FixationSlider, props);
}
function wrappedSaccadeSlider(props) {
  return React.createElement(SaccadeSlider, props);
}
function wrappedLetterSpacingSlider(props) {
  return React.createElement(LetterSpacingSlider, props);
}
function wrappedLineHeightSlider(props) {
  return React.createElement(LineHeightSlider, props);
}
function wrappedSampleTextForReadOnly() {
  return React.createElement(SampleTextForReadonly);
}
function wrappedSampleTextForBionic() {
  return React.createElement(SampleTextForBionic);
}

let buttonInTopBar;
export let unfocusedOpacity;
export let focusHideUI = true;
export let focusHideBlocks = true;
export let selectedFontFamily = "";
export let popoverShowDelay = 300;
export let navChevronPosition = "bottom-right";
export let navChevronOpacity = 0.1;

export let fixation, saccade;
export let letterSpacing,
  lineHeight = 0;
export let isOn = false;
export let isNewView = true;

export const globalVarGetter = (varName, value) => {
  switch (varName) {
    case "fixation":
      fixation = value;
      break;
    case "saccade":
      saccade = value;
      break;
    case "letterSpacing":
      letterSpacing = value;
      break;
    case "lineHeight":
      lineHeight = value;
      break;
    case "unfocusedOpacity":
      unfocusedOpacity = value;
      break;
    case "focusHideUI":
      focusHideUI = value;
      break;
    case "focusHideBlocks":
      focusHideBlocks = value;
      break;
    case "selectedFontFamily":
      selectedFontFamily = value;
      break;
    case "popoverShowDelay":
      popoverShowDelay = value;
      break;
    case "navChevronPosition":
      navChevronPosition = value;
      break;
    case "navChevronOpacity":
      navChevronOpacity = value;
      break;
  }
};

export const ROAM_APP_ELT = document.querySelector(".roam-app");
const IS_ON_SMARTPHONE =
  !window.roamAlphaAPI.platform.isDesktop &&
  !window.roamAlphaAPI.platform.isPC &&
  (window.roamAlphaAPI.platform.isTouchDevice ||
    window.roamAlphaAPI.platform.isMobileApp ||
    window.roamAlphaAPI.platform.isIOS);

export const AppToaster = Toaster.create({
  className: "color-toaster",
  position: Position.TOP,
  maxToasts: 1,
});

const toggleWaySet = new Set(["With topbar button", "On graph load"]);

const toggleWayWithReadOnlySet = new Set([
  "On demand",
  "Toggle with Read only",
  "On graph load",
  "On graph load + Read only",
]);

const normalizeToggleWayV4 = (way) => {
  if (way === "Always") return Array.from(toggleWaySet)[2];
  return way;
};

// Migrate old settings to new "With Read only" options
const migrateToReadOnlyToggleWay = (way) => {
  if (way === "With command palette only") return "On demand";
  if (way === "With topbar button") return "Toggle with Read only";
  if (way === "On graph load + button") return "On graph load + Read only";
  if (way === "On graph load + command only") return "On graph load";
  if (way === "Always") return "On graph load + Read only";
  return way;
};
class Mode {
  constructor() {
    this.onLoad = false;
    this.onButton = false;
    this.onReadOnly = false; // Tied to Read Only mode
    this.onSmartphone = false;
    this.isOn = false;
  }
  setToggleWay(way, useReadOnlySet = false) {
    const toggleArray = Array.from(
      useReadOnlySet ? toggleWayWithReadOnlySet : toggleWaySet
    );

    // Reset flags
    this.onButton = false;
    this.onReadOnly = false;
    this.onLoad = false;

    switch (way) {
      case toggleArray[1]: // "With topbar button" or "With Read only"
        if (useReadOnlySet) {
          this.onReadOnly = true;
        } else {
          this.onButton = true;
        }
        break;
      case toggleArray[2]: // "On graph load + button" or "On graph load + Read only"
        this.onLoad = true;
        this.isOn = true;
        if (useReadOnlySet) {
          this.onReadOnly = true;
        } else {
          this.onButton = true;
        }
        break;
      case toggleArray[3]: // "On graph load + command only"
        this.onLoad = true;
        this.isOn = true;
        break;
      default: // "On demand"
        break;
    }
  }
  initialize() {
    if (this.onLoad || (IS_ON_SMARTPHONE && this.onSmartphone))
      this.isOn = true;
  }
  set(status) {
    if (status === "on") this.isOn = true;
    if (status === "off") this.isOn = false;
  }
}

export let bionicMode = new Mode(),
  readOnlyMode = new Mode(),
  selectOnClickMode = new Mode(),
  focusMode = new Mode(),
  navMode = new Mode();
let modesArray = [
  bionicMode,
  readOnlyMode,
  selectOnClickMode,
  focusMode,
  navMode,
];
// Optimize: use Array.some() for early exit when any mode is on
const oneModeIsOnAtLeast = () => modesArray.some((mode) => mode.isOn);

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
    const panelConfig = {
      tabTitle: "Reading mode",
      settings: [
        {
          id: "button-setting",
          name: "Button",
          description:
            "Display 🔓 button in the top bar (needed for menu and customization):",
          action: {
            type: "switch",
            onChange: (evt) => {
              buttonToggle(extensionAPI);
            },
          },
        },
        {
          id: "readonly-setting",
          name: "Read Only",
          description: "Enable Read Only mode (blocks not directly editable):",
          action: {
            type: "select",
            items: [...toggleWaySet],
            onChange: (evt) => {
              readOnlyMode.setToggleWay(evt);
              updateAfterSettingsChange();
            },
          },
        },
        // {
        //   id: "letterSpacing-setting",
        //   name: "Letter spacing",
        //   description: "Set letter spacing in Read Only mode (+x rem):",
        //   action: {
        //     type: "reactComponent",
        //     component: wrappedLetterSpacingSlider,
        //   },
        // },
        // {
        //   id: "lineHeight-setting",
        //   name: "Line height",
        //   description:
        //     "Line height (more space between lines) in Read Only mode:",
        //   action: {
        //     type: "reactComponent",
        //     component: wrappedLineHeightSlider,
        //   },
        // },
        // {
        //   id: "sampleText1-setting",
        //   name: "Sample text",
        //   description: "whose style changes when the above sliders are handled",
        //   action: {
        //     type: "reactComponent",
        //     component: wrappedSampleTextForReadOnly,
        //   },
        // },
        {
          id: "navigation-setting",
          name: "Navigation controls",
          description:
            "Display Nagiation controls to browse from one block to another:",
          action: {
            type: "select",
            items: [...toggleWayWithReadOnlySet],
            onChange: (evt) => {
              navMode.setToggleWay(evt, true);
              updateAfterSettingsChange();
            },
          },
        },
        {
          id: "popoverDelay-setting",
          name: "Popover show delay",
          description:
            "Delay (in milliseconds) before showing block preview popover when hovering chevrons:",
          action: {
            type: "select",
            items: ["0", "100", "200", "300", "500", "800", "1000"],
            onChange: (evt) => {
              popoverShowDelay = parseInt(evt);
            },
          },
        },
        {
          id: "navPosition-setting",
          name: "Chevron position",
          description:
            "Position of navigation chevrons on the screen:",
          action: {
            type: "select",
            items: ["Top left", "Top right", "Bottom right", "Bottom left"],
            onChange: (evt) => {
              const positionMap = {
                "Top left": "top-left",
                "Top right": "top-right",
                "Bottom right": "bottom-right",
                "Bottom left": "bottom-left",
              };
              navChevronPosition = positionMap[evt];
              updateAfterSettingsChange();
            },
          },
        },
        {
          id: "navOpacity-setting",
          name: "Chevron opacity",
          description:
            "Opacity of navigation chevrons (select 'On hover' to show only when hovering):",
          action: {
            type: "select",
            items: ["0.1", "0.3", "0.5", "On hover"],
            onChange: (evt) => {
              navChevronOpacity = evt === "On hover" ? 0 : parseFloat(evt);
              updateAfterSettingsChange();
            },
          },
        },
        {
          id: "select-setting",
          name: "Select on click",
          description: "Select a block on click instead of editing it:",
          action: {
            type: "select",
            items: [...toggleWayWithReadOnlySet],
            onChange: (evt) => {
              selectOnClickMode.setToggleWay(evt, true);
              updateAfterSettingsChange();
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
            items: [...toggleWayWithReadOnlySet],
            onChange: (evt) => {
              focusMode.setToggleWay(evt, true);
              updateAfterSettingsChange();
            },
          },
        },
        // {
        //   id: "focusOpacity-setting",
        //   name: "Unfocused opacity",
        //   description:
        //     "Opacity of unfocused elements (0: invisible, 0.5: semi-opacity)",
        //   action: {
        //     type: "select",
        //     items: ["0", "0.03", "0.05", "0.1", "0.2", "0.3", "0.5"],
        //     onChange: (evt) => {
        //       let oldOpacity = unfocusedOpacity;
        //       unfocusedOpacity = evt.replace(".", "");
        //       if (focusMode.isOn) {
        //         ROAM_APP_ELT.classList.remove(`rf-${oldOpacity}`);
        //         ROAM_APP_ELT.classList.add(`rf-${unfocusedOpacity}`);
        //       }
        //     },
        //   },
        // },
        {
          id: "bionic-setting",
          name: "Bionic reading Mode",
          description: "Bionic reading mode (emphasize first part of words):",
          action: {
            type: "select",
            items: [...toggleWayWithReadOnlySet],
            onChange: (evt) => {
              bionicMode.setToggleWay(evt, true);
              updateAfterSettingsChange();
            },
          },
        },
        // {
        //   id: "fixation-setting",
        //   name: "Fixation",
        //   description:
        //     "Set fixation (percetage of word in bold, from 0 to 100):",
        //   action: { type: "reactComponent", component: wrappedFixationSlider },
        // },
        // {
        //   id: "saccade-setting",
        //   name: "Saccade",
        //   description: "Set saccade (applies every n words, from 1 to 5):",
        //   action: { type: "reactComponent", component: wrappedSaccadeSlider },
        // },
        // {
        //   id: "sampleText2-setting",
        //   name: "Sample text",
        //   description: "whose style changes when the above sliders are handled",
        //   action: {
        //     type: "reactComponent",
        //     component: wrappedSampleTextForBionic,
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
    };

    extensionAPI.settings.panel.create(panelConfig);

    if (extensionAPI.settings.get("smartphone-setting") === null) {
      extensionAPI.settings.set("smartphone-setting", "Default");
    } else
      setSmartphoneSettings(extensionAPI.settings.get("smartphone-setting"));

    if (!toggleWaySet.has(extensionAPI.settings.get("readonly-setting"))) {
      extensionAPI.settings.set("readonly-setting", "With topbar button");
      readOnlyMode.setToggleWay("With topbar button");
    } else
      readOnlyMode.setToggleWay(
        normalizeToggleWayV4(extensionAPI.settings.get("readonly-setting"))
      );
    readOnlyMode.initialize();
    if (extensionAPI.settings.get("letterSpacing-setting") === null) {
      letterSpacing = 0;
      extensionAPI.settings.set("letterSpacing-setting", letterSpacing);
    } else
      letterSpacing = reduceToFixedValue(
        extensionAPI.settings.get("letterSpacing-setting"),
        0,
        2
      );
    if (extensionAPI.settings.get("lineHeight-setting") === null) {
      lineHeight = 1.5;
      extensionAPI.settings.set("lineHeight-setting", lineHeight);
    } else
      lineHeight = reduceToFixedValue(
        extensionAPI.settings.get("lineHeight-setting"),
        1.5,
        1
      );

    if (extensionAPI.settings.get("navigation-setting") === null) {
      extensionAPI.settings.set("navigation-setting", "Toggle with Read only");
      navMode.setToggleWay("Toggle with Read only", true);
    } else {
      const migratedValue = migrateToReadOnlyToggleWay(
        normalizeToggleWayV4(extensionAPI.settings.get("navigation-setting"))
      );
      navMode.setToggleWay(migratedValue, true);
      if (migratedValue !== extensionAPI.settings.get("navigation-setting")) {
        extensionAPI.settings.set("navigation-setting", migratedValue);
      }
    }
    navMode.initialize();

    if (extensionAPI.settings.get("popoverDelay-setting") === null) {
      extensionAPI.settings.set("popoverDelay-setting", "300");
      popoverShowDelay = 300;
    } else {
      popoverShowDelay = parseInt(
        extensionAPI.settings.get("popoverDelay-setting")
      );
    }

    if (extensionAPI.settings.get("navPosition-setting") === null) {
      extensionAPI.settings.set("navPosition-setting", "bottom-right");
      navChevronPosition = "bottom-right";
    } else {
      navChevronPosition = extensionAPI.settings.get("navPosition-setting");
    }

    if (extensionAPI.settings.get("navOpacity-setting") === null) {
      extensionAPI.settings.set("navOpacity-setting", "0.1");
      navChevronOpacity = 0.1;
    } else {
      const opacityValue = extensionAPI.settings.get("navOpacity-setting");
      navChevronOpacity = opacityValue === "hover" ? 0 : parseFloat(opacityValue);
    }

    if (extensionAPI.settings.get("select-setting") === null) {
      extensionAPI.settings.set("select-setting", "On demand");
      selectOnClickMode.setToggleWay("On demand", true);
    } else {
      const migratedValue = migrateToReadOnlyToggleWay(
        normalizeToggleWayV4(extensionAPI.settings.get("select-setting"))
      );
      selectOnClickMode.setToggleWay(migratedValue, true);
      if (migratedValue !== extensionAPI.settings.get("select-setting")) {
        extensionAPI.settings.set("select-setting", migratedValue);
      }
    }
    selectOnClickMode.initialize();

    if (extensionAPI.settings.get("focus-setting") === null) {
      extensionAPI.settings.set("focus-setting", "On demand");
      focusMode.setToggleWay("On demand", true);
    } else {
      const migratedValue = migrateToReadOnlyToggleWay(
        normalizeToggleWayV4(extensionAPI.settings.get("focus-setting"))
      );
      focusMode.setToggleWay(migratedValue, true);
      if (migratedValue !== extensionAPI.settings.get("focus-setting")) {
        extensionAPI.settings.set("focus-setting", migratedValue);
      }
    }
    focusMode.initialize();
    if (extensionAPI.settings.get("focusOpacity-setting") === null) {
      extensionAPI.settings.set("focusOpacity-setting", "0.1");
      unfocusedOpacity = "01";
    } else
      unfocusedOpacity = extensionAPI.settings
        .get("focusOpacity-setting")
        .replace(".", "");

    // Initialize focus mode visibility options
    if (extensionAPI.settings.get("focusHideUI-setting") === null) {
      extensionAPI.settings.set("focusHideUI-setting", true);
      focusHideUI = true;
    } else {
      focusHideUI = extensionAPI.settings.get("focusHideUI-setting");
    }

    if (extensionAPI.settings.get("focusHideBlocks-setting") === null) {
      extensionAPI.settings.set("focusHideBlocks-setting", true);
      focusHideBlocks = true;
    } else {
      focusHideBlocks = extensionAPI.settings.get("focusHideBlocks-setting");
    }

    // Initialize font family selection
    if (extensionAPI.settings.get("fontFamily-setting") === null) {
      extensionAPI.settings.set("fontFamily-setting", "");
      selectedFontFamily = "";
    } else {
      selectedFontFamily = extensionAPI.settings.get("fontFamily-setting");
      if (selectedFontFamily) {
        // Apply font family using data attribute
        ROAM_APP_ELT.setAttribute("data-font-family", selectedFontFamily);
      }
    }

    if (extensionAPI.settings.get("bionic-setting") === null) {
      extensionAPI.settings.set("bionic-setting", "On demand");
      bionicMode.setToggleWay("On demand", true);
    } else {
      const migratedValue = migrateToReadOnlyToggleWay(
        normalizeToggleWayV4(extensionAPI.settings.get("bionic-setting"))
      );
      bionicMode.setToggleWay(migratedValue, true);
      if (migratedValue !== extensionAPI.settings.get("bionic-setting")) {
        extensionAPI.settings.set("bionic-setting", migratedValue);
      }
    }
    bionicMode.initialize();
    if (extensionAPI.settings.get("fixation-setting") === null) {
      fixation = 50;
      extensionAPI.settings.set("fixation-setting", fixation);
    } else fixation = extensionAPI.settings.get("fixation-setting");
    if (extensionAPI.settings.get("saccade-setting") === null) {
      saccade = 1;
      extensionAPI.settings.set("saccade-setting", saccade);
    } else saccade = extensionAPI.settings.get("saccade-setting");
    if (extensionAPI.settings.get("button-setting") === null) {
      extensionAPI.settings.set("button-setting", true);
      buttonInTopBar = true;
    } else buttonInTopBar = extensionAPI.settings.get("button-setting");

    extensionAPI.ui.commandPalette.addCommand({
      label: "Reading Modes: Toggle Read only mode",
      callback: () => {
        isOn = !isOn;
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
      label: "Reading Modes: Disable all modes",
      callback: () => {
        modesArray.forEach((mode) => mode.set("off"));
        isOn = false;
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

    if (buttonInTopBar) buttonToggle(extensionAPI);
    if (readOnlyMode.isOn) {
      isOn = true;
    }
    window.addEventListener("popstate", autoToggleWhenBrowsing);
    applyEnabledModes();
    console.log("Reading mode extension loaded.");
  },
  onunload: () => {
    modesArray.forEach((mode) => mode.set("off"));
    onToggleOf(true);
    if (buttonInTopBar) {
      let container = document.getElementById("reading-mode-container");
      if (container) {
        ReactDOM.unmountComponentAtNode(container);
      }
    }
    console.log("Reading mode extension unloaded.");
  },
};

function buttonToggle(extensionAPI) {
  let nameToUse = "reading-mode",
    checkForButton = document.getElementById(nameToUse + "-container");

  if (!checkForButton) {
    // Create container for React component
    let mainButton = document.createElement("span");
    mainButton.id = nameToUse + "-container";
    mainButton.classList.add("bp3-popover-wrapper");

    let roamTopbar = document.getElementsByClassName("rm-topbar"),
      nextIconButton = roamTopbar[0].lastElementChild,
      flexDiv = document.createElement("div");

    flexDiv.id = nameToUse + "-flex-space";
    flexDiv.className = "rm-topbar__spacer-sm";
    nextIconButton.insertAdjacentElement("afterend", mainButton);
    mainButton.insertAdjacentElement("afterend", flexDiv);

    // Render React PopoverMenu component
    ReactDOM.render(
      React.createElement(PopoverMenu, {
        extensionAPI,
        readOnlyMode,
        bionicMode,
        selectOnClickMode,
        focusMode,
        navMode,
        updateAfterSettingsChange,
      }),
      mainButton
    );

    console.log("Reading mode button added");
  } else {
    // Unmount React component
    ReactDOM.unmountComponentAtNode(checkForButton);
    document.getElementById(nameToUse + "-flex-space").remove();
    checkForButton.remove();
    console.log("Reading mode button removed");
  }
}

function updateAfterSettingsChange(mode = null, status = null) {
  if (mode) toasterOnModeToggle(mode, status);

  // Auto-enable/disable modes tied to Read Only mode
  if (mode === "Read only mode") {
    if (status) {
      // Read Only was enabled, enable tied modes
      if (navMode.onReadOnly && !navMode.isOn) {
        navMode.isOn = true;
      }
      if (selectOnClickMode.onReadOnly && !selectOnClickMode.isOn) {
        selectOnClickMode.isOn = true;
      }
      if (focusMode.onReadOnly && !focusMode.isOn) {
        focusMode.isOn = true;
      }
      if (bionicMode.onReadOnly && !bionicMode.isOn) {
        bionicMode.isOn = true;
      }
    } else {
      // Read Only was disabled, disable tied modes
      if (navMode.onReadOnly && navMode.isOn) {
        navMode.isOn = false;
      }
      if (selectOnClickMode.onReadOnly && selectOnClickMode.isOn) {
        selectOnClickMode.isOn = false;
      }
      if (focusMode.onReadOnly && focusMode.isOn) {
        focusMode.isOn = false;
      }
      if (bionicMode.onReadOnly && bionicMode.isOn) {
        bionicMode.isOn = false;
      }
    }
  }

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
      // Apply font family if one is selected
      if (selectedFontFamily) {
        ROAM_APP_ELT.setAttribute("data-font-family", selectedFontFamily);
      }
    }
    let elt = document.querySelectorAll(".rm-block-text");
    applyModesToSelection(elt);
    if (selectOnClickMode.isOn && !refresh) {
      document.addEventListener("keydown", onKeydown);
      document
        .querySelector(".rm-article-wrapper")
        .addEventListener("click", onClickToCleanBlue);
    }
    if (!refresh) {
      connectObservers();
    }
    if (selectOnClickMode.isOn || readOnlyMode.isOn) addListenerOnZoom();
  }
  if (focusMode.isOn && !refresh) {
    ROAM_APP_ELT.classList.add("read-focus");
    ROAM_APP_ELT.classList.add(`rf-${unfocusedOpacity}`);
    if (focusHideUI) {
      ROAM_APP_ELT.classList.add("read-focus-hide-ui");
    }
    if (focusHideBlocks) {
      ROAM_APP_ELT.classList.add("read-focus-hide-blocks");
    }
  }
  if (navMode.isOn) {
    if (refresh) {
      await updateNavigation();
    } else {
      await initializeNavigation();
    }
    // Update display settings (position and opacity) in both cases
    updateChevronDisplaySettings();
  }
}

export function autoToggleWhenBrowsing() {
  if (isOn || oneModeIsOnAtLeast()) {
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
  if (!readOnlyMode.isOn && !bionicMode.isOn && !selectOnClickMode.isOn) {
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
    ROAM_APP_ELT.classList.remove("read-focus-hide-ui");
    ROAM_APP_ELT.classList.remove("read-focus-hide-blocks");
    ROAM_APP_ELT.classList.remove(`rf-${unfocusedOpacity}`);
  }
  if (!navMode.isOn) {
    removeChevronsListener();
    removeChevrons();
  }
  if (!oneModeIsOnAtLeast())
    window.removeEventListener("popstate", autoToggleWhenBrowsing);
}
