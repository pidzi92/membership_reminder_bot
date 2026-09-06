# Membership Reminder Bot — Installation & Usage Guide

A Home Assistant add-on that reads your membership Google Sheet and sends a
Discord DM to any **active** member whose **membership payment has expired**
(and optionally, a heads-up a few days *before* it expires).

It is fully configurable from the Home Assistant add-on **Configuration** tab
— no code editing required.

---

## 1. What you need before you start

1. A Home Assistant installation with **Supervisor** (Home Assistant OS,
   Supervised, or the Home Assistant VM/Generic image). Container-only /
   Core installs do **not** support add-ons.
2. Access to the HA host's filesystem — either the **Samba share** add-on,
   the **Terminal & SSH** add-on, or the **File editor** add-on.
3. A Discord account with permission to create applications in the
   [Discord Developer Portal](https://discord.com/developers/applications).
4. A Google account to create a Google Cloud service account.
5. Your Google Sheet (the one you uploaded — `Članovi_2_0.xlsx` structure is
   assumed) shared as a **Google Sheet**, not a local Excel file, since the
   bot reads it live via the Sheets API.

---

## 2. Create the Discord bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
   → **New Application** → give it a name (e.g. "Membership Reminder").
2. Open the **Bot** tab → **Reset Token** (or **Add Bot**) → copy the token.
   This is your `discord_bot_token`. Keep it secret.
3. On the same **Bot** tab, scroll to **Privileged Gateway Intents** and
   enable **SERVER MEMBERS INTENT**. This is required — without it the bot
   cannot look up members by their handle. Save changes.
4. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`
   - Bot permissions: none are strictly required to send DMs, but tick
     **View Channels** and **Send Messages** if you plan to use the optional
     admin notification channel.
   - Copy the generated URL, open it in your browser, and invite the bot to
     your Discord server (the one your members are in).
5. Get your **Server ID** (`discord_guild_id`): in Discord, enable
   **Settings → Advanced → Developer Mode**, then right-click your server
   icon → **Copy Server ID**.

> **Note on "Discord handle":** the bot matches column D against each
> member's current Discord **username** (the `@handle`, not their display
> name/nickname). Make sure column D contains the exact username, without
> the leading `@`.

---

## 3. Create the Google service account

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or reuse one) → **APIs & Services → Library** →
   search **Google Sheets API** → **Enable**.
3. **APIs & Services → Credentials → Create Credentials → Service account**.
   Give it any name, no roles are needed, click **Done**.
4. Open the new service account → **Keys** tab → **Add Key → Create new key
   → JSON**. This downloads a `.json` file — this is your
   `service-account.json`.
5. Open your Google Sheet → **Share** → paste the service account's email
   address (looks like `something@your-project.iam.gserviceaccount.com`,
   found inside the JSON file as `client_email`) → give it **Viewer**
   access → Send.
6. Copy the **Spreadsheet ID** from the sheet's URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_PART_IS_THE_ID`**`/edit`.

---

## 4. Upload the service account file to Home Assistant

The add-on reads the JSON key from `/share`, which is a persistent folder
accessible from both the host and the add-on.

1. Open the **Samba share** or **File editor** add-on.
2. Create the folder `share/membership_reminder_bot/` if it doesn't exist.
3. Copy your downloaded key into it as:
   `share/membership_reminder_bot/service-account.json`
4. This matches the default option `google_service_account_json_path:
   /share/membership_reminder_bot/service-account.json`. Change the option
   if you'd rather use a different path/filename.

---

## 5. Install the add-on

### Option A — Local add-on (simplest, no repo needed)

1. Enable the **Samba share** or **SSH & Terminal** add-on.
2. Copy this whole `membership_reminder_bot` folder into
   `/addons/local/membership_reminder_bot/` on the Home Assistant host
   (create the `local` folder if it's not there yet).
3. In Home Assistant: **Settings → Add-ons → Add-on Store** → click the
   **⋮** menu (top right) → **Check for updates** (or reload the page).
4. Scroll down to **Local add-ons** → you'll see **Membership Reminder
   Bot** → click it → **Install**.

### Option B — Your own add-on repository (for updates via Git)

1. Push this folder to a GitHub repository (it can be private).
2. In Home Assistant: **Settings → Add-ons → Add-on Store → ⋮ → Repositories**
   → paste your repo URL → **Add**.
3. The add-on will appear in the store list → **Install**.

Installation builds the Docker image the first time, which can take a few
minutes on slower hardware (e.g. Raspberry Pi).

---

## 6. Configure the add-on

Go to the add-on's **Configuration** tab. Every option below is editable
through the UI — no YAML editing needed.

| Option | Default | What it does                                                                                                                              |
|---|---|-------------------------------------------------------------------------------------------------------------------------------------------|
| `discord_bot_token` | — | Your bot token from step 2 (stored as a password field).                                                                                  |
| `discord_guild_id` | — | The Discord server ID your members are in.                                                                                                |
| `google_sheet_id` | — | The spreadsheet ID from step 3.                                                                                                           |
| `google_sheet_range` | `Članovi!A:L` | Sheet name + column range to read. Change the sheet name if yours differs.                                                                |
| `google_service_account_json_path` | `/share/membership_reminder_bot/service-account.json` | Where the bot looks for the credentials file.                                                                                             |
| `header_row` | `1` | Number of header rows to skip at the top of the sheet.                                                                                    |
| `name_column` | `B` | Column with the member's display name (used in messages).                                                                                 |
| `discord_handle_column` | `D` | Column with the Discord username.                                                                                                         |
| `status_column` | `E` | Column with membership status.                                                                                                            |
| `status_active_value` | `Aktivan` | The value in `status_column` that means "active" (case-insensitive).                                                                      |
| `paid_until_column` | `H` | Column with the "paid until" date.                                                                                                        |
| `date_format` | `DD/MM/YYYY` | Expected date format in `paid_until_column`. Rows that don't match this format exactly are skipped (no notification, no error).           |
| `timezone` | `Europe/Belgrade` | Timezone used to determine "today" when comparing dates.                                                                                  |
| `check_interval_minutes` | `60` | How often the bot re-reads the sheet and re-evaluates everyone.                                                                           |
| `notify_days_before_expiry` | `3` | Send an early heads-up this many days before the due date. Set to `0` to disable early reminders entirely.                                |
| `reminder_repeat_days` | `3` | Once someone is expired, how often (in days) to re-send the DM until they renew.                                                          |
| `expired_message_template` | see config | Message sent once the due date has passed. Placeholders: `{name}`, `{handle}`, `{date}`, `{days}`.                                        |
| `pre_expiry_message_template` | see config | Message sent for the early heads-up. Same placeholders.                                                                                   |
| `admin_notify_channel_id` | *(empty)* | Optional text channel ID where the bot posts a warning if a member's Discord handle can't be found in the server. Leave empty to disable. |
| `dry_run` | `false` | If `true`, the bot logs what it *would* send instead of actually DMing anyone — use this to test your setup safely.                       |
| `log_level` | `info` | `debug`, `info`, `warning`, or `error`.                                                                                                   |
| `reset_all_notifications_token` | *(empty)* | Type **any** text here and restart to wipe **all** notification history once. See "Resetting notification history" below.                 |
| `reset_notification_handles` | *(empty)* | Comma-separated Discord handles (e.g. `pidzi123, pidzi456`) whose notification history should be wiped once. See below.                   |

After filling these in, click **Save**, then go to the **Info** tab and
**Start** the add-on. Turn on **Start on boot** and **Watchdog** if you want
it to run automatically and restart on failure.

---

## 7. How the logic works (matching your sheet)

For every data row (after `header_row`):

1. Read `status_column` (**E**). If it does **not** equal
   `status_active_value` ("Aktivan"), the row is skipped entirely.
2. Read `paid_until_column` (**H**) and try to parse it strictly as
   `date_format` (**DD/MM/YYYY**). If it doesn't match that format — e.g. it
   says `Osnivač` or `DM`, as in your sample sheet — the row is skipped, no
   notification is sent, no error is logged.
3. If the date parses:
   - If it's **in the past** → the membership is expired → a DM is sent
     using `expired_message_template`, to the person found via
     `discord_handle_column` (**D**). While still expired, this repeats
     every `reminder_repeat_days` days.
   - If it's in the future but within `notify_days_before_expiry` days →
     a heads-up DM is sent once, using `pre_expiry_message_template`.
   - Otherwise nothing happens.

The bot remembers who it already notified (and for which due date) in a
small state file at `/data/notification_state.json`, which HA persists
across add-on restarts and updates. **Renewing** someone's membership (i.e.
changing the date in column H) automatically resets their reminder history,
since the state is keyed by the due date itself.

---

## 8. Testing it safely

1. Set `dry_run: true` and `log_level: debug`, save, and (re)start the
   add-on.
2. Open the **Log** tab. You should see a line per active member with a
   parseable date, and `[dry-run] Would DM ...` lines for anyone who should
   be notified.
3. Once you're happy with the message wording and timing, set `dry_run:
   false` and restart.

---

## 9. Resetting notification history

Useful when testing, or if you want to force a fresh reminder cycle without
waiting for `reminder_repeat_days` to elapse.

These are **one-shot token fields**, not simple on/off switches — this is
deliberate, so a crash, update, or HA reboot can never silently re-wipe your
real data just because a checkbox got left on.

**Reset everyone:**
1. Configuration tab → `reset_all_notifications_token` → type any text (e.g.
   `reset-1`, or today's date) → Save → Restart.
2. The log will show `Reset ALL notification history (...)`.
3. To do it again later, change the text to something different (e.g.
   `reset-2`) and restart — the same text won't re-trigger it twice.
4. When you're done testing, you can leave the field as-is; it will not fire
   again unless you change it.

**Reset specific members only:**
1. `reset_notification_handles` → enter a comma-separated list of Discord
   handles, e.g. `pidzi123, pidzi456` → Save → Restart.
2. Only those members' history is cleared; everyone else is untouched.
3. Same one-shot behavior: change the text to fire it again later.

Either reset makes the bot treat the affected member(s) as never-notified,
so the very next check cycle will re-send a reminder to anyone among them
who is currently expired (or within the pre-expiry window).

---

## 10. Troubleshooting

- **"Google service account file not found..."** — Double-check the file
  was uploaded to exactly the path in `google_service_account_json_path`
  (case-sensitive), and that you restarted the add-on after uploading.
- **`Failed to read Google Sheet: ... 403 ...`** — The sheet hasn't been
  shared with the service account's `client_email`, or the Sheets API isn't
  enabled on the Google Cloud project.
- **`Discord user not found in server for handle "..."`** — The value in
  column D doesn't exactly match that person's current Discord username, or
  they're not a member of the configured server. Discord usernames are
  case-insensitive but must otherwise match exactly (no `@`).
- **No DMs arrive but no errors either** — The recipient may have "Allow
  direct messages from server members" turned off in their Discord privacy
  settings; Discord silently blocks bot DMs in that case (check the log for
  a "Failed to DM ..." warning).
- **Dates are silently skipped** — Confirm `date_format` matches exactly
  what's typed in column H (e.g. `01/09/2026`), and that the cell isn't a
  native Google Sheets date type formatted differently — this bot reads the
  sheet's **displayed text**, so whatever format you see in the cell is what
  must match `date_format`.

---

## 11. Updating the sheet columns

If your real spreadsheet's column letters differ from `Članovi_2_0.xlsx`
(e.g. you insert a column), just update `name_column`, `discord_handle_column`,
`status_column`, and `paid_until_column` in the Configuration tab — no code
changes needed.
