const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getGuild, setGuild } = require('../utils/store');
const { base, ok, err, COLORS } = require('../utils/embeds');

const STATES = {
  online: {
    title: '🟢 Сервер работает',
    color: COLORS.success,
    text: 'Сервер запущен и доступен для входа. Приятной игры!'
  },
  offline: {
    title: '🔴 Сервер выключен',
    color: COLORS.danger,
    text: 'Сервер временно недоступен. Следите за обновлениями в этом канале.'
  },
  maintenance: {
    title: '🛠️ Технические работы',
    color: COLORS.main,
    text: 'На сервере ведутся технические работы. Вход временно закрыт.'
  }
};

module.exports = {
  // Доступ строго для администрации/разработчиков (проверяется в index.js)
  adminOnly: true,

  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Статус игрового сервера West RP')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(s => s.setName('channel').setDescription('Задать канал статуса сервера')
      .addChannelOption(o => o.setName('channel').setDescription('Канал #server-status')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true)))
    .addSubcommand(s => s.setName('online').setDescription('Сервер включён — опубликовать IP')
      .addStringOption(o => o.setName('ip').setDescription('IP:порт или адрес подключения').setRequired(true))
      .addStringOption(o => o.setName('note').setDescription('Дополнительно (что нового, вайп и т.д.)'))
      .addBooleanOption(o => o.setName('ping').setDescription('Упомянуть @everyone (по умолчанию — да)')))
    .addSubcommand(s => s.setName('offline').setDescription('Сервер выключен')
      .addStringOption(o => o.setName('reason').setDescription('Причина выключения').setRequired(true))
      .addStringOption(o => o.setName('eta').setDescription('Когда планируется запуск'))
      .addBooleanOption(o => o.setName('ping').setDescription('Упомянуть @everyone (по умолчанию — да)')))
    .addSubcommand(s => s.setName('maintenance').setDescription('Сервер на технических работах')
      .addStringOption(o => o.setName('reason').setDescription('Причина / что делаем').setRequired(true))
      .addStringOption(o => o.setName('eta').setDescription('Ориентировочное время окончания'))
      .addBooleanOption(o => o.setName('ping').setDescription('Упомянуть @everyone (по умолчанию — да)'))),

  async execute(interaction) {
    const gid = interaction.guild.id;
    const cfg = getGuild(gid);
    const sub = interaction.options.getSubcommand();

    if (sub === 'channel') {
      const ch = interaction.options.getChannel('channel');
      setGuild(gid, { status: { channel: ch.id } });
      return interaction.reply({ embeds: [ok('Канал задан', `Статус сервера будет публиковаться в ${ch}.`)], ephemeral: true });
    }

    if (!cfg.status || !cfg.status.channel) {
      return interaction.reply({ embeds: [err('Не настроено', 'Сначала задай канал: `/status channel`.')], ephemeral: true });
    }

    const channel = await interaction.guild.channels.fetch(cfg.status.channel).catch(() => null);
    if (!channel) {
      return interaction.reply({ embeds: [err('Канал не найден', 'Канал статуса удалён — задай его заново через `/status channel`.')], ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const state = STATES[sub];
    const emb = base(state.color)
      .setTitle(state.title)
      .setDescription(state.text)
      .setThumbnail(interaction.guild.iconURL({ size: 256 }));

    if (sub === 'online') {
      emb.addFields({ name: '🌐 IP для подключения', value: `\`\`\`${interaction.options.getString('ip')}\`\`\`` });
      const note = interaction.options.getString('note');
      if (note) emb.addFields({ name: '📌 Дополнительно', value: note });
    } else {
      emb.addFields({ name: '❗ Причина', value: interaction.options.getString('reason') });
      const eta = interaction.options.getString('eta');
      if (eta) emb.addFields({ name: '⏱️ Ожидаемое время', value: eta });
    }

    emb.addFields({ name: '🕒 Обновлено', value: `<t:${Math.floor(Date.now() / 1000)}:F>` });
    emb.setFooter({ text: `West RP • Обновил: ${interaction.user.tag}` });

    const ping = interaction.options.getBoolean('ping') ?? true;

    const msg = await channel.send({
      content: ping ? '@everyone' : undefined,
      embeds: [emb],
      allowedMentions: { parse: ping ? ['everyone'] : [] }
    });

    setGuild(gid, { status: { channel: channel.id, state: sub, updatedAt: Date.now(), updatedBy: interaction.user.id } });

    interaction.client.emit('westLog', interaction.guild, base(state.color)
      .setTitle('📡 Изменён статус сервера')
      .setDescription(`${interaction.user} → **${state.title}**\n${msg.url}`));

    return interaction.editReply({ embeds: [ok('Статус опубликован', `${state.title} — отправлено в ${channel}.`)] });
  }
};
