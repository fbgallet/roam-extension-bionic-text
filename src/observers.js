import { bionicMode, isOn, readOnlyMode, selectOnClickMode } from ".";
import {
  applyModesToSelection,
  cleanBlue,
  navigateToBlock,
  openNextSibblingBlock,
} from "./modes";

export var runners = {
  observers: [],
};
export var refs = [];
export var counters = [];

export function connectObservers(logPage = null) {
  addObserver(
    document.getElementsByClassName("roam-app")[0],
    onMutationOnMainPage,
    {
      childList: true,
      subtree: true,
    },
    "tags"
  );
  addObserver(
    document.getElementById("right-sidebar"),
    onSidebarOpen,
    {
      childList: true,
      subtree: false,
    },
    "sidebar"
  );
  if (logPage) {
    addObserver(
      document.getElementsByClassName("roam-log-container")[0],
      onNewPageInDailyLog,
      {
        childList: true,
        subtree: false,
      },
      "logs"
    );
  }
}

export function addObserver(element, callback, options, name) {
  let myObserver = new MutationObserver(callback);
  myObserver.observe(element, options);

  runners[name] = [myObserver];
}

export function disconnectAllObservers() {
  disconnectObserver("tags");
  disconnectObserver("sidebar");
  disconnectObserver("logs");
}

function disconnectObserver(name) {
  if (runners[name])
    for (let index = 0; index < runners[name].length; index++) {
      const element = runners[name][index];
      element.disconnect();
    }
}

function onSidebarOpen(mutation) {
  setTimeout(() => {
    for (let i = 0; i < mutation.length; i++) {
      if (mutation[i].addedNodes.length > 0) {
        if (
          mutation[i].addedNodes[0].className != "rm-resize-handle" &&
          mutation[i].addedNodes[0].id === "roam-right-sidebar-content" &&
          mutation[i].addedNodes[0].innerText !=
            "Shift-click bidirectional links, blocks, or block references to open them here."
        ) {
          let txtElts = mutation[i].target.querySelectorAll(".rm-block-text");
          applyModesToSelection(txtElts);
          console.log("Sidebar opened");
          return;
        }
      }
    }
  }, 50);
}

function onNewPageInDailyLog(mutation) {
  setTimeout(() => {
    applyModesToSelection();
  }, 50);
}

function onMutationOnMainPage(mutation) {
  let txtElts;
  //console.log(mutation);
  if (readOnlyMode.isOn || bionicMode.isOn) {
    if (
      (mutation[0].target.closest(".roam-sidebar-container") &&
        mutation[0].target.className === "ref-count-extension") ||
      // mutations in code block
      mutation[0].target.className.includes("cm-")
    )
      return;
    //console.log(mutation);
    for (let i = 0; i < mutation.length; i++) {
      if (
        mutation[i].addedNodes.length > 0 &&
        mutation[i].target.localName != "span" &&
        mutation[i].target.localName != "textarea"
      ) {
        if (mutation[0].addedNodes[0]?.classList?.contains("rm-block")) {
          console.log("blocks expanded");
          //console.log(mutation);
          txtElts = mutation[i].target.querySelectorAll(".rm-block-text");
          applyModesToSelection(txtElts);
          return;
        } else if (
          mutation[i].addedNodes[0]?.classList?.contains("rm-block__input")
        ) {
          console.log("block updated!");
          txtElts = mutation[i].target.querySelectorAll(".rm-block-text");
          applyModesToSelection(txtElts);
          //return;
        } else if (
          mutation[i].addedNodes[0]?.classList?.contains("rm-mentions") ||
          mutation[i].addedNodes[0]?.parentElement?.className ===
            "rm-ref-page-view"
        ) {
          console.log("In Linked refs");
          txtElts = mutation[i].target.querySelectorAll(".rm-block-text");
          applyModesToSelection(txtElts);
        } else if (
          mutation[i].addedNodes[0]?.parentElement?.className ===
          "sidebar-content"
        ) {
          console.log("In right sidebar");
          applyModesToSelection(mutation[i].addedNodes[0]);
          return;
        } else if (mutation[i].target.className === "rm-sidebar-window") {
          txtElts = mutation[i].target.querySelectorAll(".rm-block-text");
          applyModesToSelection(txtElts);
          return;
        } else if (
          mutation.length == 2 &&
          i == 1 &&
          mutation[0].removedNodes?.length > 0
        ) {
          console.log("Checked or unchecked");
          applyModesToSelection([mutation[1].addedNodes[0]]);
        }
      }
    }
  }
}

export function onKeydown(e) {
  if (selectOnClickMode.isOn) {
    if (e.key === "Escape" || e.keyCode === 27) {
      cleanBlue();
    }
    if (
      (e.ctrlKey || e.cmdKey) &&
      e.key === "c" &&
      document.querySelector(".block-highlight-blue")
    ) {
      let highlighted = Array.from(
        document.querySelectorAll(".block-highlight-blue")
      );
      if (highlighted.length > 1)
        highlighted = highlighted.filter((h) =>
          h.classList.contains("roam-block-container")
        );
      let highlightedText = highlighted.reduce(
        (concatened, text) =>
          concatened + text.querySelector(".rm-block-text").innerText + "\n",
        ""
      );
      // console.log(highlightedText);
      navigator.clipboard.writeText(highlightedText.slice(0, -1));
    }
  }
  //if (navMode.isOn) {
  if (e.ctrlKey || e.cmdKey) {
    switch (e.key) {
      case "ArrowLeft":
        navigateToBlock("left");
        break;
      case "ArrowRight":
        navigateToBlock("right");
        break;
      case "ArrowUp":
        navigateToBlock("top");
        break;
      case "ArrowDown":
        navigateToBlock("bottom");
        break;
    }
  }
  //}
}
