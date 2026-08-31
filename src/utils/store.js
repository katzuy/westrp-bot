const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', '..', 'data', 'guilds.json');

const DEFAULTS = {
  // Роли, которым разрешено пользоваться командами бота (модератор и выше)
  staffRoles: [],
  // Канал логов
  logChannel: null,
  // Тикеты
  tickets: {
    category: null,        // категория, в которой создаются тикеты
    supportRoles: [],      // роли, видящие тикеты
    transcriptChannel: null,
    counter: 0,
    open: {}               // channelId -> { userId, topic, claimedBy }
  },
  // Состав администрации
  staffList: {
    channel: null,
    messageId: null,
    roles: []              // упорядоченный список roleId (сверху = выше должность)
  },
  // Статус игрового сервера
  status: {
    channel: null,
    state: null,        // online | offline | maintenance
    updatedAt: null,
    updatedBy: null
  },
  // Панели ролей: messageId -> { channelId, roles: [roleId] }
  rolePanels: {}
};

function read() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; }
}

function write(db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2), 'utf8');
}

function deepMerge(base, over) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(over || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? deepMerge(base[k] ?? {}, v) : v;
  }
  return out;
}

function getGuild(guildId) {
  const db = read();
  return deepMerge(DEFAULTS, db[guildId] || {});
}

function setGuild(guildId, patch) {
  const db = read();
  db[guildId] = deepMerge(db[guildId] || DEFAULTS, patch);
  write(db);
  return db[guildId];
}

module.exports = { getGuild, setGuild, DEFAULTS };
