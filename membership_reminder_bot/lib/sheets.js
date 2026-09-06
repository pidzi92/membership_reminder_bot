const { google } = require('googleapis');

/**
 * Creates an authenticated Sheets API client from a service-account JSON
 * key file, and returns a function to fetch the configured range as a
 * 2D array of stringified, display-formatted cell values.
 */
function createSheetsReader({ keyFilePath, spreadsheetId, range }) {
  const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  async function fetchRows() {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      // FORMATTED_VALUE returns cells exactly as displayed in the sheet
      // (e.g. "01/09/2026"), matching what a human configured as the cell format.
      valueRenderOption: 'FORMATTED_VALUE',
    });
    return res.data.values || [];
  }

  return { fetchRows };
}

module.exports = { createSheetsReader };
