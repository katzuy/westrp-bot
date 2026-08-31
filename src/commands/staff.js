const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getGuild, setGuild } = require('../utils/store');
const { ok, err } = require('../utils/embeds');
const { refreshStaffMessage } = require('../handlers/staffList');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff')
    .setDescription('Состав администрации проекта')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand(s => s.setName('channel').setDescription('Задать канал, в котором публикуется состав администрации')
      .addChannelOption(o => o.setName('channel').setDescription('Канал').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(s => s.setName('role-add').setDescription('Добавить роль в список состава (порядок = порядок добавления)')
      .addRoleOption(o => o.setName('role').setDescription('Например: Команда проекта').setRequired(true)))
    .addSubcommand(s => s.setName('role-remove').setDescription('Убрать роль из списка состава')
      .addRoleOption(o => o.setName('role').setDescription('Роль').setRequired(true)))
    .addSubcommand(s => s.setName('role-add-all').setDescription('Добавить в состав ВСЕ роли сервера (по иерархии, сверху вниз)')
      .addBooleanOption(o => o.setName('skip_empty').setDescription('Пропустить роли без участников (по умолчанию — да)')))
    .addSubcommand(s => s.setName('clear').setDescription('Очистить список ролей состава'))
    .addSubcommand(s => s.setName('refresh').setDescription('Обновить сообщение со составом вручную')),

  async execute(interaction) {
    const gid = interaction.guild.id;
    const cfg = getGuild(gid);
    const sub = interaction.options.getSubcommand();

    if (sub === 'channel') {
      const ch = interaction.options.getChannel('channel');
      setGuild(gid, { staffList: { channel: ch.id, messageId: null } });
      await refreshStaffMessage(interaction.guild).catch(() => {});
      return interaction.reply({ embeds: [ok('Канал задан', `Состав администрации публикуется в ${ch}.`)], ephemeral: true });
    }

    if (sub === 'role-add') {
      const role = interaction.options.getRole('role');
      if (cfg.staffList.roles.includes(role.id)) {
        return interaction.reply({ embeds: [err('Уже в списке', `${role} уже есть в составе.`)], ephemeral: true });
      }
      setGuild(gid, { staffList: { roles: [...cfg.staffList.roles, role.id] } });
      await refreshStaffMessage(interaction.guild).catch(() => {});
      return interaction.reply({ embeds: [ok('Роль добавлена', `${role} добавлена в состав администрации.`)], ephemeral: true });
    }

    if (sub === 'role-remove') {
      const role = interaction.options.getRole('role');
      setGuild(gid, { staffList: { roles: cfg.staffList.roles.filter(r => r !== role.id) } });
      await refreshStaffMessage(interaction.guild).catch(() => {});
      return interaction.reply({ embeds: [ok('Роль убрана', `${role} убрана из состава.`)], ephemeral: true });
    }

    if (sub === 'role-add-all') {
      await interaction.deferReply({ ephemeral: true });
      const skipEmpty = interaction.options.getBoolean('skip_empty') ?? true;
      await interaction.guild.members.fetch();

      const roles = [...interaction.guild.roles.cache.values()]
        .filter(r => r.id !== interaction.guild.id)       // без @everyone
        .filter(r => !r.managed)                          // без ролей ботов и интеграций
        .filter(r => !skipEmpty || r.members.size > 0)
        .sort((a, b) => b.position - a.position)          // от высшей к низшей
        .slice(0, 25)                                     // лимит полей в embed
        .map(r => r.id);

      if (!roles.length) {
        return interaction.editReply({ embeds: [err('Ролей не найдено', 'Подходящих ролей на сервере нет.')] });
      }

      setGuild(gid, { staffList: { roles } });
      await refreshStaffMessage(interaction.guild).catch(() => {});
      return interaction.editReply({ embeds: [ok('Роли добавлены',
        `В состав добавлено ролей: **${roles.length}** (по иерархии сервера, сверху вниз).\n` +
        `Лишние убери через \`/staff role-remove\`.`)] });
    }

    if (sub === 'clear') {
      setGuild(gid, { staffList: { roles: [] } });
      await refreshStaffMessage(interaction.guild).catch(() => {});
      return interaction.reply({ embeds: [ok('Очищено', 'Список ролей состава пуст.')], ephemeral: true });
    }

    // refresh
    await interaction.deferReply({ ephemeral: true });
    const msg = await refreshStaffMessage(interaction.guild);
    return msg
      ? interaction.editReply({ embeds: [ok('Обновлено', `Состав обновлён: ${msg.url}`)] })
      : interaction.editReply({ embeds: [err('Не настроено', 'Сначала задай канал: `/staff channel`.')] });
  }
};
