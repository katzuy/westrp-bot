const { getGuild } = require('../utils/store');
const { base, err, COLORS } = require('../utils/embeds');

/** Обработка выбора ролей в панели: выбранные — выдать, снятые — забрать. */
async function handle(interaction, client) {
  if (!interaction.isStringSelectMenu() || interaction.customId !== 'rolepanel:select') return false;

  const cfg = getGuild(interaction.guild.id);
  const panel = cfg.rolePanels[interaction.message.id];
  if (!panel) {
    await interaction.reply({ embeds: [err('Панель устарела', 'Эта панель больше не активна — попроси администрацию пересоздать её.')], ephemeral: true });
    return true;
  }

  await interaction.deferReply({ ephemeral: true });

  const member = interaction.member;
  const selected = new Set(interaction.values);
  const added = [], removed = [], failed = [];

  for (const roleId of panel.roles) {
    const has = member.roles.cache.has(roleId);
    try {
      if (selected.has(roleId) && !has) { await member.roles.add(roleId); added.push(`<@&${roleId}>`); }
      else if (!selected.has(roleId) && has) { await member.roles.remove(roleId); removed.push(`<@&${roleId}>`); }
    } catch {
      failed.push(`<@&${roleId}>`);
    }
  }

  const emb = base(COLORS.success).setTitle('🎭 Роли обновлены');
  const parts = [];
  if (added.length) parts.push(`**Выдано:** ${added.join(', ')}`);
  if (removed.length) parts.push(`**Снято:** ${removed.join(', ')}`);
  if (failed.length) parts.push(`**Не удалось:** ${failed.join(', ')} — у бота недостаточно прав.`);
  emb.setDescription(parts.length ? parts.join('\n') : 'Изменений нет.');

  if (added.length || removed.length) {
    client.emit('westLog', interaction.guild, base(COLORS.info)
      .setTitle('🎭 Роли через панель')
      .setDescription(`${interaction.user}\n${parts.join('\n')}`));
  }

  await interaction.editReply({ embeds: [emb] });
  return true;
}

module.exports = { handle };
