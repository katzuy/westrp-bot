const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { ok } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Написать сообщение от имени бота')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addStringOption(o => o.setName('text').setDescription('Текст сообщения (\n — перенос строки)').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('Канал (по умолчанию — текущий)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addStringOption(o => o.setName('reply_to').setDescription('ID сообщения, на которое ответить')),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const text = interaction.options.getString('text').replace(/\n/g, '\n');
    const replyTo = interaction.options.getString('reply_to');

    const payload = { content: text, allowedMentions: { parse: ['users', 'roles'] } };
    if (replyTo) payload.reply = { messageReference: replyTo, failIfNotExists: false };

    await channel.send(payload);
    return interaction.reply({ embeds: [ok('Отправлено', `Сообщение отправлено в ${channel}.`)], ephemeral: true });
  }
};
