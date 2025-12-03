import React, { useEffect, useState, useRef } from "react";
import {
  ROAM_APP_ELT,
  globalVarGetter,
  isOn,
  letterSpacing,
  lineHeight,
} from "../index";
import { insertBionicNode, removeBionicNodes } from "../modes";

const SampleTextComponent = ({ nbOfSliderMax }) => {
  const [style, setStyle] = useState({});
  const pRef = useRef(null);

  useEffect(() => {
    let timeoutId = null; // Store timeout ID for cleanup

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
      // Clear existing timeout to prevent memory leaks
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        updateStyle();
        timeoutId = null;
      }, 200);
    };

    const sliders = document.querySelectorAll(".bp3-slider");
    sliders.forEach((slider, index) => {
      if (index < nbOfSliderMax) {
        slider.addEventListener("mouseup", handleVariableChange);
      }
    });

    // Cleanup function to prevent memory leaks
    return () => {
      // Clear any pending timeout
      if (timeoutId) clearTimeout(timeoutId);

      // Remove event listeners
      sliders.forEach((slider, index) => {
        if (index < nbOfSliderMax) {
          slider.removeEventListener("mouseup", handleVariableChange);
        }
      });
    };
  }, [nbOfSliderMax]);

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
