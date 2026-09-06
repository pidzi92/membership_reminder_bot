#!/usr/bin/with-contenv bashio
set -e

bashio::log.info "Reading add-on configuration..."

export DISCORD_BOT_TOKEN
export DISCORD_GUILD_ID
export GOOGLE_SHEET_ID
export GOOGLE_SHEET_RANGE
export GOOGLE_SERVICE_ACCOUNT_JSON_PATH
export HEADER_ROW
export NAME_COLUMN
export DISCORD_HANDLE_COLUMN
export STATUS_COLUMN
export STATUS_ACTIVE_VALUE
export PAID_UNTIL_COLUMN
export DATE_FORMAT
export TIMEZONE
export CHECK_INTERVAL_MINUTES
export NOTIFY_DAYS_BEFORE_EXPIRY
export REMINDER_REPEAT_DAYS
export EXPIRED_MESSAGE_TEMPLATE
export PRE_EXPIRY_MESSAGE_TEMPLATE
export ADMIN_NOTIFY_CHANNEL_ID
export DRY_RUN
export LOG_LEVEL

DISCORD_BOT_TOKEN=$(bashio::config 'discord_bot_token')
DISCORD_GUILD_ID=$(bashio::config 'discord_guild_id')
GOOGLE_SHEET_ID=$(bashio::config 'google_sheet_id')
GOOGLE_SHEET_RANGE=$(bashio::config 'google_sheet_range')
GOOGLE_SERVICE_ACCOUNT_JSON_PATH=$(bashio::config 'google_service_account_json_path')
HEADER_ROW=$(bashio::config 'header_row')
NAME_COLUMN=$(bashio::config 'name_column')
DISCORD_HANDLE_COLUMN=$(bashio::config 'discord_handle_column')
STATUS_COLUMN=$(bashio::config 'status_column')
STATUS_ACTIVE_VALUE=$(bashio::config 'status_active_value')
PAID_UNTIL_COLUMN=$(bashio::config 'paid_until_column')
DATE_FORMAT=$(bashio::config 'date_format')
TIMEZONE=$(bashio::config 'timezone')
CHECK_INTERVAL_MINUTES=$(bashio::config 'check_interval_minutes')
NOTIFY_DAYS_BEFORE_EXPIRY=$(bashio::config 'notify_days_before_expiry')
REMINDER_REPEAT_DAYS=$(bashio::config 'reminder_repeat_days')
EXPIRED_MESSAGE_TEMPLATE=$(bashio::config 'expired_message_template')
PRE_EXPIRY_MESSAGE_TEMPLATE=$(bashio::config 'pre_expiry_message_template')
ADMIN_NOTIFY_CHANNEL_ID=$(bashio::config 'admin_notify_channel_id')
DRY_RUN=$(bashio::config 'dry_run')
LOG_LEVEL=$(bashio::config 'log_level')

if ! bashio::fs.file_exists "${GOOGLE_SERVICE_ACCOUNT_JSON_PATH}"; then
    bashio::log.fatal "Google service account file not found at ${GOOGLE_SERVICE_ACCOUNT_JSON_PATH}"
    bashio::log.fatal "Upload your service-account.json there (see DOCS.md) and restart the add-on."
    bashio::exit.nok
fi

bashio::log.info "Starting Membership Reminder Bot..."
exec node /app/bot.js
