# Запуск West RP Bot на VPS (Ubuntu)

Инструкция от нуля до бота, который работает 24/7 и сам поднимается после перезагрузки сервера.
Все команды выполняются на VPS, если не написано «на Windows».

---

## 0. Что нужно

- VPS с **Ubuntu 22.04 или 24.04** (хватит 1 vCPU / 1 GB RAM — боту нужно ~80 MB).
  Подойдёт любой хостинг: Timeweb, Aeza, Beget, Hetzner, VDSina.
- IP сервера, логин (обычно `root`) и пароль — их выдаёт хостинг после оплаты.

---

## 1. Подключение к VPS

На Windows открой **PowerShell** и введи (подставь свой IP):

```powershell
ssh root@123.45.67.89
```

Первый раз спросит `Are you sure you want to continue connecting?` — напиши `yes`.
Затем введи пароль (символы **не отображаются** при вводе — это нормально, просто печатай и жми Enter).

Если `ssh` не найден — установи OpenSSH: Параметры → Приложения → Дополнительные компоненты → Добавить → OpenSSH Client.

---

## 2. Обновление системы и установка Node.js

```bash
apt update && apt upgrade -y
```

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
```

```bash
apt install -y nodejs git
```

Проверка (должно быть `v20.x.x` и `10.x.x`):

```bash
node -v && npm -v
```

---

## 3. Отдельный пользователь (безопаснее, чем root)

```bash
adduser --disabled-password --gecos "" westbot
```

```bash
mkdir -p /home/westbot/bot && chown -R westbot:westbot /home/westbot
```

---

## 4. Загрузка кода бота на сервер

### Вариант А — через SCP (проще, без Git)

На **Windows** в PowerShell, в папке проекта:

```powershell
cd D:\westbot
```

```powershell
scp -r src package.json package-lock.json README.md root@123.45.67.89:/home/westbot/bot/
```

> `node_modules` и `.env` **не копируем** — модули поставим на сервере, `.env` создадим вручную.

### Вариант Б — через Git

Если код лежит в приватном репозитории:

```bash
cd /home/westbot/bot && git clone https://github.com/ТВОЙ_ЛОГИН/westbot.git .
```

> ⚠️ Никогда не заливай `.env` с токеном в публичный репозиторий.

---

## 5. Настройка .env на сервере

```bash
cd /home/westbot/bot && nano .env
```

Вставь (правой кнопкой мыши в PuTTY / Ctrl+Shift+V в Windows Terminal):

```
TOKEN=твой_новый_токен_бота
CLIENT_ID=1544028480109551787
GUILD_ID=1423320789100396627
```

Сохранить: `Ctrl+O` → `Enter`, выйти: `Ctrl+X`.

Закрываем файл от чужих глаз и отдаём папку пользователю:

```bash
chmod 600 .env && chown -R westbot:westbot /home/westbot/bot
```

---

## 6. Установка зависимостей и регистрация команд

```bash
cd /home/westbot/bot && sudo -u westbot npm install --omit=dev
```

```bash
sudo -u westbot npm run deploy
```

Ожидаемый вывод: `✅ Зарегистрировано команд: 8 на сервере ...`

Проверим, что бот вообще стартует (через 5 секунд нажми `Ctrl+C`):

```bash
sudo -u westbot npm start
```

Должно появиться: `✅ Бот запущен как West BOT#6333 | команд: 8`

---

## 7. Автозапуск через PM2

PM2 держит бота включённым, перезапускает при падении и после ребута сервера.

```bash
npm install -g pm2
```

```bash
cd /home/westbot/bot && sudo -u westbot pm2 start src/index.js --name westbot --time
```

Сохраняем список процессов и включаем автостарт при загрузке ОС:

```bash
sudo -u westbot pm2 save
```

```bash
pm2 startup systemd -u westbot --hp /home/westbot
```

Последняя команда выведет ещё одну строку, начинающуюся с `sudo env PATH=...` —
**скопируй её и выполни**, иначе автозапуск не включится.

---

## 8. Управление ботом

| Действие | Команда |
|---|---|
| Статус | `sudo -u westbot pm2 status` |
| Логи в реальном времени | `sudo -u westbot pm2 logs westbot` |
| Последние 100 строк логов | `sudo -u westbot pm2 logs westbot --lines 100` |
| Перезапуск | `sudo -u westbot pm2 restart westbot` |
| Остановить | `sudo -u westbot pm2 stop westbot` |
| Запустить снова | `sudo -u westbot pm2 start westbot` |
| Удалить из PM2 | `sudo -u westbot pm2 delete westbot` |

Выйти из просмотра логов — `Ctrl+C` (бот при этом продолжит работать).

---

## 9. Обновление бота после правок кода

На **Windows** заливаем изменённые файлы:

```powershell
scp -r src root@123.45.67.89:/home/westbot/bot/
```

На **VPS**:

```bash
cd /home/westbot/bot && chown -R westbot:westbot . && sudo -u westbot pm2 restart westbot
```

Если менял или добавлял слэш-команды — дополнительно:

```bash
sudo -u westbot npm run deploy
```

---

## 10. Резервная копия настроек

Все настройки серверов (тикеты, состав администрации, каналы, счётчик тикетов)
лежат в одном файле `data/guilds.json`. Скачать копию на Windows:

```powershell
scp root@123.45.67.89:/home/westbot/bot/data/guilds.json D:\westbot\backup-guilds.json
```

Автобэкап раз в сутки на самом VPS:

```bash
(crontab -l 2>/dev/null; echo "0 4 * * * cp /home/westbot/bot/data/guilds.json /home/westbot/backup-\$(date +\%F).json") | crontab -
```

---

## 11. Если что-то не работает

**Бот офлайн, в логах `Used disallowed intents`**
В [Developer Portal](https://discord.com/developers/applications) → Bot → Privileged Gateway Intents
включи `PRESENCE`, `SERVER MEMBERS`, `MESSAGE CONTENT`, затем `pm2 restart westbot`.

**`TokenInvalid` / `❌ Не задан TOKEN`**
Проверь `.env`: `cat /home/westbot/bot/.env`. Токен без пробелов и кавычек, в одну строку.
Если сбрасывал токен в портале — старый больше не работает, впиши новый.

**Команд нет в Discord**
Выполни `sudo -u westbot npm run deploy` и нажми `Ctrl+R` в Discord.
Если Discord отдал `Invalid Form Body` — регистрация отклоняется целиком, смотри текст ошибки.

**Бот не выдаёт роли / не создаёт тикеты**
Роль бота в настройках сервера должна стоять **выше** всех выдаваемых ролей,
и у него должны быть права Manage Roles / Manage Channels.

**Бот отвечает дважды**
Запущено две копии: `sudo -u westbot pm2 status` — лишнюю удали через `pm2 delete <id>`.

**Смотрю, сколько ест памяти**

```bash
sudo -u westbot pm2 monit
```

---

## 12. Минимальная безопасность VPS

```bash
apt install -y ufw && ufw allow OpenSSH && ufw --force enable
```

Боту не нужны открытые порты — он сам подключается к Discord, входящие соединения не принимает.
Смени пароль root (`passwd`) или, лучше, настрой вход по SSH-ключу.

> Токен бота = полный доступ к нему. Не показывай его в скриншотах, стримах и переписке.
> Если засветил — Developer Portal → Bot → Reset Token и обнови `.env`.
