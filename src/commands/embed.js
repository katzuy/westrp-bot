const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { base, ok, COLORS } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Отправить красивое оформленное сообщение (embed) от имени бота')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addStringOption(o => o.setName('title').setDescription('Заголовок').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Текст (\n — перенос строки)').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('Канал').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addStringOption(o => o.setName('color').setDescription('Цвет').addChoices(
      { name: 'Золото (фирменный)', value: 'main' },
      { name: 'Зелёный', value: 'success' },
      { name: 'Красный', value: 'danger' },
      { name: 'Синий', value: 'info' },
      { name: 'Тёмный', value: 'dark' }))
    .addStringOption(o => o.setName('image').setDescription('Ссылка на большую картинку'))
    .addStringOption(o => o.setName('thumbnail').setDescription('Ссылка на маленькую картинку справа'))
    .addBooleanOption(o => o.setName('ping_everyone').setDescription('Упомянуть @everyone')),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const color = COLORS[interaction.options.getString('color') ?? 'main'];

    const emb = base(color)
      .setTitle(interaction.options.getString('title'))
      .setDescription(interaction.options.getString('description').replace(/\n/g, '\n'));

    const img = interaction.options.getString('image');
    const thumb = interaction.options.getString('thumbnail');
    if (img) emb.setImage(img);
    if (thumb) emb.setThumbnail(thumb);

    await channel.send({
      content: interaction.options.getBoolean('ping_everyone') ? '@everyone' : undefined,
      embeds: [emb],
      allowedMentions: { parse: interaction.options.getBoolean('ping_everyone') ? ['everyone'] : [] }
    });

    return interaction.reply({ embeds: [ok('Отправлено', `Embed отправлен в ${channel}.`)], ephemeral: true });
  }
};
