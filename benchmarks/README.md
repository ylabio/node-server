# Нагрузочный тест

Используется либа [artillery](http://artillery)

Установка
```
npm install -g artillery
```

Запуск тестов

```
artillery run ./benchmarks/users.yml
```

В настройках теста указан хост. Запускать тест можно с внешнего сервера и локально минуя nginx