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

export function reduceToFixedValue(value, min, fixedTo) {
  return value < min + 0.01 ? min : value.toFixed(fixedTo);
}
