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

(async () => {
  try {
    const route = GUILD_ID
      ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)   // мгновенно на одном сервере
      : Routes.applicationCommands(CLIENT_ID);                 // глобально (до 1 часа)
    const data = await rest.put(route, { body: commands });
    console.log(`✅ Зарегистрировано команд: ${data.length}${GUILD_ID ? ` на сервере ${GUILD_ID}` : ' глобально'}`);
  } catch (e) {
    console.error('❌ Ошибка регистрации команд:', e);
    process.exit(1);
  }
})();
