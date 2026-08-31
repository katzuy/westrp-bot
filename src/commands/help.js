const { SlashCommandBuilder } = require('discord.js');
const { base, COLORS } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Список команд бота West RP')
    .setDMPermission(false),

  async execute(interaction) {
    const emb = base(COLORS.main)
      .setTitle('📖 Команды West RP Bot')
      .setDescription('Все команды доступны только модерации и выше.')
      .addFields(
        { name: '⚙️ Настройка', value:
          '`/setup staff-add` — выдать роли доступ к командам\n' +
          '`/setup staff-remove` — забрать доступ\n' +
          '`/setup logs` — канал логов\n' +
          '`/setup tickets` — категория, роль поддержки, стенограммы\n' +
          '`/setup support-add` — ещё одна роль поддержки\n' +
          '`/setup view` — текущие настройки' },
        { name: '💬 Сообщения от имени бота', value:
          '`/say` — обычный текст в любой канал\n' +
          '`/embed` — красивое оформленное сообщение' },
        { name: '🎫 Тикеты', value:
          '`/ticket-panel` — опубликовать панель обращений\n' +
          'Внутри тикета: 🙋 Принять · 🔒 Закрыть (со стенограммой)' },
        { name: '👑 Состав администрации', value:
          '`/staff channel` — канал для списка\n' +
          '`/staff role-add` / `role-remove` — какие роли показывать\n' +
          '`/staff refresh` — обновить вручную (обновляется и сам)' },
        { name: '📡 Статус сервера (только админы)', value:
          '`/status channel` — канал статуса\n' +
          '`/status online ip:...` — сервер работает, публикует IP\n' +
          '`/status offline reason:...` — сервер выключен\n' +
          '`/status maintenance reason:...` — тех. работы\n' +
          'Каждое обновление — новое сообщение с @everyone' },
        { name: '🎭 Выдача ролей', value:
          '`/rolepanel` — панель самостоятельной выдачи ролей (до 10 ролей)' }
      );
    return interaction.reply({ embeds: [emb], ephemeral: true });
  }
};
