# Server

## Требования
- Node.js >= 7
- MongoDB 3

## Develop

`npm install`

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

```
server {
    server_name  api.ysa.dev.cuberto.com;

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

### Установка CORS в google starage

Установка CORS для достпа к файлам с разных хостов (со фронта проекта)

Сначала установаить gutils а авторизоваться

`gsutil cors set gs-cors-config.json gs://ysa-image`
`gsutil cors set gs-cors-config.json gs://ysa-other`

## API Doc

По адресу `http://{host сервера}/api/v1/docs` развернута документация в swagger ui