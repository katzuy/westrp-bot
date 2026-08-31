const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { base, ok, err, COLORS } = require('../utils/embeds');
const { getGuild } = require('../utils/store');
const { TICKET_TYPES } = require('../handlers/tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Опубликовать панель создания тикетов')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption(o => o.setName('channel').setDescription('Канал для панели').addChannelTypes(ChannelType.GuildText)),

  async execute(interaction) {
    const cfg = getGuild(interaction.guild.id);
    if (!cfg.tickets.category)
      return interaction.reply({ embeds: [err('Не настроено', 'Сначала выполни `/setup tickets`.')], ephemeral: true });

    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    const emb = base(COLORS.main)
      .setTitle('🎫 Техническая поддержка West RP')
      .setDescription(
        'Возникла проблема на проекте? Открой обращение — команда поддержки ответит в ближайшее время.\n\n' +
        '**Как это работает**\n' +
        '`1.` Выбери категорию обращения в меню ниже\n' +
        '`2.` Заполни короткую форму\n' +
        '`3.` Бот создаст личный канал, видимый только тебе и поддержке\n\n' +
        '**Правила обращений**\n' +
        '• Один тикет — один вопрос\n' +
        '• Опиши проблему подробно, приложи скриншоты\n' +
        '• Не пингуй администрацию — ожидай ответа\n' +
        '• Флуд и ложные обращения наказываются'
      )
      .addFields(TICKET_TYPES.map(t => ({ name: `${t.emoji} ${t.label}`, value: t.description, inline: true })));

    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket:create')
      .setPlaceholder('📩 Выберите категорию обращения')
      .addOptions(TICKET_TYPES.map(t => ({ label: t.label, value: t.value, description: t.description, emoji: t.emoji })));

    await channel.send({ embeds: [emb], components: [new ActionRowBuilder().addComponents(menu)] });
    return interaction.reply({ embeds: [ok('Готово', `Панель тикетов опубликована в ${channel}.`)], ephemeral: true });
  }
};
