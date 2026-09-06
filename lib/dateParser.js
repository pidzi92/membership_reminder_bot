const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

/**
 * Attempts to strictly parse `value` using `format` (e.g. "DD/MM/YYYY").
 * Returns a dayjs object on success, or null if the value does not match
 * the expected format at all (per spec: if it can't be parsed, do nothing).
 */
function tryParseDate(value, format) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = dayjs(trimmed, format, true); // strict mode
  if (!parsed.isValid()) return null;
  return parsed;
}

module.exports = { tryParseDate };
