# Запуск West RP Bot на Windows VDS

Инструкция от нуля до бота, который работает 24/7 как служба Windows
и сам поднимается после перезагрузки сервера.

Всё делается **на VDS**, если не написано «на своём ПК».

---

## 1. Подключение к VDS

На своём ПК нажми `Win + R`, введи:

```
mstsc
```

В окне «Подключение к удалённому рабочему столу» введи IP сервера, затем логин
(обычно `Administrator`) и пароль — их выдал хостинг.

Совет: сразу нажми «Показать параметры» → вкладка **Локальные ресурсы** →
«Подробнее» → поставь галочку на **Диски**. Тогда твой диск `D:` будет виден
внутри VDS, и файлы можно просто скопировать мышкой.

---

## 2. Установка Node.js

На VDS открой браузер и скачай **Node.js LTS (20.x)** для Windows x64:

https://nodejs.org/en/download

Запусти `.msi`, жми «Далее» до конца, ничего менять не нужно
(галочку «Automatically install the necessary tools» можно **не** ставить).

Проверка — открой **PowerShell** (правой кнопкой по «Пуск» → Терминал / PowerShell):

```powershell
node -v; npm -v
```

Должно вывести `v20.x.x` и `10.x.x`. Если пишет «не является командой» — перезапусти PowerShell.

---

## 3. Копирование бота на VDS

Создай на VDS папку:

```powershell
New-Item -ItemType Directory -Force C:\westbot
```

Теперь перенеси туда файлы одним из способов:

**Способ А — мышкой (проще всего).**
Если на шаге 1 ты подключил свои диски: открой «Этот компьютер» на VDS,
там будет `D на <имя-твоего-ПК>`. Зайди в `D:\westbot` и скопируй в `C:\westbot`
папку `src` и файлы `package.json`, `package-lock.json`, `README.md`.

**Способ Б — просто Ctrl+C / Ctrl+V.**
Выдели те же файлы на своём ПК, `Ctrl+C`, перейди в окно RDP, открой `C:\westbot`, `Ctrl+V`.

> ⚠️ Папку `node_modules` копировать **не нужно** — она большая и ставится на месте.
> Файл `.env` тоже не копируй, создадим его следующим шагом.

---

## 4. Файл .env с токеном

В PowerShell на VDS:

```powershell
notepad C:\westbot\.env
```

Notepad спросит «Создать новый файл?» — согласись. Вставь три строки:

```
TOKEN=твой_новый_токен_бота
CLIENT_ID=1544028480109551787
GUILD_ID=1423320789100396627
```

Сохрани (`Ctrl+S`) и закрой.

Проверь, что файл называется именно `.env`, а не `.env.txt`:

```powershell
Get-ChildItem C:\westbot -Force -Filter ".env*"
```

Если видишь `.env.txt` — переименуй:

```powershell
Rename-Item C:\westbot\.env.txt .env
```

---

## 5. Установка зависимостей и регистрация команд

```powershell
cd C:\westbot; npm install --omit=dev
```

```powershell
npm run deploy
```

Ожидаемый вывод: `✅ Зарегистрировано команд: 8 на сервере ...`

Пробный запуск (через несколько секунд нажми `Ctrl+C`, чтобы остановить):

```powershell
npm start
```

Должно появиться `✅ Бот запущен как West BOT#6333 | команд: 8`.
Если появилось — переходим к службе.

---

## 6. Бот как служба Windows (NSSM)

Так бот работает без открытого окна PowerShell и автоматически стартует после ребута VDS.
На Windows это надёжнее, чем PM2.

Скачай и распакуй NSSM:

```powershell
Invoke-WebRequest https://nssm.cc/release/nssm-2.24.zip -OutFile $env:TEMP\nssm.zip
```

```powershell
Expand-Archive $env:TEMP\nssm.zip -DestinationPath C:\nssm -Force
```

```powershell
Copy-Item C:\nssm\nssm-2.24\win64\nssm.exe C:\Windows\System32\nssm.exe
```

Создай службу (одной строкой):

```powershell
nssm install westbot "C:\Program Files\nodejs\node.exe" "C:\westbot\src\index.js"
```

Настрой рабочую папку, логи и автоперезапуск при падении:

```powershell
nssm set westbot AppDirectory C:\westbot; nssm set westbot AppStdout C:\westbot\logs\out.log; nssm set westbot AppStderr C:\westbot\logs\err.log; nssm set westbot AppRotateFiles 1; nssm set westbot Start SERVICE_AUTO_START
```

Запусти:

```powershell
New-Item -ItemType Directory -Force C:\westbot\logs; nssm start westbot
```

Проверь, что бот в сети:

```powershell
nssm status westbot
```

Должно быть `SERVICE_RUNNING`, а бот — онлайн в Discord.

---

## 7. Управление ботом

| Действие | Команда |
|---|---|
| Статус службы | `nssm status westbot` |
| Запустить | `nssm start westbot` |
| Остановить | `nssm stop westbot` |
| Перезапустить | `nssm restart westbot` |
| Окно настроек службы | `nssm edit westbot` |
| Удалить службу | `nssm remove westbot confirm` |

Логи бота:

```powershell
Get-Content C:\westbot\logs\out.log -Tail 50
```

Логи в реальном времени (выход — `Ctrl+C`):

```powershell
Get-Content C:\westbot\logs\out.log -Wait -Tail 20
```

Ошибки:

```powershell
Get-Content C:\westbot\logs\err.log -Tail 50
```

---

## 8. Обновление бота после правок кода

Скопируй изменённую папку `src` со своего ПК в `C:\westbot` (заменить файлы), затем:

```powershell
nssm restart westbot
```

Если добавлял или менял слэш-команды — сначала:

```powershell
cd C:\westbot; npm run deploy
```

---

## 9. Резервная копия настроек

Все настройки серверов — тикеты, состав администрации, каналы, счётчик тикетов —
лежат в одном файле `C:\westbot\data\guilds.json`. Скопируй его себе на ПК через RDP.

Автобэкап раз в сутки в 04:00 (выполнить один раз):

```powershell
schtasks /create /tn "westbot-backup" /tr "powershell -NoProfile -Command \"Copy-Item C:\westbot\data\guilds.json C:\westbot\backup\guilds-$((Get-Date).ToString('yyyy-MM-dd')).json\"" /sc daily /st 04:00 /ru SYSTEM
```

Не забудь создать папку:

```powershell
New-Item -ItemType Directory -Force C:\westbot\backup
```

---

## 10. Если что-то не работает

**Служба сразу останавливается / бот офлайн**
Смотри `C:\westbot\logs\err.log` — там точная причина.

**`Used disallowed intents`**
В [Developer Portal](https://discord.com/developers/applications) → Bot → Privileged Gateway Intents
включи `PRESENCE`, `SERVER MEMBERS`, `MESSAGE CONTENT`, затем `nssm restart westbot`.

**`TokenInvalid` или `❌ Не задан TOKEN`**
Проверь файл:

```powershell
Get-Content C:\westbot\.env
```

Токен в одну строку, без кавычек и пробелов. Файл должен называться `.env`, а не `.env.txt`.
Если сбрасывал токен в портале — старый больше не работает.

**Команд нет в Discord**
`npm run deploy`, потом `Ctrl+R` в Discord.

**Бот не выдаёт роли / не создаёт тикеты**
Роль бота в настройках сервера должна стоять **выше** всех выдаваемых ролей.

**Бот отвечает дважды**
Работают две копии — например, служба на VDS и `npm start` у тебя на ПК.
Проверь, что запущен только один процесс:

```powershell
Get-Process node -ErrorAction SilentlyContinue
```

**Node.exe лежит не там**
Если при создании службы ошибка про путь — уточни, где Node:

```powershell
(Get-Command node).Source
```

и подставь этот путь в команду `nssm install`.

---

## 11. Безопасность

- Смени стандартный пароль `Administrator` на длинный.
- Не держи RDP с паролем `123456` — Windows-сервера сканируют ботами постоянно.
- Токен бота = полный доступ к нему. Не показывай его в скриншотах и переписке.
  Засветил — Developer Portal → Bot → Reset Token, потом обнови `.env` и `nssm restart westbot`.
- Windows Update на VDS лучше не отключать.
