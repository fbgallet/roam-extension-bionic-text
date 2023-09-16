/********************************************************************************************** 
  Bionic text feature is inspired by Bionic Reading (TM) : https://https://bionic-reading.com/
***********************************************************************************************/

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
} from "./modes";
import {
  connectObservers,
  disconnectAllObservers,
  onKeydown,
} from "./observers";
import {
  SampleTextForBionic,
  SampleTextForReadonly,
  fixationSlider,
  letterSpacingSlider,
  lineHeightSlider,
  saccadeSlider,
} from "./components";
import { reduceToFixedValue } from "./utils";

var buttonInTopBar, unfocusedOpacity;

export var fixation, saccade;
export var letterSpacing,
  lineHeight = 0;
export var isOn = false;
export var isNewView = true;

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
  }
};

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
  "On graph load + button",
  "On graph load + command only",
]);

const normalizeToggleWayV4 = (way) => {
  if (way === "Always") return toggleWaySet[2];
  return way;
};
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
        this.onButton = true;
        this.isOn = true;
        break;
      case toggleWayArray[3]:
        this.onLoad = true;
        this.isOn = true;
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
const oneModeIsOnAtLeast = () => {
  let oneModeIsTrue = false;
  modesArray.forEach((mode) => {
    if (mode.isOn) oneModeIsTrue = true;
  });
  return oneModeIsTrue;
};

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
    const wrappedSampleTextForReadOnly = () => SampleTextForReadonly();
    const wrappedSampleTextForBionic = () => SampleTextForBionic();
    // const wrappedBlueprintTagInput = () => blueprintTagInput({ extensonAPI });

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
              updateAfterSettingsChange();
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
          id: "sampleText1-setting",
          name: "Sample text",
          description: "whose style changes when the above sliders are handled",
          action: {
            type: "reactComponent",
            component: wrappedSampleTextForReadOnly,
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
            items: [...toggleWaySet],
            onChange: (evt) => {
              selectOnClickMode.setToggleWay(evt);
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
            items: [...toggleWaySet],
            onChange: (evt) => {
              focusMode.setToggleWay(evt);
              updateAfterSettingsChange();
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
          id: "sampleText2-setting",
          name: "Sample text",
          description: "whose style changes when the above sliders are handled",
          action: {
            type: "reactComponent",
            component: wrappedSampleTextForBionic,
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
      readOnlyMode.setToggleWay(
        normalizeToggleWayV4(extensionAPI.settings.get("readonly-setting"))
      );
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
      navMode.setToggleWay(
        normalizeToggleWayV4(extensionAPI.settings.get("navigation-setting"))
      );
    navMode.initialize();

    if (extensionAPI.settings.get("select-setting") == null) {
      extensionAPI.settings.set("select-setting", "With command palette only");
      selectOnClickMode.setToggleWay("With command palette only");
    } else
      selectOnClickMode.setToggleWay(
        normalizeToggleWayV4(extensionAPI.settings.get("select-setting"))
      );
    selectOnClickMode.initialize();

    if (extensionAPI.settings.get("focus-setting") == null) {
      extensionAPI.settings.set("focus-setting", "With command palette only");
      focusMode.setToggleWay("With command palette only");
    } else
      focusMode.setToggleWay(
        normalizeToggleWayV4(extensionAPI.settings.get("focus-setting"))
      );
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
    } else
      bionicMode.setToggleWay(
        normalizeToggleWayV4(extensionAPI.settings.get("bionic-setting"))
      );
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
    modesArray.forEach((mode) => mode.set("off"));
    onToggleOf(true);
    if (buttonInTopBar) buttonToggle();
    console.log("Reading mode extension unloaded.");
  },
};

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

function updateAfterSettingsChange(mode = null, status = null) {
  if (mode) toasterOnModeToggle(mode, status);
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
  }
  if (navMode.isOn) {
    refresh ? await updateNavigation() : await initializeNavigation();
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
    ROAM_APP_ELT.classList.remove(`rf-${unfocusedOpacity}`);
  }
  if (!navMode.isOn) {
    removeChevronsListener();
    removeChevrons();
  }
  if (!oneModeIsOnAtLeast())
    window.removeEventListener("popstate", autoToggleWhenBrowsing);
}
