const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getGuild, setGuild } = require('../utils/store');
const { base, ok, err, COLORS } = require('../utils/embeds');

const MAX = 10;

function roleOption(builder, i) {
  return builder.addRoleOption(o => o.setName(`role${i}`).setDescription(`Роль #${i}`));
}

let data = new SlashCommandBuilder()
  .setName('rolepanel')
  .setDescription('Создать панель выдачи ролей в выбранном канале')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .setDMPermission(false)
  .addStringOption(o => o.setName('title').setDescription('Заголовок панели').setRequired(true))
  .addStringOption(o => o.setName('description').setDescription('Описание (\\n — перенос строки)'))
  .addChannelOption(o => o.setName('channel').setDescription('Канал').addChannelTypes(ChannelType.GuildText));

for (let i = 1; i <= MAX; i++) data = roleOption(data, i);

module.exports = {
  data,

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    const roles = [];
    for (let i = 1; i <= MAX; i++) {
      const r = interaction.options.getRole(`role${i}`);
      if (r) roles.push(r);
    }
    if (!roles.length) {
      return interaction.reply({ embeds: [err('Нет ролей', 'Укажи хотя бы одну роль.')], ephemeral: true });
    }

    const me = await interaction.guild.members.fetchMe();
    const tooHigh = roles.filter(r => r.position >= me.roles.highest.position || r.managed);
    if (tooHigh.length) {
      return interaction.reply({
        embeds: [err('Бот не может выдать эти роли',
          `${tooHigh.join(', ')}\n\nПодними роль бота выше этих ролей в настройках сервера.`)],
        ephemeral: true
      });
    }

    const emb = base(COLORS.main)
      .setTitle(interaction.options.getString('title'))
      .setDescription(
        (interaction.options.getString('description')?.replace(/\\n/g, '\n') ??
          'Выбери нужные роли в меню ниже. Повторный выбор снимает роль.') +
        '\n\n' + roles.map(r => `> ${r}`).join('\n')
      );

    const menu = new StringSelectMenuBuilder()
      .setCustomId('rolepanel:select')
      .setPlaceholder('🎭 Выберите роли')
      .setMinValues(0)
      .setMaxValues(roles.length)
      .addOptions(roles.map(r => ({ label: r.name.slice(0, 100), value: r.id })));

    const msg = await channel.send({ embeds: [emb], components: [new ActionRowBuilder().addComponents(menu)] });

    const cfg = getGuild(interaction.guild.id);
    setGuild(interaction.guild.id, {
      rolePanels: { ...cfg.rolePanels, [msg.id]: { channelId: channel.id, roles: roles.map(r => r.id) } }
    });

    return interaction.reply({ embeds: [ok('Панель создана', `Панель ролей опубликована в ${channel}.`)], ephemeral: true });
  }
};
