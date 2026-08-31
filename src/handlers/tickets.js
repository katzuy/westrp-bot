const {
  ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder
} = require('discord.js');
const { getGuild, setGuild } = require('../utils/store');
const { base, ok, err, COLORS } = require('../utils/embeds');
const { isStaff } = require('../utils/perms');

const TICKET_TYPES = [
  { value: 'tech',   label: 'Технический вопрос', emoji: '🛠️', description: 'Ошибки лаунчера, вход, лаги' },
  { value: 'bug',    label: 'Баг / эксплойт',     emoji: '🐞', description: 'Сообщить о баге на сервере' },
  { value: 'donate', label: 'Донат',              emoji: '💳', description: 'Проблемы с оплатой и товарами' },
  { value: 'other',  label: 'Другое',             emoji: '❓', description: 'Вопрос вне категорий' }
];

const typeOf = v => TICKET_TYPES.find(t => t.value === v) ?? TICKET_TYPES[TICKET_TYPES.length - 1];

function ticketButtons(claimed = false, locked = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:claim').setLabel(claimed ? 'Принят' : 'Принять тикет')
      .setEmoji('🙋').setStyle(ButtonStyle.Success).setDisabled(claimed),
    new ButtonBuilder().setCustomId('ticket:close').setLabel('Закрыть')
      .setEmoji('🔒').setStyle(ButtonStyle.Danger).setDisabled(locked)
  );
}

async function handle(interaction, client) {
  const gid = interaction.guild.id;
  const cfg = getGuild(gid);

  // 1) Выбор категории -> модальное окно
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket:create') {
    const type = interaction.values[0];
    const modal = new ModalBuilder()
      .setCustomId(`ticket:modal:${type}`)
      .setTitle(`Обращение · ${typeOf(type).label}`.slice(0, 45))
      .addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder()
          .setCustomId('nick').setLabel('Ваш ник и ID на сервере').setStyle(TextInputStyle.Short)
          .setPlaceholder('John_West / 12345').setRequired(true).setMaxLength(64)),
        new ActionRowBuilder().addComponents(new TextInputBuilder()
          .setCustomId('topic').setLabel('Кратко: суть обращения').setStyle(TextInputStyle.Short)
          .setRequired(true).setMaxLength(100)),
        new ActionRowBuilder().addComponents(new TextInputBuilder()
          .setCustomId('desc').setLabel('Подробное описание').setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Что произошло, когда, что уже пробовали').setRequired(true).setMaxLength(1000))
      );
    return interaction.showModal(modal);
  }

  // 2) Создание канала тикета
  if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket:modal:')) {
    await interaction.deferReply({ ephemeral: true });
    const type = typeOf(interaction.customId.split(':')[2]);

    if (!cfg.tickets.category) {
      return interaction.editReply({ embeds: [err('Не настроено', 'Система тикетов не настроена (`/setup tickets`).')] });
    }

    const already = Object.entries(cfg.tickets.open).find(([, t]) => t.userId === interaction.user.id);
    if (already && interaction.guild.channels.cache.has(already[0])) {
      return interaction.editReply({ embeds: [err('Тикет уже открыт', `У вас есть активное обращение: <#${already[0]}>`)] });
    }

    const number = (cfg.tickets.counter || 0) + 1;
    const overwrites = [
      { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
      { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
      ...cfg.tickets.supportRoles.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] }))
    ];

    const channel = await interaction.guild.channels.create({
      name: `${type.value}-${String(number).padStart(4, '0')}`,
      type: ChannelType.GuildText,
      parent: cfg.tickets.category,
      topic: `Тикет #${number} • ${interaction.user.tag} • ${type.label}`,
      permissionOverwrites: overwrites
    });

    const nick = interaction.fields.getTextInputValue('nick');
    const topic = interaction.fields.getTextInputValue('topic');
    const desc = interaction.fields.getTextInputValue('desc');

    setGuild(gid, {
      tickets: {
        counter: number,
        open: { ...cfg.tickets.open, [channel.id]: { userId: interaction.user.id, topic, type: type.value, claimedBy: null, number } }
      }
    });

    const emb = base(COLORS.main)
      .setTitle(`${type.emoji} Обращение #${String(number).padStart(4, '0')}`)
      .setDescription(`Здравствуйте, ${interaction.user}! Опишите проблему подробнее — поддержка ответит в ближайшее время.`)
      .addFields(
        { name: '👤 Игрок', value: `${nick}\n${interaction.user} \`${interaction.user.id}\``, inline: true },
        { name: '📂 Категория', value: type.label, inline: true },
        { name: '📝 Тема', value: topic },
        { name: '💬 Описание', value: desc }
      )
      .setThumbnail(interaction.user.displayAvatarURL());

    await channel.send({
      content: `${interaction.user} ${cfg.tickets.supportRoles.map(r => `<@&${r}>`).join(' ')}`,
      embeds: [emb],
      components: [ticketButtons()]
    });

    client.emit('westLog', interaction.guild, base(COLORS.info)
      .setTitle('🎫 Открыт тикет')
      .setDescription(`${interaction.user} открыл ${channel} (#${number} · ${type.label})`));

    return interaction.editReply({ embeds: [ok('Тикет создан', `Ваше обращение: ${channel}`)] });
  }

  if (!interaction.isButton() || !interaction.customId.startsWith('ticket:')) return false;

  const ticket = cfg.tickets.open[interaction.channel.id];
  const action = interaction.customId.split(':')[1];

  if (action === 'claim') {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ embeds: [err('Нет доступа', 'Только поддержка может принять тикет.')], ephemeral: true });
    }
    setGuild(gid, { tickets: { open: { ...cfg.tickets.open, [interaction.channel.id]: { ...ticket, claimedBy: interaction.user.id } } } });
    await interaction.message.edit({ components: [ticketButtons(true)] });
    return interaction.reply({ embeds: [base(COLORS.success).setDescription(`🙋 ${interaction.user} взял обращение в работу.`)] });
  }

  if (action === 'close') {
    if (!isStaff(interaction.member) && (!ticket || ticket.userId !== interaction.user.id)) {
      return interaction.reply({ embeds: [err('Нет доступа', 'Закрыть тикет может автор или поддержка.')], ephemeral: true });
    }
    return interaction.reply({
      embeds: [base(COLORS.danger).setTitle('🔒 Закрыть обращение?').setDescription('Канал будет удалён, стенограмма сохранится.')],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket:confirm').setLabel('Да, закрыть').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ticket:cancel').setLabel('Отмена').setStyle(ButtonStyle.Secondary))],
      ephemeral: true
    });
  }

  if (action === 'cancel') {
    return interaction.update({ embeds: [base(COLORS.dark).setDescription('Отменено.')], components: [] });
  }

  if (action === 'confirm') {
    await interaction.update({ embeds: [base(COLORS.dark).setDescription('Закрываю обращение…')], components: [] });

    if (cfg.tickets.transcriptChannel) {
      try {
        const msgs = await interaction.channel.messages.fetch({ limit: 100 });
        const lines = [...msgs.values()].reverse().map(m =>
          `[${new Date(m.createdTimestamp).toLocaleString('ru-RU')}] ${m.author.tag}: ${m.content || '[embed / вложение]'}`);
        const file = new AttachmentBuilder(Buffer.from(lines.join('\n'), 'utf8'),
          { name: `ticket-${(ticket && ticket.number) || interaction.channel.name}.txt` });
        const tc = await interaction.guild.channels.fetch(cfg.tickets.transcriptChannel).catch(() => null);
        if (tc) {
          await tc.send({
            embeds: [base(COLORS.dark).setTitle(`📁 Тикет #${(ticket && ticket.number) || '—'} закрыт`).addFields(
              { name: 'Автор', value: ticket ? `<@${ticket.userId}>` : '—', inline: true },
              { name: 'Закрыл', value: `${interaction.user}`, inline: true },
              { name: 'Принял', value: ticket && ticket.claimedBy ? `<@${ticket.claimedBy}>` : '—', inline: true },
              { name: 'Тема', value: (ticket && ticket.topic) || '—' })],
            files: [file]
          });
        }
      } catch { /* стенограмма не критична */ }
    }

    const open = { ...cfg.tickets.open };
    delete open[interaction.channel.id];
    setGuild(gid, { tickets: { open } });

    client.emit('westLog', interaction.guild, base(COLORS.danger)
      .setTitle('🎫 Тикет закрыт')
      .setDescription(`\`${interaction.channel.name}\` закрыт ${interaction.user}`));

    setTimeout(() => interaction.channel.delete().catch(() => {}), 4000);
    return true;
  }

  return false;
}

module.exports = { handle, TICKET_TYPES };
