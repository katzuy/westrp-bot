const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getGuild, setGuild } = require('../utils/store');
const { base, ok, COLORS } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Настройка бота West RP')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand(s => s.setName('staff-add').setDescription('Добавить роль, которой можно пользоваться командами бота')
      .addRoleOption(o => o.setName('role').setDescription('Роль (модератор и выше)').setRequired(true)))
    .addSubcommand(s => s.setName('staff-remove').setDescription('Убрать роль из доступа к командам')
      .addRoleOption(o => o.setName('role').setDescription('Роль').setRequired(true)))
    .addSubcommand(s => s.setName('logs').setDescription('Задать канал логов сервера')
      .addChannelOption(o => o.setName('channel').setDescription('Канал').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(s => s.setName('tickets').setDescription('Настроить систему тикетов тех. раздела')
      .addChannelOption(o => o.setName('category').setDescription('Категория для тикетов').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
      .addRoleOption(o => o.setName('support').setDescription('Роль тех. поддержки').setRequired(true))
      .addChannelOption(o => o.setName('transcripts').setDescription('Канал для стенограмм закрытых тикетов').addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(s => s.setName('support-add').setDescription('Добавить ещё одну роль поддержки в тикеты')
      .addRoleOption(o => o.setName('role').setDescription('Роль').setRequired(true)))
    .addSubcommand(s => s.setName('view').setDescription('Показать текущие настройки')),

  async execute(interaction) {
    const gid = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    const cfg = getGuild(gid);

    if (sub === 'staff-add') {
      const role = interaction.options.getRole('role');
      if (cfg.staffRoles.includes(role.id))
        return interaction.reply({ embeds: [ok('Уже добавлено', `${role} уже имеет доступ к командам.`)], ephemeral: true });
      setGuild(gid, { staffRoles: [...cfg.staffRoles, role.id] });
      return interaction.reply({ embeds: [ok('Роль добавлена', `${role} теперь может использовать команды бота.`)], ephemeral: true });
    }

    if (sub === 'staff-remove') {
      const role = interaction.options.getRole('role');
      setGuild(gid, { staffRoles: cfg.staffRoles.filter(r => r !== role.id) });
      return interaction.reply({ embeds: [ok('Роль убрана', `${role} больше не имеет доступа к командам.`)], ephemeral: true });
    }

    if (sub === 'logs') {
      const ch = interaction.options.getChannel('channel');
      setGuild(gid, { logChannel: ch.id });
      return interaction.reply({ embeds: [ok('Логи настроены', `Все события сервера будут писаться в ${ch}.`)], ephemeral: true });
    }

    if (sub === 'tickets') {
      const category = interaction.options.getChannel('category');
      const support = interaction.options.getRole('support');
      const transcripts = interaction.options.getChannel('transcripts');
      setGuild(gid, { tickets: {
        category: category.id,
        supportRoles: [support.id],
        transcriptChannel: transcripts?.id ?? cfg.tickets.transcriptChannel
      } });
      return interaction.reply({ embeds: [ok('Тикеты настроены',
        `Категория: ${category}\nПоддержка: ${support}\nСтенограммы: ${transcripts ?? '—'}\n\nТеперь создай панель: \`/ticket-panel\``)], ephemeral: true });
    }

    if (sub === 'support-add') {
      const role = interaction.options.getRole('role');
      const roles = [...new Set([...cfg.tickets.supportRoles, role.id])];
      setGuild(gid, { tickets: { supportRoles: roles } });
      return interaction.reply({ embeds: [ok('Поддержка обновлена', `${role} теперь видит тикеты.`)], ephemeral: true });
    }

    // view
    const c = getGuild(gid);
    const list = (ids, m = r => `<@&${r}>`) => ids.length ? ids.map(m).join(', ') : '`не задано`';
    const emb = base(COLORS.main)
      .setTitle('⚙️ Настройки West RP')
      .addFields(
        { name: '🛡️ Доступ к командам', value: list(c.staffRoles) },
        { name: '📜 Канал логов', value: c.logChannel ? `<#${c.logChannel}>` : '`не задано`' },
        { name: '🎫 Тикеты', value:
            `Категория: ${c.tickets.category ? `<#${c.tickets.category}>` : '`не задано`'}\n` +
            `Поддержка: ${list(c.tickets.supportRoles)}\n` +
            `Стенограммы: ${c.tickets.transcriptChannel ? `<#${c.tickets.transcriptChannel}>` : '`не задано`'}\n` +
            `Открыто тикетов: **${Object.keys(c.tickets.open).length}**` },
        { name: '👑 Состав администрации', value:
            `Канал: ${c.staffList.channel ? `<#${c.staffList.channel}>` : '`не задано`'}\n` +
            `Роли: ${list(c.staffList.roles)}` }
      );
    return interaction.reply({ embeds: [emb], ephemeral: true });
  }
};
