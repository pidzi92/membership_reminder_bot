const dayjs = require('dayjs');
require('dayjs/plugin/customParseFormat');

const { createSheetsReader } = require('./lib/sheets');
const { tryParseDate } = require('./lib/dateParser');
const { getCell, normalizeHandle } = require('./lib/util');
const { render } = require('./lib/messageTemplate');
const state = require('./lib/state');
const {
  createDiscordClient,
  findMemberByHandle,
  sendDirectMessage,
  notifyAdminChannel,
} = require('./lib/discordNotifier');

// ---------------------------------------------------------------------------
// Configuration (populated by run.sh from the Home Assistant add-on options)
// ---------------------------------------------------------------------------
const config = {
  discordBotToken: required('DISCORD_BOT_TOKEN'),
  discordGuildId: required('DISCORD_GUILD_ID'),
  googleSheetId: required('GOOGLE_SHEET_ID'),
  googleSheetRange: process.env.GOOGLE_SHEET_RANGE || 'Članovi!A:L',
  googleServiceAccountJsonPath: required('GOOGLE_SERVICE_ACCOUNT_JSON_PATH'),
  headerRow: parseInt(process.env.HEADER_ROW || '1', 10),
  nameColumn: process.env.NAME_COLUMN || 'B',
  discordHandleColumn: process.env.DISCORD_HANDLE_COLUMN || 'D',
  statusColumn: process.env.STATUS_COLUMN || 'E',
  statusActiveValue: (process.env.STATUS_ACTIVE_VALUE || 'Aktivan').toLowerCase(),
  paidUntilColumn: process.env.PAID_UNTIL_COLUMN || 'H',
  dateFormat: process.env.DATE_FORMAT || 'DD/MM/YYYY',
  timezone: process.env.TIMEZONE || 'Europe/Belgrade',
  checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES || '60', 10),
  notifyDaysBeforeExpiry: parseInt(process.env.NOTIFY_DAYS_BEFORE_EXPIRY || '0', 10),
  reminderRepeatDays: parseInt(process.env.REMINDER_REPEAT_DAYS || '3', 10),
  expiredMessageTemplate:
    process.env.EXPIRED_MESSAGE_TEMPLATE ||
    'Ćao {name}! Tvoja članarina je istekla {date}. Molimo te da je obnoviš.',
  preExpiryMessageTemplate:
    process.env.PRE_EXPIRY_MESSAGE_TEMPLATE ||
    'Ćao {name}! Podsetnik: tvoja članarina ističe {date} (za {days} dana).',
  adminNotifyChannelId: process.env.ADMIN_NOTIFY_CHANNEL_ID || '',
  dryRun: String(process.env.DRY_RUN).toLowerCase() === 'true',
  logLevel: (process.env.LOG_LEVEL || 'info').toLowerCase(),
};

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[config] Missing required option: ${name}. Set it in the add-on Configuration tab.`);
    process.exit(1);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Minimal leveled logger
// ---------------------------------------------------------------------------
const LEVELS = { debug: 0, info: 1, warning: 2, error: 3 };
const logger = {
  debug: (msg) => LEVELS[config.logLevel] <= LEVELS.debug && console.log(`[debug] ${msg}`),
  info: (msg) => LEVELS[config.logLevel] <= LEVELS.info && console.log(`[info] ${msg}`),
  warn: (msg) => LEVELS[config.logLevel] <= LEVELS.warning && console.warn(`[warning] ${msg}`),
  error: (msg) => console.error(`[error] ${msg}`),
};

// ---------------------------------------------------------------------------
// Google Sheets reader
// ---------------------------------------------------------------------------
const sheetsReader = createSheetsReader({
  keyFilePath: config.googleServiceAccountJsonPath,
  spreadsheetId: config.googleSheetId,
  range: config.googleSheetRange,
});

// ---------------------------------------------------------------------------
// Discord client
// ---------------------------------------------------------------------------
const client = createDiscordClient();

async function runCheck() {
  logger.info('Running membership check...');
  let rows;
  try {
    rows = await sheetsReader.fetchRows();
  } catch (err) {
    logger.error(`Failed to read Google Sheet: ${err.message}`);
    return;
  }

  const guild = await client.guilds.fetch(config.discordGuildId).catch((err) => {
    logger.error(`Failed to fetch Discord guild ${config.discordGuildId}: ${err.message}`);
    return null;
  });
  if (!guild) return;

  const persisted = state.load();
  const now = dayjs().tz ? dayjs().tz(config.timezone) : dayjs();
  let checked = 0;
  let notified = 0;

  const dataRows = rows.slice(config.headerRow); // skip header row(s)

  for (const row of dataRows) {
    try {
      const status = getCell(row, config.statusColumn).toLowerCase();
      if (status !== config.statusActiveValue) continue; // not "Aktivan" -> skip

      const handleRaw = getCell(row, config.discordHandleColumn);
      const handle = normalizeHandle(handleRaw);
      if (!handle) continue;

      const paidUntilRaw = getCell(row, config.paidUntilColumn);
      const paidUntil = tryParseDate(paidUntilRaw, config.dateFormat);
      if (!paidUntil) continue; // not a parseable date -> do nothing, per spec

      checked++;
      const name = getCell(row, config.nameColumn) || handleRaw;
      const diffDays = paidUntil.startOf('day').diff(now.startOf('day'), 'day');
      const paidUntilISO = paidUntil.format('YYYY-MM-DD');
      const displayDate = paidUntil.format(config.dateFormat);

      let kind = null;
      let template = null;
      if (diffDays < 0) {
        kind = 'expired';
        template = config.expiredMessageTemplate;
      } else if (config.notifyDaysBeforeExpiry > 0 && diffDays <= config.notifyDaysBeforeExpiry) {
        kind = 'pre';
        template = config.preExpiryMessageTemplate;
      } else {
        continue; // still active and outside the warning window
      }

      const key = state.keyFor(handle, paidUntilISO, kind);
      const lastNotified = persisted[key];
      const shouldNotify =
        !lastNotified ||
        (kind === 'expired' && dayjs().diff(dayjs(lastNotified), 'day') >= config.reminderRepeatDays);
      // "pre" reminders are sent once per due-date; "expired" reminders repeat per reminderRepeatDays.

      if (!shouldNotify) continue;

      const member = await findMemberByHandle(guild, handle);
      if (!member) {
        logger.warn(`Discord user not found in server for handle "${handleRaw}" (${name})`);
        await notifyAdminChannel(
          guild,
          config.adminNotifyChannelId,
          `⚠️ Could not find Discord member "${handleRaw}" (${name}) to send a membership reminder.`,
          logger
        );
        continue;
      }

      const messageText = render(template, {
        name,
        handle: handleRaw,
        date: displayDate,
        days: Math.abs(diffDays),
      });

      const sent = await sendDirectMessage(member, messageText, { dryRun: config.dryRun, logger });
      if (sent) {
        persisted[key] = dayjs().toISOString();
        notified++;
        logger.info(`Notified ${handleRaw} (${kind}, due ${displayDate})`);
      }
    } catch (err) {
      logger.error(`Error processing row: ${err.message}`);
    }
  }

  state.save(persisted);
  logger.info(`Check complete. ${checked} active members with parseable dates, ${notified} notification(s) sent.`);
}

client.once('ready', async () => {
  logger.info(`Logged in to Discord as ${client.user.tag}`);
  await runCheck();
  const intervalMs = Math.max(config.checkIntervalMinutes, 1) * 60 * 1000;
  setInterval(() => {
    runCheck().catch((err) => logger.error(`Unhandled error during check: ${err.message}`));
  }, intervalMs);
});

client.on('error', (err) => logger.error(`Discord client error: ${err.message}`));

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down...');
  client.destroy();
  process.exit(0);
});

client.login(config.discordBotToken).catch((err) => {
  logger.error(`Failed to log in to Discord: ${err.message}`);
  process.exit(1);
});
