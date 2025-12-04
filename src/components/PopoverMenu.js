import { useState, useEffect } from "react";
import {
  Popover,
  Menu,
  MenuItem,
  MenuDivider,
  Switch,
  HTMLSelect,
} from "@blueprintjs/core";
import {
  FixationSlider,
  SaccadeSlider,
  LetterSpacingSlider,
  LineHeightSlider,
  OpacitySlider,
} from "./Sliders";
import {
  ROAM_APP_ELT,
  globalVarGetter,
  focusHideUI,
  focusHideBlocks,
  selectedFontFamily,
  navChevronPosition,
  navChevronOpacity,
} from "../index";
import "./PopoverMenu.css";

export function PopoverMenu({
  extensionAPI,
  readOnlyMode,
  bionicMode,
  selectOnClickMode,
  focusMode,
  navMode,
  updateAfterSettingsChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [, forceUpdate] = useState({});

  // Re-render when modes change
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({});
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Check if any mode is on (for button state)
  const isAnyModeOn =
    readOnlyMode.isOn ||
    bionicMode.isOn ||
    selectOnClickMode.isOn ||
    focusMode.isOn ||
    navMode.isOn;

  const handleToggleMode = (e, mode, modeName) => {
    e.stopPropagation(); // Prevent popover from closing
    mode.isOn = !mode.isOn;
    updateAfterSettingsChange(modeName, mode.isOn);
    forceUpdate({});
  };

  const menuContent = (
    <Menu className="reading-mode-popover-menu">
      <MenuItem
        text="Read Only Mode"
        icon={readOnlyMode.isOn ? "lock" : "unlock"}
        onClick={(e) => handleToggleMode(e, readOnlyMode, "Read only mode")}
        intent={readOnlyMode.isOn ? "primary" : "none"}
      />

      {readOnlyMode.isOn && (
        <>
          <div className="reading-mode-slider-section">
            <div className="reading-mode-slider-container">
              <label className="reading-mode-slider-label">
                Letter Spacing
              </label>
              <LetterSpacingSlider extensionAPI={extensionAPI} />
            </div>

            <div className="reading-mode-slider-container">
              <label className="reading-mode-slider-label">Line Height</label>
              <LineHeightSlider extensionAPI={extensionAPI} />
            </div>

            <div className="reading-mode-slider-container">
              <label className="reading-mode-slider-label">Font Family</label>
              {React.createElement(HTMLSelect, {
                value: selectedFontFamily,
                onChange: (e) => {
                  e.stopPropagation();
                  const newFont = e.target.value;
                  extensionAPI.settings.set("fontFamily-setting", newFont);
                  globalVarGetter("selectedFontFamily", newFont);

                  // Apply font family using data attribute
                  if (newFont) {
                    ROAM_APP_ELT.setAttribute("data-font-family", newFont);
                  } else {
                    ROAM_APP_ELT.removeAttribute("data-font-family");
                  }
                  forceUpdate({});
                },
                options: [
                  { value: "", label: "Default" },
                  { value: "Inter", label: "Inter" },
                  { value: "SF Pro", label: "SF Pro" },
                  { value: "Noto Sans", label: "Noto Sans" },
                  { value: "Open Sans", label: "Open Sans" },
                  { value: "Verdana", label: "Verdana" },
                  { value: "Georgia", label: "Georgia (serif)" },
                  { value: "Palatino", label: "Palatino (serif)" },
                  { value: "Lora", label: "Lora (serif)" },
                ],
              })}
            </div>
          </div>
          <MenuDivider />
        </>
      )}

      <MenuItem
        text="Bionic Reading Mode"
        icon={bionicMode.isOn ? "eye-open" : "eye-off"}
        onClick={(e) => handleToggleMode(e, bionicMode, "Bionic mode")}
        intent={bionicMode.isOn ? "primary" : "none"}
      />

      {bionicMode.isOn && (
        <>
          <div className="reading-mode-slider-section">
            <div className="reading-mode-slider-container">
              <label className="reading-mode-slider-label">
                Fixation (% of word in bold)
              </label>
              <FixationSlider extensionAPI={extensionAPI} />
            </div>

            <div className="reading-mode-slider-container">
              <label className="reading-mode-slider-label">
                Saccade (apply every n words)
              </label>
              <SaccadeSlider extensionAPI={extensionAPI} />
            </div>
          </div>
          <MenuDivider />
        </>
      )}

      <MenuItem
        text="Select on Click"
        icon={selectOnClickMode.isOn ? "select" : "hand"}
        onClick={(e) =>
          handleToggleMode(e, selectOnClickMode, "Select on click mode")
        }
        intent={selectOnClickMode.isOn ? "primary" : "none"}
      />

      <MenuItem
        text="Focus Mode"
        icon={focusMode.isOn ? "eye-open" : "eye-off"}
        onClick={(e) => handleToggleMode(e, focusMode, "Focus mode")}
        intent={focusMode.isOn ? "primary" : "none"}
      />

      {focusMode.isOn && (
        <>
          <div className="reading-mode-slider-section">
            <div className="reading-mode-slider-container">
              <label className="reading-mode-slider-label">
                Unfocused Opacity
              </label>
              <OpacitySlider extensionAPI={extensionAPI} />
            </div>

            <div
              className="reading-mode-slider-container"
              style={{ paddingLeft: "20px" }}
            >
              {React.createElement(Switch, {
                checked: focusHideUI,
                label: "Hide UI elements",
                onChange: (e) => {
                  e.stopPropagation();
                  const newValue = e.target.checked;
                  extensionAPI.settings.set("focusHideUI-setting", newValue);
                  globalVarGetter("focusHideUI", newValue);

                  if (focusMode.isOn) {
                    if (newValue) {
                      ROAM_APP_ELT.classList.add("read-focus-hide-ui");
                    } else {
                      ROAM_APP_ELT.classList.remove("read-focus-hide-ui");
                    }
                  }
                  forceUpdate({});
                },
              })}
            </div>

            <div
              className="reading-mode-slider-container"
              style={{ paddingLeft: "20px" }}
            >
              {React.createElement(Switch, {
                checked: focusHideBlocks,
                label: "Hide unfocused blocks",
                onChange: (e) => {
                  e.stopPropagation();
                  const newValue = e.target.checked;
                  extensionAPI.settings.set(
                    "focusHideBlocks-setting",
                    newValue
                  );
                  globalVarGetter("focusHideBlocks", newValue);

                  if (focusMode.isOn) {
                    if (newValue) {
                      ROAM_APP_ELT.classList.add("read-focus-hide-blocks");
                    } else {
                      ROAM_APP_ELT.classList.remove("read-focus-hide-blocks");
                    }
                  }
                  forceUpdate({});
                },
              })}
            </div>
          </div>
          <MenuDivider />
        </>
      )}

      <MenuItem
        text="Navigation Controls"
        icon={navMode.isOn ? "arrow-right" : "arrows-horizontal"}
        onClick={(e) =>
          handleToggleMode(e, navMode, "Navigation controls display")
        }
        intent={navMode.isOn ? "primary" : "none"}
      />

      {navMode.isOn && (
        <>
          <div className="reading-mode-slider-section">
            <div className="reading-mode-slider-container">
              <label className="reading-mode-slider-label">Position</label>
              {React.createElement(HTMLSelect, {
                value: navChevronPosition,
                onChange: (e) => {
                  e.stopPropagation();
                  const newPosition = e.target.value;
                  extensionAPI.settings.set("navPosition-setting", newPosition);
                  globalVarGetter("navChevronPosition", newPosition);
                  updateAfterSettingsChange();
                  forceUpdate({});
                },
                options: [
                  { value: "top-left", label: "Top left" },
                  { value: "top-right", label: "Top right" },
                  { value: "bottom-right", label: "Bottom right" },
                  { value: "bottom-left", label: "Bottom left" },
                ],
              })}
            </div>

            <div className="reading-mode-slider-container">
              <label className="reading-mode-slider-label">Opacity</label>
              {React.createElement(HTMLSelect, {
                value:
                  navChevronOpacity === 0
                    ? "hover"
                    : navChevronOpacity.toString(),
                onChange: (e) => {
                  e.stopPropagation();
                  const newOpacity =
                    e.target.value === "hover" ? 0 : parseFloat(e.target.value);
                  extensionAPI.settings.set(
                    "navOpacity-setting",
                    e.target.value
                  );
                  globalVarGetter("navChevronOpacity", newOpacity);
                  updateAfterSettingsChange();
                  forceUpdate({});
                },
                options: [
                  { value: "0.1", label: "0.1" },
                  { value: "0.3", label: "0.3" },
                  { value: "0.5", label: "0.5" },
                  { value: "hover", label: "On hover" },
                ],
              })}
            </div>
          </div>
        </>
      )}
    </Menu>
  );

  const handleButtonClick = (e) => {
    // Cmd+click or Ctrl+click to toggle read only mode directly without opening popover
    if (e.metaKey || e.ctrlKey) {
      e.stopPropagation();
      e.preventDefault();
      readOnlyMode.isOn = !readOnlyMode.isOn;
      updateAfterSettingsChange("Read only mode", readOnlyMode.isOn);
      forceUpdate({});
    }
  };

  return (
    <Popover
      content={menuContent}
      isOpen={isOpen}
      onInteraction={(state) => setIsOpen(state)}
      position="bottom-left"
      minimal={true}
    >
      <span
        className={`bp3-icon-${
          readOnlyMode.isOn ? "lock" : "unlock"
        } bp3-button bp3-minimal bp3-small ${
          isAnyModeOn ? "bp3-intent-primary" : ""
        }`}
        id="reading-mode-icon"
        onClick={handleButtonClick}
      />
    </Popover>
  );
}
