import React, { useEffect, useState, useRef } from "react";
// import ReactDOM from "react-dom";
import { Slider } from "@blueprintjs/core"; // TagInput
import {
  ROAM_APP_ELT,
  globalVarGetter,
  isOn,
  letterSpacing,
  lineHeight,
} from ".";
import { insertBionicNode, removeBionicNodes } from "./modes";
import { reduceToFixedValue } from "./utils";

const SampleTextComponent = ({ nbOfSliderMax }) => {
  const [style, setStyle] = useState({});
  const pRef = useRef(null);

  useEffect(() => {
    const updateStyle = () => {
      setStyle({
        padding: "5px",
        paddingLeft: "20px",
        borderRadius: "3px",
        // Roam text styling (Native & Roam Studio)
        fontFamily: 'var(--ff-main, "Inter",sans-serif)',
        fontSize: "var(--fs-main, 14px)",
        fontWeight: "var(--fw-main, 400)",
        color: "var(--co-main, #202B33)",
        backgroundColor: "var(--bc-app, #fff)",
        // specitic extension styling
        lineHeight: `${lineHeight}rem`,
        letterSpacing: `${letterSpacing}rem`,
        wordSpacing: `${letterSpacing}rem`,
      });
      if (nbOfSliderMax === "4") {
        removeBionicNodes(pRef.current);
        insertBionicNode(pRef.current.childNodes[0]);
      }
    };

    updateStyle();

    const handleVariableChange = () => {
      setTimeout(() => {
        updateStyle();
      }, 200);
    };

    document.querySelectorAll(".bp3-slider").forEach((slider, index) => {
      if (index < nbOfSliderMax)
        return slider.addEventListener("mouseup", handleVariableChange);
    });

    return () => {
      document.querySelectorAll(".bp3-slider").forEach((slider, index) => {
        if (index < nbOfSliderMax)
          return slider.addEventListener("mouseup", handleVariableChange);
      });
    };
  }, []);

  //   <p style={style} ref={pRef}>
  //   • Lorem ipsum dolor sit amet consectetur adipisicing elit. Rem enim
  //   veritatis commodi vel similique consequatur animi adipisci deleniti
  //   soluta unde?
  // </p>

  return (
    <div>
      <ul style={{ listStyleType: "disc" }}>
        <li style={style} ref={pRef}>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Rem enim
          veritatis commodi vel similique consequatur animi adipisci deleniti
          soluta unde?
        </li>
      </ul>
    </div>
  );
};

export const SampleTextForReadonly = () => {
  return <SampleTextComponent nbOfSliderMax="2" />;
};
export const SampleTextForBionic = () => {
  return <SampleTextComponent nbOfSliderMax="4" />;
};

export function fixationSlider({ extensionAPI }) {
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
      //applyToTestText();
    },
  });
}

export function saccadeSlider({ extensionAPI }) {
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
      //applyToTestText();
    },
  });
}

export function letterSpacingSlider({ extensionAPI }) {
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
      globalVarGetter("letterSpacing", reduceToFixedValue(value, 0, 2));
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
      //applyToTestText();
    },
  });
}

export function lineHeightSlider({ extensionAPI }) {
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
      globalVarGetter("lineHeight", reduceToFixedValue(value, 1.5, 1));
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
      //applyToTestText();
    },
  });
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
