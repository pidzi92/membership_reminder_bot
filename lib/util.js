/**
 * Converts a spreadsheet column letter (A, B, ..., Z, AA, AB, ...) into a
 * zero-based array index.
 *   columnLetterToIndex('A') -> 0
 *   columnLetterToIndex('E') -> 4
 *   columnLetterToIndex('H') -> 7
 */
function columnLetterToIndex(letter) {
  if (!letter || typeof letter !== 'string') {
    throw new Error(`Invalid column letter: ${letter}`);
  }
  const clean = letter.trim().toUpperCase();
  let index = 0;
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i) - 64; // 'A' -> 1
    if (charCode < 1 || charCode > 26) {
      throw new Error(`Invalid column letter: ${letter}`);
    }
    index = index * 26 + charCode;
  }
  return index - 1;
}

/** Safely reads a cell from a row array by column letter, trimmed to a string. */
function getCell(row, columnLetter) {
  const idx = columnLetterToIndex(columnLetter);
  const value = row[idx];
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

/** Normalizes a Discord handle: strips a leading '@' and lowercases it. */
function normalizeHandle(handle) {
  return String(handle || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();
}

module.exports = { columnLetterToIndex, getCell, normalizeHandle };
