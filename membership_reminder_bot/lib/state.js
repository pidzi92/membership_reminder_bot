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

/**
 * Applies the "reset notifications" config options, if their token values
 * have changed since they were last applied. This is a one-shot mechanism:
 * as long as the configured token text stays the same across restarts, the
 * reset does NOT re-fire (so a crash-loop or HA reboot can't repeatedly wipe
 * real notification history). To trigger a reset again later, the user just
 * changes the token text to something new and restarts the add-on.
 *
 * Mutates `persisted` in place. Returns true if anything changed.
 */
function applyResets(persisted, { resetAllToken, resetHandlesToken }, normalizeHandle, logger) {
  persisted.__reset_markers__ = persisted.__reset_markers__ || { all: '', handles: '' };
  const markers = persisted.__reset_markers__;
  let changed = false;

  const allToken = String(resetAllToken || '').trim();
  if (allToken && allToken !== markers.all) {
    for (const key of Object.keys(persisted)) {
      if (key !== '__reset_markers__') delete persisted[key];
    }
    markers.all = allToken;
    changed = true;
    logger.info(`Reset ALL notification history (reset_all_notifications_token = "${allToken}")`);
  }

  const handlesToken = String(resetHandlesToken || '').trim();
  if (handlesToken && handlesToken !== markers.handles) {
    const targets = handlesToken
      .split(',')
      .map((h) => normalizeHandle(h))
      .filter(Boolean);
    let removed = 0;
    for (const key of Object.keys(persisted)) {
      if (key === '__reset_markers__') continue;
      const handlePart = key.split('|')[0];
      if (targets.includes(handlePart)) {
        delete persisted[key];
        removed++;
      }
    }
    markers.handles = handlesToken;
    changed = true;
    logger.info(
      `Reset notification history for handles [${targets.join(', ')}] (${removed} entrie(s) removed)`
    );
  }

  return changed;
}

module.exports = { load, save, keyFor, applyResets };
