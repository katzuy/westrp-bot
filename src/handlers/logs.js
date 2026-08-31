const { Events } = require('discord.js');
const { getGuild } = require('../utils/store');
const { base, COLORS } = require('../utils/embeds');
const { refreshStaffMessage } = require('./staffList');

const cut = (s, n = 1000) => !s ? '—' : (s.length > n ? s.slice(0, n) + '…' : s);

async function send(guild, embed) {
  if (!guild) return;
  const { logChannel } = getGuild(guild.id);
  if (!logChannel) return;
  const ch = await guild.channels.fetch(logChannel).catch(() => null);
  if (!ch) return;
  await ch.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
}

function register(client) {
  // Кастомное событие для логов из других модулей
  client.on('westLog', (guild, embed) => send(guild, embed));

  client.on(Events.MessageDelete, async msg => {
    if (!msg.guild || msg.author?.bot) return;
    await send(msg.guild, base(COLORS.danger)
      .setTitle('🗑️ Сообщение удалено')
      .addFields(
        { name: 'Автор', value: msg.author ? `${msg.author} \`${msg.author.tag}\`` : '—', inline: true },
        { name: 'Канал', value: `${msg.channel}`, inline: true },
        { name: 'Содержимое', value: cut(msg.content) }));
  });

  client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
    if (!newMsg.guild || newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    await send(newMsg.guild, base(COLORS.info)
      .setTitle('✏️ Сообщение изменено')
      .setURL(newMsg.url)
      .addFields(
        { name: 'Автор', value: `${newMsg.author} \`${newMsg.author.tag}\``, inline: true },
        { name: 'Канал', value: `${newMsg.channel}`, inline: true },
        { name: 'Было', value: cut(oldMsg.content) },
        { name: 'Стало', value: cut(newMsg.content) }));
  });

  client.on(Events.GuildMemberAdd, async member => {
    await send(member.guild, base(COLORS.success)
      .setTitle('📥 Участник зашёл')
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'Участник', value: `${member} \`${member.user.tag}\``, inline: true },
        { name: 'Аккаунт создан', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Всего на сервере', value: `${member.guild.memberCount}`, inline: true }));
  });

  client.on(Events.GuildMemberRemove, async member => {
    await send(member.guild, base(COLORS.danger)
      .setTitle('📤 Участник вышел')
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'Участник', value: `${member.user} \`${member.user.tag}\``, inline: true },
        { name: 'Был с', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '—', inline: true }));
    await refreshStaffMessage(member.guild).catch(() => {});
  });

  client.on(Events.GuildMemberUpdate, async (oldM, newM) => {
    const added = newM.roles.cache.filter(r => !oldM.roles.cache.has(r.id));
    const removed = oldM.roles.cache.filter(r => !newM.roles.cache.has(r.id));

    if (added.size || removed.size) {
      const lines = [];
      if (added.size) lines.push(`**Выдано:** ${added.map(r => `${r}`).join(', ')}`);
      if (removed.size) lines.push(`**Снято:** ${removed.map(r => `${r}`).join(', ')}`);
      await send(newM.guild, base(COLORS.info)
        .setTitle('🎭 Изменены роли участника')
        .setDescription(`${newM} \`${newM.user.tag}\`\n${lines.join('\n')}`));

      // Состав администрации мог измениться — обновляем список
      const cfg = getGuild(newM.guild.id);
      const touched = [...added.keys(), ...removed.keys()].some(id => cfg.staffList.roles.includes(id));
      if (touched) await refreshStaffMessage(newM.guild).catch(() => {});
    }

    if (oldM.nickname !== newM.nickname) {
      await send(newM.guild, base(COLORS.info)
        .setTitle('📛 Изменён никнейм')
        .setDescription(`${newM}\n**Было:** ${oldM.nickname || '—'}\n**Стало:** ${newM.nickname || '—'}`));
    }
  });

  client.on(Events.GuildBanAdd, async ban => {
    await send(ban.guild, base(COLORS.danger)
      .setTitle('🔨 Бан')
      .setDescription(`${ban.user} \`${ban.user.tag}\``)
      .addFields({ name: 'Причина', value: cut(ban.reason) }));
  });

  client.on(Events.GuildBanRemove, async ban => {
    await send(ban.guild, base(COLORS.success)
      .setTitle('🕊️ Разбан')
      .setDescription(`${ban.user} \`${ban.user.tag}\``));
  });

  client.on(Events.ChannelCreate, async ch => {
    if (!ch.guild) return;
    await send(ch.guild, base(COLORS.success).setTitle('📁 Канал создан').setDescription(`${ch} \`${ch.name}\``));
  });

  client.on(Events.ChannelDelete, async ch => {
    if (!ch.guild) return;
    await send(ch.guild, base(COLORS.danger).setTitle('📁 Канал удалён').setDescription(`\`${ch.name}\``));
  });

  client.on(Events.GuildRoleCreate, async role => {
    await send(role.guild, base(COLORS.success).setTitle('🏷️ Роль создана').setDescription(`${role} \`${role.name}\``));
  });

  client.on(Events.GuildRoleDelete, async role => {
    await send(role.guild, base(COLORS.danger).setTitle('🏷️ Роль удалена').setDescription(`\`${role.name}\``));
  });

  client.on(Events.VoiceStateUpdate, async (oldS, newS) => {
    if (oldS.channelId === newS.channelId) return;
    const who = `${newS.member} \`${newS.member.user.tag}\``;
    let emb;
    if (!oldS.channelId) emb = base(COLORS.success).setTitle('🔊 Зашёл в голосовой').setDescription(`${who} → ${newS.channel}`);
    else if (!newS.channelId) emb = base(COLORS.danger).setTitle('🔇 Вышел из голосового').setDescription(`${who} ← ${oldS.channel}`);
    else emb = base(COLORS.info).setTitle('🔀 Сменил голосовой канал').setDescription(`${who}\n${oldS.channel} → ${newS.channel}`);
    await send(newS.guild, emb);
  });
}

module.exports = { register, send };
