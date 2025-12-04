import { dnpUidRegex } from "./dnp";

export function getFirstLevelOfChildrenOrdered(uid) {
  if (uid) {
    let result = window.roamAlphaAPI.pull(
      "[{:block/children [:block/uid :block/order]}]",
      [":block/uid", uid]
    );
    if (result)
      return result[":block/children"]
        .map((b) => {
          return { uid: b[":block/uid"], order: b[":block/order"] };
        })
        .sort((a, b) => a.order - b.order);
  }
  return null;
}

export function getFirstChildUid(uid) {
  let children = getFirstLevelOfChildrenOrdered(uid);
  if (children) return children[0].uid;
  else return null;
}

export function getSiblingsAndOrder(uid, parent) {
  if (parent === undefined) parent = getParentUID(uid);
  let children = null;
  let thisOrder = 0;
  if (parent) {
    children = getFirstLevelOfChildrenOrdered(parent);
    thisOrder = children.filter((block) => block.uid === uid)[0].order;
  }
  return {
    parent: parent,
    siblings: children,
    order: thisOrder,
  };
}

export function getChildrenTree(uid) {
  if (uid) {
    let result = window.roamAlphaAPI.q(`[:find (pull ?page
      [:block/uid :block/string :block/children :block/order 
         {:block/children ...} ])
       :where [?page :block/uid "${uid}"]  ]`);
    if (result.length > 0) return result[0][0].children;
  }
  return null;
}

export function getParentUID(uid) {
  let q = `[:find ?u 
            :where [?p :block/uid ?u] 
            	[?p :block/children ?e]
            	[?e :block/uid "${uid}"]]`;
  let result = window.roamAlphaAPI.q(q);
  if (result.length > 0) return result[0][0];
  else return null;
}

export const isCurrentPageDNP = async (pageUid) => {
  return dnpUidRegex.test(pageUid);
};

export function isExisting(uid) {
  let result = window.roamAlphaAPI.pull("[:block/uid]", [":block/uid", uid]);
  if (result) return true;
  return false;
}

export function reduceToFixedValue(value, min, fixedTo) {
  return value < min + 0.01 ? min : value.toFixed(fixedTo);
}

export const getYesterdayDate = (date = null) => {
  if (!date) date = new Date();
  return new Date(date.getTime() - 24 * 60 * 60 * 1000);
};

// Convert DNP uid (mm-dd-yyyy) to Roam page title
export const dnpUidToPageTitle = (dnpUid) => {
  const dateArray = dnpUid.split("-");
  const year = parseInt(dateArray[2]);
  const month = parseInt(dateArray[0]) - 1; // Months are indexed from 0 to 11 in JavaScript
  const day = parseInt(dateArray[1]);
  const date = new Date(year, month, day);

  return window.roamAlphaAPI.util.dateToPageTitle(date);
};

// Create a new page with the given title
export const createPage = async (pageTitle) => {
  return await window.roamAlphaAPI.data.page.create({
    page: { title: pageTitle },
  });
};

// Open a page by its uid
export const openPage = (uid) => {
  window.roamAlphaAPI.ui.mainWindow.openPage({ page: { uid: uid } });
};

// Get today's DNP uid in mm-dd-yyyy format
export const getTodayDNPUid = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const year = today.getFullYear();
  return `${month}-${day}-${year}`;
};
