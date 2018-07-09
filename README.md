# Server

## Requirements

- Node.js >= 7
- MongoDB >= 3

## Settings

Настроойки всех сервисов проекта в файле `./config.js`

Локальные настройки в `./config-local.js` В них переопределяются общие настройки на значения,
которые не должны попасть в репозиторий. Например параметры доступа к базе.

В файле  `./config-spec.js` настройки для автотестирование, в частности, указывается тестовая база данных.

## Develop

`npm install` Установка пакетов при развертывании или обновлениии кода.

`npm test` Автотестирование.

`npm run eslint` Проверка синтаксиса.

`npm start` Запуск сервера. Автоматически создаётся база, коллекции, индексы, если чего-то нет.

## Production

Используется менеджер процессов PM2.

`npm install pm2 -g` Установка PM2.

`pm2 start process.json` Запуск сервера.

`pm2 stop process.json` Остановка.

`pm2 delete process.json` Удаление сервера из менеджера процессов.

`pm2 monit` Мониторинг процесса.

`pm2 logs all` Просмотр логов процессов

## File uploads

Используется Google Storage. Загрузка выполняется проксированием потока в Google Storage.
В ngnix необходимо отключить кэширование загружаемых данных и установить необходимый лимит post данных.
Отключать кэшировать, чтобы nginx не сохранял фрагменты даных, а сразу отдавал в поток node.

Ключ доступа в `/keys/google-storage`

## Nginx

Пример настройки сервера nginx

```
server {
    server_name  example.com;

    client_max_body_size 4g; // лимит загружаемых файлов
    proxy_request_buffering off; // не сохранять на сервере

    location / {
        // Все запросы в node.js
        proxy_redirect          off;
        proxy_set_header Host $host;
        proxy_set_header    X-Real-IP           $remote_addr;
        proxy_set_header    X-Forwarded-For     $proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto   $scheme;
        proxy_set_header    X-Frame-Options     SAMEORIGIN;

        proxy_pass http://127.0.0.1:8040; //локальный хост сервера на node.js
    }
}
```

### Установка CORS в google storage

Установка CORS для доступа к файлам с разных хостов (со фронта проекта)

Сначала установаить gutils и авторизоваться

`gsutil cors set gs-cors-config.json gs://backet-image`

`gsutil cors set gs-cors-config.json gs://backet-other`

## API Doc

По адресу `http://{host сервера}/api/v1/docs` развернута документация в swagger ui
