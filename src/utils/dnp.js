export const dnpUidRegex =
  /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-(19|20)[0-9][0-9]$/;

// Convert a date to DNP uid format (mm-dd-yyyy)
export function dateToUid(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
}

// Convert DNP uid to Date object
export function uidToDate(uid) {
  if (!uid) return null;
  const [month, day, year] = uid.split('-').map(num => parseInt(num, 10));
  return new Date(year, month - 1, day);
}

// Get the next day's uid
export function getNextDayUid(uid) {
  if (!uid) return null;
  const date = uidToDate(uid);
  const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  return dateToUid(nextDay);
}

// Get the previous day's uid
export function getPreviousDayUid(uid) {
  if (!uid) return null;
  const date = uidToDate(uid);
  const previousDay = new Date(date.getTime() - 24 * 60 * 60 * 1000);
  return dateToUid(previousDay);
}

// Find the nearest existing DNP in a given direction
// direction: 1 for forward, -1 for backward
// maxDays: maximum number of days to search (default 365)
export function findNearestExistingDNP(startUid, direction = 1, maxDays = 365, isExistingFn) {
  let currentUid = startUid;

  for (let i = 0; i < maxDays; i++) {
    if (direction === 1) {
      currentUid = getNextDayUid(currentUid);
    } else {
      currentUid = getPreviousDayUid(currentUid);
    }

    if (isExistingFn(currentUid)) {
      return currentUid;
    }
  }

  return null; // No existing DNP found within maxDays
}

// Get the next existing DNP
export function getNextExistingDNP(uid, isExistingFn) {
  if (!uid) return null;
  const nextDayUid = getNextDayUid(uid);
  if (isExistingFn(nextDayUid)) {
    return nextDayUid;
  }
  return findNearestExistingDNP(uid, 1, 365, isExistingFn);
}

// Get the previous existing DNP
export function getPreviousExistingDNP(uid, isExistingFn) {
  if (!uid) return null;
  const previousDayUid = getPreviousDayUid(uid);
  if (isExistingFn(previousDayUid)) {
    return previousDayUid;
  }
  return findNearestExistingDNP(uid, -1, 365, isExistingFn);
}

// Get DNP offset by a specific number of days
export function getDNPOffsetByDays(uid, days) {
  if (!uid) return null;
  const date = uidToDate(uid);
  const offsetDate = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  return dateToUid(offsetDate);
}

// Get DNP offset by a specific number of months (same day, different month)
export function getDNPOffsetByMonths(uid, months) {
  if (!uid) return null;
  const date = uidToDate(uid);
  const offsetDate = new Date(date);
  offsetDate.setMonth(date.getMonth() + months);

  // Handle cases where the target month has fewer days (e.g., Jan 31 -> Feb 28)
  // JavaScript automatically adjusts to the last day of the month
  if (offsetDate.getDate() !== date.getDate()) {
    offsetDate.setDate(0); // Set to last day of previous month
  }

  return dateToUid(offsetDate);
}

// Get DNP offset by a specific number of years (same day and month, different year)
export function getDNPOffsetByYears(uid, years) {
  if (!uid) return null;
  const date = uidToDate(uid);
  const offsetDate = new Date(date);
  offsetDate.setFullYear(date.getFullYear() + years);

  // Handle leap year edge case (Feb 29 -> Feb 28)
  if (offsetDate.getMonth() !== date.getMonth()) {
    offsetDate.setDate(0); // Set to last day of previous month (Feb 28)
  }

  return dateToUid(offsetDate);
}
