import React from "react";
import { Slider } from "@blueprintjs/core";
import {
  ROAM_APP_ELT,
  globalVarGetter,
  letterSpacing,
  lineHeight,
  readOnlyMode,
  bionicMode,
  focusMode,
  unfocusedOpacity,
} from "../index";
import { removeBionicNodes, processHtmlElement } from "../modes";
import { reduceToFixedValue } from "../utils/roamAPI";

export function FixationSlider({ extensionAPI }) {
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
      globalVarGetter("fixation", value);

      // Reapply bionic mode to update Roam content
      if (bionicMode.isOn) {
        const elements = document.querySelectorAll(".rm-block-text");
        removeBionicNodes();
        elements.forEach((element) => {
          processHtmlElement(element);
        });
      }
    },
  });
}

export function SaccadeSlider({ extensionAPI }) {
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
      globalVarGetter("saccade", value);

      // Reapply bionic mode to update Roam content
      if (bionicMode.isOn) {
        const elements = document.querySelectorAll(".rm-block-text");
        removeBionicNodes();
        elements.forEach((element) => {
          processHtmlElement(element);
        });
      }
    },
  });
}

export function LetterSpacingSlider({ extensionAPI }) {
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
      const oldLetterSpacing = letterSpacing;
      extensionAPI.settings.set("letterSpacing-setting", value);
      globalVarGetter("letterSpacing", reduceToFixedValue(value, 0, 2));

      // Apply letter spacing class changes when Read only mode is on
      if (readOnlyMode.isOn) {
        // Remove old class if it exists
        if (oldLetterSpacing !== 0) {
          const oldClassName = `read-ls-${oldLetterSpacing
            .toString()
            .replace(".", "")}`;
          ROAM_APP_ELT.classList.remove(oldClassName);
        }
        // Add new class if value is not 0
        if (letterSpacing !== 0) {
          const newClassName = `read-ls-${letterSpacing
            .toString()
            .replace(".", "")}`;
          ROAM_APP_ELT.classList.add(newClassName);
        }
      }
    },
  });
}

export function LineHeightSlider({ extensionAPI }) {
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
      const oldLineHeight = lineHeight;
      extensionAPI.settings.set("lineHeight-setting", value);
      globalVarGetter("lineHeight", reduceToFixedValue(value, 1.5, 1));

      // Optimize: pre-compute class names and single condition check
      if (readOnlyMode.isOn) {
        if (oldLineHeight !== 1.5) {
          const oldClassName = `read-lh-${oldLineHeight
            .toString()
            .replace(".", "")}`;
          ROAM_APP_ELT.classList.remove(oldClassName);
        }
        if (lineHeight !== 1.5) {
          const newClassName = `read-lh-${lineHeight
            .toString()
            .replace(".", "")}`;
          ROAM_APP_ELT.classList.add(newClassName);
        }
      }
    },
  });
}

export function OpacitySlider({ extensionAPI }) {
  const [sliderValue, setSliderValue] = React.useState(
    parseFloat(extensionAPI.settings.get("focusOpacity-setting") || "0.1")
  );
  return React.createElement(Slider, {
    className: "reading-mode-slider",
    min: 0,
    max: 0.3,
    stepSize: 0.01,
    labelStepSize: 0.1,
    labelRenderer: (value) => value.toFixed(2),
    value: sliderValue,
    onChange: (value) => {
      // Round to nearest 0.05 for values >= 0.05, or to 0.01 for values < 0.05
      let roundedValue;
      if (value < 0.05) {
        roundedValue = Math.round(value * 100) / 100; // Round to 0.01
      } else {
        roundedValue = Math.round(value * 20) / 20; // Round to 0.05
      }

      setSliderValue(roundedValue);
      const oldOpacity = unfocusedOpacity;

      // Store as fixed 2 decimal string
      const newOpacityValue = roundedValue.toFixed(2);
      extensionAPI.settings.set("focusOpacity-setting", newOpacityValue);

      // Convert to class name format: "0.10" -> "010", "0.05" -> "005"
      const newOpacityClassName = newOpacityValue.replace(".", "");
      globalVarGetter("unfocusedOpacity", newOpacityClassName);

      // Apply opacity class changes when Focus mode is on
      if (focusMode.isOn) {
        if (oldOpacity) {
          ROAM_APP_ELT.classList.remove(`rf-${oldOpacity}`);
        }
        ROAM_APP_ELT.classList.add(`rf-${unfocusedOpacity}`);
      }
    },
  });
}
