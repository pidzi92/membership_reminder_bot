# Membership Reminder Bot (Home Assistant Add-on)

Discord DM reminder bot for membership renewal, driven by a Google Sheet.

See **[DOCS.md](./DOCS.md)** for the full, step-by-step installation and
configuration guide (Discord bot setup, Google service account setup, add-on
install methods, the complete options reference, and troubleshooting).

Quick summary:
- Reads your Google Sheet (`Status članstva` in column E must equal
  "Aktivan" to be considered).
- Parses `Članarina plaćena do` (column H) as `DD/MM/YYYY`; non-date values
  are skipped.
- If expired, DMs the person via their Discord handle in column D.
- Notification timing, repeat interval, message text, and every column
  mapping are configurable from the add-on's Configuration tab.
