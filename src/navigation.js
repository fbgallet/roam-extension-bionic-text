import {
  navMode,
  popoverShowDelay,
  navChevronPosition,
  navChevronOpacity,
  AppToaster,
} from ".";
import { Intent } from "@blueprintjs/core";
import {
  getFirstChildUid,
  getParentUID,
  getSiblingsAndOrder,
  isCurrentPageDNP,
  isExisting,
  dnpUidToPageTitle,
  createPage,
  openPage,
  getTodayDNPUid,
} from "./utils/roamAPI";
import {
  getNextExistingDNP,
  getPreviousExistingDNP,
  getDNPOffsetByDays,
  getDNPOffsetByMonths,
  getDNPOffsetByYears,
  getNextDayUid,
} from "./utils/dnp";

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

// Track keyboard modifiers for DNP navigation
let keyboardModifiers = {
  shift: false,
  ctrl: false,
  alt: false,
};

// Track clicks on non-existent DNP pages for "click again to create" feature
let lastNonExistentDNPClick = {
  uid: null,
  timestamp: 0,
  direction: null,
};

// Update keyboard modifier state
function updateKeyboardModifiers(event) {
  keyboardModifiers.shift = event.shiftKey;
  keyboardModifiers.ctrl = event.ctrlKey || event.metaKey; // metaKey for Mac Cmd
  keyboardModifiers.alt = event.altKey;
}

// Store event listener references for cleanup
let globalEventListeners = [];

// Add keyboard event listeners
function addGlobalKeyboardListeners() {
  const listeners = [
    { target: document, event: "keydown", handler: updateKeyboardModifiers },
    { target: document, event: "keyup", handler: updateKeyboardModifiers },
    {
      target: document,
      event: "mouseenter",
      handler: updateKeyboardModifiers,
      options: true,
    },
    {
      target: document,
      event: "mousemove",
      handler: updateKeyboardModifiers,
      options: true,
    },
  ];

  listeners.forEach(({ target, event, handler, options }) => {
    target.addEventListener(event, handler, options);
    globalEventListeners.push({ target, event, handler, options });
  });
}

// Remove all global keyboard event listeners
function removeGlobalKeyboardListeners() {
  globalEventListeners.forEach(({ target, event, handler, options }) => {
    target.removeEventListener(event, handler, options);
  });
  globalEventListeners = [];
}

// Helper function to get target DNP based on keyboard modifiers
function getTargetDNPWithModifiers(uid, direction) {
  const multiplier = direction === "forward" ? 1 : -1;

  if (keyboardModifiers.alt) {
    // Alt: 1 year
    const targetUid = getDNPOffsetByYears(uid, multiplier * 1);
    return {
      uid: targetUid,
      label: `${multiplier > 0 ? "Next" : "Previous"} year (same day)`,
      exists: isExisting(targetUid),
      hasModifier: true,
    };
  } else if (keyboardModifiers.ctrl) {
    // Ctrl/Cmd: 1 month
    const targetUid = getDNPOffsetByMonths(uid, multiplier * 1);
    return {
      uid: targetUid,
      label: `${multiplier > 0 ? "Next" : "Previous"} month (same day)`,
      exists: isExisting(targetUid),
      hasModifier: true,
    };
  } else if (keyboardModifiers.shift) {
    // Shift: 7 days (1 week)
    const targetUid = getDNPOffsetByDays(uid, multiplier * 7);
    return {
      uid: targetUid,
      label: `${multiplier > 0 ? "+7" : "-7"} days`,
      exists: isExisting(targetUid),
      hasModifier: true,
    };
  } else {
    // No modifier: next/previous existing day
    const getNextOrPrevFn =
      direction === "forward" ? getNextExistingDNP : getPreviousExistingDNP;
    const targetUid = getNextOrPrevFn(uid, isExisting);
    return {
      uid: targetUid,
      label: `${direction === "forward" ? "Next" : "Previous"} Daily Note`,
      exists: targetUid !== null,
      hasModifier: false,
    };
  }
}

// Create popover content for block previews
function createBlockPreviewPopover(blockUid, label, notExistingMessage = null) {
  const popoverContent = document.createElement("div");
  popoverContent.className = "chevron-popover-content";

  const labelDiv = document.createElement("div");
  labelDiv.className = "chevron-popover-label";
  labelDiv.textContent = label;
  popoverContent.appendChild(labelDiv);

  if (blockUid) {
    if (notExistingMessage) {
      // Show message for non-existing DNP
      const messageDiv = document.createElement("div");
      messageDiv.className = "chevron-popover-message";
      messageDiv.style.padding = "8px";
      messageDiv.style.fontStyle = "italic";
      messageDiv.style.color = "#888";
      messageDiv.textContent = notExistingMessage;
      popoverContent.appendChild(messageDiv);
    } else {
      const blockPreview = document.createElement("div");
      blockPreview.className = "chevron-popover-block";
      try {
        window.roamAlphaAPI.ui.components.renderBlock({
          uid: blockUid,
          el: blockPreview,
        });
      } catch (error) {
        console.error("Failed to render block preview:", error);
        blockPreview.textContent = "Preview unavailable";
      }
      popoverContent.appendChild(blockPreview);
    }
  }

  return popoverContent;
}

// Add popover to chevron element
function addPopoverToChevron(chevronElement, getBlockUid, getLabel) {
  let popoverInstance = null;
  let hideTimeout = null;
  let showTimeout = null;

  const showPopover = () => {
    // Clear any pending hide timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }

    // Don't recreate if already visible
    if (popoverInstance) return;

    let blockUid = getBlockUid();
    let label = typeof getLabel === "function" ? getLabel() : getLabel;
    let notExistingMessage = null;

    // Handle DNP navigation with modifiers
    if (
      topViewBlockContext?.isDNP &&
      (chevronElement.classList.contains("top-chevron") ||
        chevronElement.classList.contains("bottom-chevron"))
    ) {
      const direction = chevronElement.classList.contains("top-chevron")
        ? "backward"
        : "forward";
      const targetInfo = getTargetDNPWithModifiers(
        topViewBlockContext.uid,
        direction
      );

      blockUid = targetInfo.uid;
      label = targetInfo.label;

      // Special case: on today's page with no tomorrow
      const isToday = topViewBlockContext.uid === getTodayDNPUid();
      const isTomorrowMissing = direction === "forward" &&
                                !keyboardModifiers.shift &&
                                !keyboardModifiers.ctrl &&
                                !keyboardModifiers.alt &&
                                isToday &&
                                !blockUid;

      // If we're on today and tomorrow doesn't exist, use tomorrow's uid for the message
      if (isTomorrowMissing) {
        blockUid = getNextDayUid(topViewBlockContext.uid);
        label = "Next Daily Note (tomorrow)";
      }

      if (!targetInfo.exists && blockUid) {
        const pageTitle = dnpUidToPageTitle(blockUid);

        // Check if this is a click on next day when current page is today
        const isNextDayFromToday =
          direction === "forward" &&
          !keyboardModifiers.shift &&
          !keyboardModifiers.ctrl &&
          !keyboardModifiers.alt &&
          topViewBlockContext.uid === getTodayDNPUid() &&
          blockUid === getNextDayUid(topViewBlockContext.uid);

        // Show "click again to create" message for:
        // 1. Distant dates (with modifiers)
        // 2. Next day from today
        const shouldShowCreateMessage =
          keyboardModifiers.shift ||
          keyboardModifiers.ctrl ||
          keyboardModifiers.alt ||
          isNextDayFromToday;

        if (shouldShowCreateMessage) {
          // Check if user already clicked once
          const hasClickedOnce = lastNonExistentDNPClick.uid === blockUid &&
                                 lastNonExistentDNPClick.direction === direction &&
                                 (Date.now() - lastNonExistentDNPClick.timestamp) < 3000;

          const hasModifier = keyboardModifiers.shift || keyboardModifiers.ctrl || keyboardModifiers.alt;
          const modifierText = hasModifier ? " (with the same modifier key)" : "";

          if (hasClickedOnce) {
            notExistingMessage = `Click again${modifierText} to CREATE and open:\n"${pageTitle}"`;
          } else {
            notExistingMessage = `Click twice${modifierText} to create and open:\n"${pageTitle}"`;
          }
        } else {
          notExistingMessage = "This daily note page doesn't exist yet.";
        }
      }
    }

    if (!blockUid) return;

    // Create popover content
    const popoverContent = createBlockPreviewPopover(
      blockUid,
      label,
      notExistingMessage
    );

    // Create Blueprint popover
    popoverInstance = document.createElement("div");
    popoverInstance.className = "bp3-popover chevron-popover";
    popoverInstance.style.position = "fixed";

    const popoverArrow = document.createElement("div");
    popoverArrow.className = "bp3-popover-arrow";
    const arrowSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    arrowSvg.setAttribute("viewBox", "0 0 30 30");
    const arrowPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    arrowPath.setAttribute("class", "bp3-popover-arrow-border");
    arrowPath.setAttribute(
      "d",
      "M8.11 6.302c1.015-.936 1.887-2.922 1.887-4.297v26c0-1.378-.868-3.357-1.888-4.297L.925 17.09c-1.237-1.14-1.233-3.034 0-4.17L8.11 6.302z"
    );
    const arrowFill = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    arrowFill.setAttribute("class", "bp3-popover-arrow-fill");
    arrowFill.setAttribute(
      "d",
      "M8.787 7.036c1.22-1.125 2.21-3.376 2.21-5.03V0v30-2.005c0-1.654-.983-3.9-2.21-5.03l-7.183-6.616c-.81-.746-.802-1.96 0-2.7l7.183-6.614z"
    );
    arrowSvg.appendChild(arrowPath);
    arrowSvg.appendChild(arrowFill);
    popoverArrow.appendChild(arrowSvg);

    const popoverInner = document.createElement("div");
    popoverInner.className = "bp3-popover-content";
    popoverInner.appendChild(popoverContent);

    popoverInstance.appendChild(popoverArrow);
    popoverInstance.appendChild(popoverInner);
    document.body.appendChild(popoverInstance);

    // Position popover with viewport awareness
    const rect = chevronElement.getBoundingClientRect();
    const popoverRect = popoverInstance.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;
    const padding = 10; // Extra padding from viewport edge

    let top,
      left,
      arrowRotation = 0;

    // Determine initial position based on chevron type
    if (chevronElement.classList.contains("left-chevron")) {
      top = rect.top + rect.height / 2 - popoverRect.height / 2;
      left = rect.left - popoverRect.width - margin;
      arrowRotation = 0;

      // If popover goes off left edge, show on right side instead
      if (left < padding) {
        left = rect.right + margin;
        arrowRotation = 180;
      }
    } else if (chevronElement.classList.contains("right-chevron")) {
      top = rect.top + rect.height / 2 - popoverRect.height / 2;
      left = rect.right + margin;
      arrowRotation = 180;

      // If popover goes off right edge, show on left side instead
      if (left + popoverRect.width > viewportWidth - padding) {
        left = rect.left - popoverRect.width - margin;
        arrowRotation = 0;
      }
    } else if (chevronElement.classList.contains("top-chevron")) {
      top = rect.top - popoverRect.height - margin;
      left = rect.left + rect.width / 2 - popoverRect.width / 2;
      arrowRotation = 90;

      // If popover goes off top edge, show below instead
      if (top < padding) {
        top = rect.bottom + margin;
        arrowRotation = 270;
      }
    } else if (chevronElement.classList.contains("bottom-chevron")) {
      top = rect.bottom + margin;
      left = rect.left + rect.width / 2 - popoverRect.width / 2;
      arrowRotation = 270;

      // If popover goes off bottom edge, show above instead
      if (top + popoverRect.height > viewportHeight - padding) {
        top = rect.top - popoverRect.height - margin;
        arrowRotation = 90;
      }
    }

    // Ensure popover doesn't go off left/right edges (horizontal adjustment)
    if (left < padding) {
      left = padding;
    } else if (left + popoverRect.width > viewportWidth - padding) {
      left = viewportWidth - popoverRect.width - padding;
    }

    // Ensure popover doesn't go off top/bottom edges (vertical adjustment)
    if (top < padding) {
      top = padding;
    } else if (top + popoverRect.height > viewportHeight - padding) {
      top = viewportHeight - popoverRect.height - padding;
    }

    popoverInstance.style.top = `${top}px`;
    popoverInstance.style.left = `${left}px`;
    popoverArrow.style.transform = `rotate(${arrowRotation}deg)`;

    // Keep popover visible when hovering over it
    popoverInstance.addEventListener("mouseenter", () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
    });

    popoverInstance.addEventListener("mouseleave", () => {
      scheduleHide();
    });
  };

  const scheduleHide = () => {
    // Clear any existing timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }

    // Schedule popover removal with a delay
    hideTimeout = setTimeout(() => {
      if (popoverInstance) {
        popoverInstance.remove();
        popoverInstance = null;
      }
      hideTimeout = null;
    }, 200); // 200ms delay to allow moving from chevron to popover
  };

  const refreshPopover = () => {
    // Remove existing popover and recreate with new modifier state
    if (popoverInstance) {
      popoverInstance.remove();
      popoverInstance = null;
      showPopover();
    }
  };

  const handleShowStart = () => {
    // Clear any pending hide timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }

    // Schedule popover to show after delay from settings
    showTimeout = setTimeout(() => {
      showPopover();
      showTimeout = null;
    }, popoverShowDelay);
  };

  const handleShowEnd = () => {
    // Clear show timeout if mouse/touch leaves before popover appears
    if (showTimeout) {
      clearTimeout(showTimeout);
      showTimeout = null;
    }

    scheduleHide();
  };

  // Keyboard event handler to refresh popover when modifiers change
  const handleKeyChange = (e) => {
    updateKeyboardModifiers(e);
    if (popoverInstance) {
      refreshPopover();
    }
  };

  // Mouse events
  chevronElement.addEventListener("mouseenter", handleShowStart);
  chevronElement.addEventListener("mouseleave", handleShowEnd);

  // Touch events for mobile/tablet support
  chevronElement.addEventListener("touchstart", (e) => {
    e.preventDefault(); // Prevent mouse events from also firing
    handleShowStart();
  });

  chevronElement.addEventListener("touchend", (e) => {
    e.preventDefault();
    handleShowEnd();
  });

  // Also handle touch cancel
  chevronElement.addEventListener("touchcancel", handleShowEnd);

  // Listen for keyboard modifier changes to update popover
  chevronElement.addEventListener("keydown", handleKeyChange, true);
  chevronElement.addEventListener("keyup", handleKeyChange, true);
}

// Apply position and opacity settings to chevrons
function applyChevronDisplaySettings() {
  // Remove existing position classes
  chevrons.classList.remove(
    "chevrons-top-left",
    "chevrons-top-right",
    "chevrons-bottom-right",
    "chevrons-bottom-left"
  );

  // Add position class
  const positionClass = `chevrons-${navChevronPosition}`;
  chevrons.classList.add(positionClass);

  // Apply opacity
  if (navChevronOpacity === 0) {
    // On hover only
    chevrons.classList.add("chevrons-hover-only");
  } else {
    chevrons.classList.remove("chevrons-hover-only");
    chevrons.style.setProperty("--chevron-opacity", navChevronOpacity);
  }
}

export async function initializeNavigation() {
  try {
    chevrons.classList.add("chevrons");
    topChevron.classList.add("chevron", "top-chevron");
    topChevron.innerText = "〈";
    middleDiv.classList.add("middle");
    leftChevron.classList.add("chevron", "left-chevron");
    leftChevron.innerText = "〈";
    rightChevron.classList.add("chevron", "right-chevron");
    rightChevron.innerText = "〉";
    bottomChevron.classList.add("chevron", "bottom-chevron");
    bottomChevron.innerText = "〉";

    chevrons.appendChild(topChevron);
    middleDiv.appendChild(leftChevron);
    middleDiv.appendChild(rightChevron);
    chevrons.appendChild(middleDiv);
    chevrons.appendChild(bottomChevron);

    // Append to .roam-main instead of .roam-app for proper positioning
    const roamMain = document.querySelector(".roam-main");
    if (roamMain) {
      roamMain.appendChild(chevrons);
    } else {
      console.warn("Could not find .roam-main, falling back to .roam-app");
      document.querySelector(".roam-app").appendChild(chevrons);
    }

    // Add popovers with block previews
    addPopoverToChevron(
      topChevron,
      () => {
        if (topViewBlockContext?.isDNP) {
          return getPreviousExistingDNP(topViewBlockContext.uid, isExisting);
        }
        return topViewBlockContext?.hasPreviousSibling
          ? topViewBlockContext.getPreviousSibling()
          : null;
      },
      () => {
        if (topViewBlockContext?.isDNP) {
          return "Previous Daily Note (+Shift/Cmd/Alt for week/month/year)";
        }
        return "Previous sibling";
      }
    );
    addPopoverToChevron(
      bottomChevron,
      () => {
        if (topViewBlockContext?.isDNP) {
          return getNextExistingDNP(topViewBlockContext.uid, isExisting);
        }
        return topViewBlockContext?.nextBlock || null;
      },
      () => {
        if (topViewBlockContext?.isDNP) {
          return "Next Daily Note (+Shift/Cmd/Alt for week/month/year)";
        }
        return "Next sibling";
      }
    );
    addPopoverToChevron(
      leftChevron,
      () =>
        !topViewBlockContext?.isPage ? topViewBlockContext?.getParent() : null,
      "Parent"
    );
    addPopoverToChevron(
      rightChevron,
      () => topViewBlockContext?.firstChild || null,
      "First child"
    );

    addChevronsListener();
    addGlobalKeyboardListeners();
    applyChevronDisplaySettings();
    await updateNavigation();
  } catch (error) {
    console.error("Failed to initialize navigation:", error);
  }
}

// Export function to update display settings when changed in settings
export function updateChevronDisplaySettings() {
  if (chevrons.parentNode) {
    applyChevronDisplaySettings();
  }
}

export async function updateNavigation() {
  try {
    topViewBlockContext = null;
    topViewBlockContext = new BlockContext(
      await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid()
    );
    // console.log(topViewBlockContext);
    if (navMode.isOn) updateChevronsElts();
  } catch (error) {
    console.error("Failed to update navigation:", error);
  }
}

export function updateChevronsElts() {
  const isAnimated =
    bottomChevron.classList.contains("bottom-chevron-anim") ||
    topChevron.classList.contains("top-chevron-anim");

  // Handle DNP navigation
  if (topViewBlockContext.isDNP) {
    // Top chevron - navigate to previous DNP
    const prevDNP = getPreviousExistingDNP(topViewBlockContext.uid, isExisting);
    if (prevDNP) {
      topChevron.style.removeProperty("opacity");
      isAnimated
        ? setTimeout(() => topChevron.classList.add("double-chevron"), 1000)
        : topChevron.classList.add("double-chevron");
    } else {
      topChevron.style.opacity = "0";
      isAnimated
        ? setTimeout(() => topChevron.classList.remove("double-chevron"), 1000)
        : topChevron.classList.remove("double-chevron");
    }

    // Bottom chevron - navigate to next DNP
    // Show chevron even on today's date to allow creating tomorrow's page
    const isToday = topViewBlockContext.uid === getTodayDNPUid();
    const nextDNP = getNextExistingDNP(topViewBlockContext.uid, isExisting);
    if (nextDNP || isToday) {
      bottomChevron.style.removeProperty("opacity");
      isAnimated
        ? setTimeout(() => bottomChevron.classList.add("double-chevron"), 1000)
        : bottomChevron.classList.add("double-chevron");
    } else {
      bottomChevron.style.opacity = "0";
      isAnimated
        ? setTimeout(
            () => bottomChevron.classList.remove("double-chevron"),
            1000
          )
        : bottomChevron.classList.remove("double-chevron");
    }

    // Hide left chevron (no parent for DNP pages)
    leftChevron.style.opacity = "0";

    // Right chevron - first child (same as regular pages)
    topViewBlockContext.firstChild
      ? rightChevron.style.removeProperty("opacity")
      : (rightChevron.style.opacity = "0");
  } else {
    // Regular block/page navigation (existing logic)
    topViewBlockContext.hasPreviousSibling
      ? topChevron.style.removeProperty("opacity")
      : (topChevron.style.opacity = "0");

    // Remove double-chevron from top if not DNP
    if (topChevron.classList.contains("double-chevron")) {
      isAnimated
        ? setTimeout(() => topChevron.classList.remove("double-chevron"), 1000)
        : topChevron.classList.remove("double-chevron");
    }

    topViewBlockContext.firstChild
      ? rightChevron.style.removeProperty("opacity")
      : (rightChevron.style.opacity = "0");

    topViewBlockContext.nextBlock
      ? bottomChevron.style.removeProperty("opacity")
      : (bottomChevron.style.opacity = "0");

    if (topViewBlockContext.hasNextSibling) {
      if (bottomChevron.classList.contains("double-chevron")) {
        isAnimated
          ? setTimeout(
              () => bottomChevron.classList.remove("double-chevron"),
              1000
            )
          : bottomChevron.classList.remove("double-chevron");
      }
    } else {
      isAnimated
        ? setTimeout(() => bottomChevron.classList.add("double-chevron"), 1000)
        : bottomChevron.classList.add("double-chevron");
    }

    !topViewBlockContext.isPage
      ? leftChevron.style.removeProperty("opacity")
      : (leftChevron.style.opacity = "0");
  }
}

function addChevronsListener() {
  let directions = ["top", "right", "bottom", "left"];
  directions.forEach((direction) => {
    let chevron = document.querySelector(`.${direction}-chevron`);
    chevron.addEventListener("click", async (event) => {
      await navigateToBlock(direction, event);
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
  }, 1000);
}

export function removeChevrons() {
  let chevrons = document.querySelector(".chevrons");
  if (chevrons) {
    chevrons.remove();
  }
  // Clean up global keyboard event listeners
  removeGlobalKeyboardListeners();
}

export async function navigateToBlock(direction, event = null) {
  try {
    if (!navMode.isOn) await updateNavigation();

    // Update modifiers from event if provided
    if (event) {
      updateKeyboardModifiers(event);
    }

    let targetUid;

    // Handle DNP navigation
    if (topViewBlockContext.isDNP) {
      switch (direction) {
        case "top":
        case "bottom": {
          const navDirection = direction === "top" ? "backward" : "forward";
          const targetInfo = getTargetDNPWithModifiers(
            topViewBlockContext.uid,
            navDirection
          );

          // Check if this is a click on next day when current page is today
          const isToday = topViewBlockContext.uid === getTodayDNPUid();
          const isNextDayFromToday =
            navDirection === "forward" &&
            !keyboardModifiers.shift &&
            !keyboardModifiers.ctrl &&
            !keyboardModifiers.alt &&
            isToday;

          // Special case: if we're on today and there's no tomorrow, use tomorrow's uid
          let actualTargetUid = targetInfo.uid;
          if (isNextDayFromToday && !targetInfo.uid) {
            actualTargetUid = getNextDayUid(topViewBlockContext.uid);
          }

          // Determine if we should allow creation for this target
          const shouldAllowCreation =
            keyboardModifiers.shift ||
            keyboardModifiers.ctrl ||
            keyboardModifiers.alt ||
            isNextDayFromToday;

          // If the target doesn't exist
          if (!targetInfo.exists && actualTargetUid) {
            // Check if this is a second click on the same non-existent DNP (within 3 seconds)
            const now = Date.now();
            const isSameTarget =
              lastNonExistentDNPClick.uid === actualTargetUid &&
              lastNonExistentDNPClick.direction === navDirection;
            const isRecentClick =
              now - lastNonExistentDNPClick.timestamp < 3000;

            if (isSameTarget && isRecentClick && shouldAllowCreation) {
              // Second click: create and open the page
              try {
                const pageTitle = dnpUidToPageTitle(actualTargetUid);
                console.log(`Creating daily note page: ${pageTitle}`);
                await createPage(pageTitle);

                // Show toaster notification
                AppToaster.show({
                  message: `Created Daily Note: ${pageTitle}`,
                  intent: Intent.SUCCESS,
                  timeout: 3000,
                });

                openPage(actualTargetUid);

                // Reset the click tracker
                lastNonExistentDNPClick = {
                  uid: null,
                  timestamp: 0,
                  direction: null,
                };

                // Update navigation context after page creation
                setTimeout(async () => {
                  await updateNavigation();
                }, 100);

                return;
              } catch (error) {
                console.error("Failed to create daily note page:", error);
                AppToaster.show({
                  message: `Failed to create page: ${error.message}`,
                  intent: Intent.DANGER,
                  timeout: 5000,
                });
                return;
              }
            } else {
              // First click: track it and show message (don't navigate)
              lastNonExistentDNPClick = {
                uid: actualTargetUid,
                timestamp: now,
                direction: navDirection,
              };
              console.log(
                `First click on non-existent DNP. Click again to create: ${dnpUidToPageTitle(
                  actualTargetUid
                )}`
              );

              // Show toaster notification for first click
              if (shouldAllowCreation) {
                const pageTitle = dnpUidToPageTitle(actualTargetUid);
                const hasModifier = keyboardModifiers.shift || keyboardModifiers.ctrl || keyboardModifiers.alt;
                const modifierText = hasModifier ? " while pressing the same modifier key" : "";
                AppToaster.show({
                  message: `Click again${modifierText} to create: ${pageTitle}`,
                  intent: Intent.PRIMARY,
                  timeout: 3000,
                });
              }

              return; // Don't navigate on first click
            }
          }

          targetUid = targetInfo.uid;
          break;
        }
        case "right":
          targetUid = topViewBlockContext.firstChild;
          break;
        case "left":
          // DNP pages don't have parent navigation
          targetUid = null;
          break;
      }
    } else {
      // Regular block navigation
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
    }

    if (targetUid) {
      if (navMode.isOn)
        animChevron(document.querySelector(`.${direction}-chevron`), direction);
      window.roamAlphaAPI.ui.mainWindow.openBlock({
        block: { uid: targetUid },
      });

      // Update navigation context after navigation completes
      // Use a small delay to ensure Roam has finished rendering the new block
      setTimeout(async () => {
        await updateNavigation();
      }, 100);
    }
  } catch (error) {
    console.error("Failed to navigate to block:", error);
  }
}

// BlockContext cache to improve performance
const blockContextCache = new Map();
const CACHE_MAX_SIZE = 50; // Limit cache size to prevent memory issues
const CACHE_TTL = 5000; // Time to live: 5 seconds

function getCachedBlockContext(uid) {
  const cached = blockContextCache.get(uid);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.context;
  }
  return null;
}

function setCachedBlockContext(uid, context) {
  // Clear old cache entries if size exceeds limit
  if (blockContextCache.size >= CACHE_MAX_SIZE) {
    const firstKey = blockContextCache.keys().next().value;
    blockContextCache.delete(firstKey);
  }
  blockContextCache.set(uid, {
    context: context,
    timestamp: Date.now(),
  });
}

export class BlockContext {
  constructor(uid) {
    // Check cache first for performance
    const cached = getCachedBlockContext(uid);
    if (cached) {
      Object.assign(this, cached);
      return;
    }

    this.uid = uid;
    this.parent = getParentUID(uid);
    this.firstChild = getFirstChildUid(uid);
    let thisBlock = getSiblingsAndOrder(uid, this.parent);
    this.siblings = thisBlock.siblings;
    //console.log(this.siblings);
    this.isPage = !this.siblings ? true : false;
    this.isDNP = this.isPage ? isCurrentPageDNP(uid) : false;
    this.order = thisBlock.order;
    this.hasNextSibling =
      !this.isPage && this.order + 1 < this.siblings.length ? true : false;
    this.nextBlock = this.isPage ? null : this.getNextSibling();
    this.hasPreviousSibling =
      !this.isPage && this.order - 1 >= 0 ? true : false;

    // Cache this instance
    setCachedBlockContext(uid, this);
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

// Export function to clear cache when needed
export function clearBlockContextCache() {
  blockContextCache.clear();
}
