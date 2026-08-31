require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, Events, ActivityType } = require('discord.js');

const { isStaff, isAdmin } = require('./utils/perms');
const { err } = require('./utils/embeds');
const logs = require('./handlers/logs');
const tickets = require('./handlers/tickets');
const rolePanels = require('./handlers/rolePanels');
const { refreshStaffMessage } = require('./handlers/staffList');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User]
});

// --- Загрузка команд ---
client.commands = new Collection();
const cmdDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(cmdDir).filter(f => f.endsWith('.js'))) {
  const cmd = require(path.join(cmdDir, file));
  if (cmd?.data && cmd?.execute) client.commands.set(cmd.data.name, cmd);
}

logs.register(client);

client.once(Events.ClientReady, async c => {
  console.log(`✅ Бот запущен как ${c.user.tag} | команд: ${client.commands.size}`);
  c.user.setPresence({
    activities: [{ name: 'West RP | /help', type: ActivityType.Watching }],
    status: 'online'
  });

  // Обновляем состав администрации при старте и каждые 10 минут
  const tick = () => c.guilds.cache.forEach(g => refreshStaffMessage(g).catch(() => {}));
  tick();
  setInterval(tick, 10 * 60 * 1000);
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (!interaction.guild) return;

    // Слэш-команды — только для модерации и выше
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      if (!isStaff(interaction.member)) {
        return interaction.reply({
          embeds: [err('Недостаточно прав',
            'Команды бота доступны только модерации и выше.\nЕсли это ошибка — обратитесь к главному администратору.')],
          ephemeral: true
        });
      }

      // Отдельные команды — только для админов и разработчиков
      if (command.adminOnly && !isAdmin(interaction.member)) {
        return interaction.reply({
          embeds: [err('Недостаточно прав', 'Эта команда доступна только администрации проекта.')],
          ephemeral: true
        });
      }

      return command.execute(interaction);
    }

    // Компоненты — доступны всем участникам
    if (await tickets.handle(interaction, client)) return;
    if (await rolePanels.handle(interaction, client)) return;
  } catch (e) {
    console.error('Ошибка обработки взаимодействия:', e);
    const payload = { embeds: [err('Ошибка', 'Что-то пошло не так. Сообщите администрации.')], ephemeral: true };
    if (interaction.deferred || interaction.replied) interaction.followUp(payload).catch(() => {});
    else interaction.reply(payload).catch(() => {});
  }
});

process.on('unhandledRejection', e => console.error('unhandledRejection:', e));

if (!process.env.TOKEN) {
  console.error('❌ Не задан TOKEN в файле .env');
  process.exit(1);
}
client.login(process.env.TOKEN);
