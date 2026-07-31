// Generic cleanup applied to a raw MoEF protectedAreaName before attempting
// to split it into multiple parks -- strips boilerplate/junk that isn't part
// of the actual name so it doesn't get mistaken for a second park (a trailing
// ", <state name>" looks exactly like a comma-separated second PA otherwise).
import { INDIAN_STATE_AND_UT_NAMES } from './indian-states.js';

// Source notification text sometimes writes state names with "&" instead of
// "and" (e.g. "Andaman & Nicobar Islands"), so match either.
const STATE_SUFFIX_PATTERN = new RegExp(
  `,\\s*(${INDIAN_STATE_AND_UT_NAMES.map((s) => s.replace(/ and /g, ' (?:and|&) ').replace(/ /g, '\\s+')).join('|')})\\.?\\s*$`,
  'i',
);

export function cleanTrailingJunk(name) {
  let n = name.trim();
  n = n.replace(/^zone\s+around\s+/i, '');
  n = n.replace(/\s*ESZ\s*Notification\s*$/i, '');
  n = n.replace(STATE_SUFFIX_PATTERN, '');
  n = n.replace(/[,.\s]+$/, '');
  return n.trim();
}
