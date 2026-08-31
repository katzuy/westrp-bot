# West RP — Discord Bot

Бот для проекта **West RP** (GTA): сообщения от имени бота, тикеты тех. раздела,
автоматический состав администрации, выдача ролей через панель и логи сервера.

## 1. Установка

```bash
npm install
```

Скопируй `.env.example` в `.env` и заполни:

```
TOKEN=токен_бота
CLIENT_ID=id_приложения
GUILD_ID=id_твоего_сервера
```

> ⚠️ Токен, который был отправлен в переписке, скомпрометирован.
> Developer Portal → Bot → **Reset Token**, и вставь новый.

## 2. Настройки в Developer Portal

Bot → **Privileged Gateway Intents** — включи все три:
`PRESENCE INTENT`, `SERVER MEMBERS INTENT`, `MESSAGE CONTENT INTENT`.

Приглашение бота — OAuth2 → URL Generator → scopes `bot` + `applications.commands`,
права: Administrator (проще всего) либо минимум:
Manage Roles, Manage Channels, View Channels, Send Messages, Embed Links,
Attach Files, Read Message History, Manage Messages, View Audit Log.

**Роль бота должна быть выше всех ролей, которые он выдаёт.**

## 3. Регистрация команд и запуск

```bash
npm run deploy
```

```bash
npm start
```

## 4. Первая настройка на сервере

```
/setup staff-add role:@Модератор
/setup staff-add role:@Гл. Администратор
/setup logs channel:#логи
/setup tickets category:Тикеты support:@Тех. поддержка transcripts:#стенограммы
/ticket-panel channel:#создать-тикет
/staff channel:#состав-администрации
/staff role-add role:@Команда проекта
/staff role-add role:@Куратор
/rolepanel title:Выбор ролей role1:@Новости role2:@Ивенты
```

Пока `staffRoles` пуст, командами могут пользоваться только владелец сервера
и участники с правом «Администратор».

## 5. Что умеет

| Раздел | Команды / поведение |
|---|---|
| Сообщения от имени бота | `/say`, `/embed` (цвета, картинки, @everyone) |
| Тикеты | `/ticket-panel` → меню категорий → форма → приватный канал; кнопки «Принять» / «Закрыть», стенограмма `.txt` в архив |
| Состав администрации | `/staff channel`, `/staff role-add`, `/staff refresh` — одно сообщение, редактируется само: при выдаче/снятии роли и раз в 10 минут |
| Выдача ролей | `/rolepanel` — меню до 10 ролей, повторный выбор снимает роль |
| Логи | сообщения (удаление/правка), вход/выход, роли, ники, баны, каналы, роли сервера, голосовые, тикеты |
| Права | все слэш-команды — только для ролей из `staffRoles` (модератор и выше) + админы/владелец |

## Структура

```
src/
  index.js            запуск, роутинг взаимодействий, проверка прав
  deploy-commands.js  регистрация слэш-команд
  commands/           setup, say, embed, ticket-panel, staff, rolepanel, help
  handlers/           tickets, staffList, rolePanels, logs
  utils/              store (JSON-хранилище), embeds (оформление), perms
data/guilds.json      настройки серверов (создаётся автоматически)
```

## Автодеплой

Репозиторий подключён к панели хостинга через GitHub webhook: после `git push`
в ветку `main` панель сама подтягивает свежий код и перезапускает бота.

Если менялись слэш-команды — после деплоя нужно один раз выполнить `npm run deploy`
в консоли панели, иначе Discord не покажет новые команды.
