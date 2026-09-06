const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { normalizeHandle } = require('./util');

function createDiscordClient() {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers, // privileged intent - must be enabled in the Dev Portal
    ],
    partials: [Partials.Channel, Partials.User],
  });
}

/**
 * Finds a guild member whose username (new-style handle) or legacy tag
 * matches the given handle, case-insensitively.
 */
async function findMemberByHandle(guild, handle) {
  const target = normalizeHandle(handle);
  if (!target) return null;

  const members = await guild.members.fetch(); // uses the GuildMembers intent
  return (
    members.find((m) => normalizeHandle(m.user.username) === target) ||
    members.find((m) => normalizeHandle(m.user.tag) === target) ||
    members.find((m) => normalizeHandle(m.user.globalName || '') === target) ||
    null
  );
}

async function sendDirectMessage(member, content, { dryRun, logger }) {
  if (dryRun) {
    logger.info(`[dry-run] Would DM ${member.user.tag}: ${content}`);
    return true;
  }
  try {
    await member.send(content);
    return true;
  } catch (err) {
    logger.warn(`Failed to DM ${member.user.tag}: ${err.message}`);
    return false;
  }
}

async function notifyAdminChannel(guild, channelId, content, logger) {
  if (!channelId) return;
  try {
    const channel = await guild.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      await channel.send(content);
    }
  } catch (err) {
    logger.warn(`Failed to post to admin channel: ${err.message}`);
  }
}

module.exports = { createDiscordClient, findMemberByHandle, sendDirectMessage, notifyAdminChannel };
