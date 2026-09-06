const fs = require('fs');
const path = require('path');

const STATE_PATH = process.env.STATE_PATH || '/data/notification_state.json';

function load() {
  try {
    if (!fs.existsSync(STATE_PATH)) return {};
    const raw = fs.readFileSync(STATE_PATH, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (err) {
    console.error(`[state] Failed to read state file, starting fresh: ${err.message}`);
    return {};
  }
}

function save(state) {
  try {
    const dir = path.dirname(STATE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmpPath = `${STATE_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmpPath, STATE_PATH); // atomic on same filesystem
  } catch (err) {
    console.error(`[state] Failed to persist state file: ${err.message}`);
  }
}

/**
 * Builds a stable key per member+due-date+kind so that:
 *  - renewing (changing the paid-until date) naturally resets the reminder
 *  - "pre" (upcoming) and "expired" reminders are tracked independently
 */
function keyFor(handle, paidUntilISO, kind) {
  return `${handle}|${paidUntilISO}|${kind}`;
}

module.exports = { load, save, keyFor };
