const { PermissionFlagsBits } = require('discord.js');
const { getGuild } = require('./store');

/**
 * Доступ к командам бота: владелец сервера, администратор,
 * либо носитель одной из ролей из staffRoles (модератор и выше).
 */
function isStaff(member) {
  if (!member || !member.guild) return false;
  if (member.id === member.guild.ownerId) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const { staffRoles } = getGuild(member.guild.id);
  return staffRoles.some(r => member.roles.cache.has(r));
}

/**
 * Доступ к критичным командам (статус сервера): владелец или администратор.
 */
function isAdmin(member) {
  if (!member || !member.guild) return false;
  return member.id === member.guild.ownerId ||
    member.permissions.has(PermissionFlagsBits.Administrator);
}

module.exports = { isStaff, isAdmin };
