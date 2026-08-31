const { getGuild, setGuild } = require('../utils/store');
const { base, COLORS } = require('../utils/embeds');

/**
 * Собирает embed с актуальным составом администрации:
 * для каждой настроенной роли — тег роли и упоминания всех её носителей.
 */
async function buildStaffEmbed(guild) {
  const cfg = getGuild(guild.id);
  await guild.members.fetch(); // нужен GuildMembers intent

  const emb = base(COLORS.main)
    .setTitle('👑 Состав администрации West RP')
    .setDescription('Актуальный список команды проекта. Обновляется автоматически.')
    .setThumbnail(guild.iconURL({ size: 256 }));

  if (!cfg.staffList.roles.length) {
    emb.addFields({ name: 'Пусто', value: 'Роли не настроены — используйте `/staff role-add`.' });
    return emb;
  }

  const unique = new Set();
  let total = 0;
  let shown = 0;

  for (const roleId of cfg.staffList.roles) {
    const role = guild.roles.cache.get(roleId);
    if (!role) continue;

    // В embed можно вместить максимум 25 полей
    if (shown >= 25) {
      emb.addFields({ name: '…', value: `Показаны первые 25 ролей из ${cfg.staffList.roles.length}.` });
      break;
    }

    const members = [...role.members.values()]
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ru'));
    members.forEach(m => unique.add(m.id));
    total += members.length;

    const value = members.length
      ? members.map(m => `> ${m} — \`${m.user.tag}\``).join('\n').slice(0, 1000)
      : '> *вакантно*';

    // Название роли — обычным текстом: в заголовке поля Discord не разворачивает <@&id>
    emb.addFields({ name: `${role.name} — ${members.length}`, value });
    shown++;
  }

  emb.setFooter({ text: `West RP • Всего в команде: ${unique.size} • Обновлено` });
  return emb;
}

/** Публикует или обновляет сообщение со списком в настроенном канале. */
async function refreshStaffMessage(guild) {
  const cfg = getGuild(guild.id);
  if (!cfg.staffList.channel) return null;

  const channel = await guild.channels.fetch(cfg.staffList.channel).catch(() => null);
  if (!channel) return null;

  const emb = await buildStaffEmbed(guild);

  if (cfg.staffList.messageId) {
    const msg = await channel.messages.fetch(cfg.staffList.messageId).catch(() => null);
    if (msg) {
      await msg.edit({ embeds: [emb], allowedMentions: { parse: [] } });
      return msg;
    }
  }

  const msg = await channel.send({ embeds: [emb], allowedMentions: { parse: [] } });
  setGuild(guild.id, { staffList: { messageId: msg.id } });
  return msg;
}

module.exports = { buildStaffEmbed, refreshStaffMessage };
