require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!TOKEN || !CLIENT_ID) {
  console.error('❌ Заполни TOKEN и CLIENT_ID в .env');
  process.exit(1);
}

const commands = [];
const dir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
  const cmd = require(path.join(dir, file));
  if (cmd?.data) commands.push(cmd.data.toJSON());
}

const rest = new REST().setToken(TOKEN);

// GUILD_ID можно указать списком через запятую: GUILD_ID=111,222,333
const guildIds = (GUILD_ID || '').split(',').map(s => s.trim()).filter(Boolean);

(async () => {
  try {
    if (!guildIds.length) {
      // Глобально — работает на всех серверах, но обновляется до 1 часа
      const data = await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log(`✅ Зарегистрировано команд: ${data.length} глобально (появятся в течение часа)`);
      return;
    }
    for (const gid of guildIds) {
      const data = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, gid), { body: commands });
      console.log(`✅ Зарегистрировано команд: ${data.length} на сервере ${gid}`);
    }
  } catch (e) {
    console.error('❌ Ошибка регистрации команд:', e);
    process.exit(1);
  }
})();
