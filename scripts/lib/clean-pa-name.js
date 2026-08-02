// Generic cleanup applied to a raw MoEF protectedAreaName before attempting
// to split it into multiple parks -- strips boilerplate/junk that isn't part
// of the actual name so it doesn't get mistaken for a second park (a trailing
// ", <state name>" looks exactly like a comma-separated second PA otherwise).
import { INDIAN_STATE_AND_UT_NAMES } from './indian-states.js';

// Source notification text sometimes writes state names with "&" instead of
// "and" (e.g. "Andaman & Nicobar Islands"), so match either.
const STATE_SUFFIX_PATTERN = new RegExp(
  `,\\s*(?:in\\s+the\\s+(?:state|union\\s+territory|ut)\\s+of\\s+)?(${INDIAN_STATE_AND_UT_NAMES.map((s) => s.replace(/ and /g, ' (?:and|&) ').replace(/ /g, '\\s+')).join('|')})\\.?\\s*$`,
  'i',
);

// Some notifications' titles are "Amendment in the [Final/Draft] Notification
// of Eco-sensitive Zone around <PA name>" or "Amendment in the ESZ
// Notification around <PA name>" rather than just naming the PA -- upstream
// parsing sometimes leaves this boilerplate (or a bare leftover "around ",
// when only the "Eco Sensitive Zone" part got stripped) attached to the front
// of protectedAreaName instead of the PA name itself.
const LEADING_JUNK_PATTERN = /^(?:amendment\s+in\s+the\s+(?:final|draft)?\s*(?:notification\s+of\s+eco[-\s]?sensitive\s+zone|esz\s+notification)\s+)?(?:zone\s+)?around\s+/i;

export function cleanTrailingJunk(name) {
  let n = name.trim();
  n = n.replace(LEADING_JUNK_PATTERN, '');
  n = n.replace(/\s*ESZ\s*Notification\s*$/i, '');
  n = n.replace(STATE_SUFFIX_PATTERN, '');
  n = n.replace(/[,.\s]+$/, '');
  return n.trim();
}
