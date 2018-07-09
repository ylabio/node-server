# Сервис REST API приложения

Предоставляет express сервер с роутингом из директории `/controllers`, CORS, обработкой ошибок и 
единым форматом JSON ответов. 

У роутера переопределены методы get, post, put, delete, options, patch, head. 
У всех вторым параметром аргументов опционально указывается описанием по OpenAPI спецификации. 
По ней формирует документация в swagger

```js
router.post('/countries', {
    summary: 'Создание страны',
    description: 'Добавление новой страны в справочник',
    tags: ['Geo'],
    parameters: [
      {in: 'body', name: 'country', description: 'Свойства страны', schema: {$ref: '#/components/schemas/country.create'}}
    ],
    responses: {
      201: spec.generateSchema('success', {$ref: '#/components/schemas/country.view'}),
      400: spec.generateSchema('error', 'Bad Request', 400)
    }
  }, async (req, res/*, next*/) => {
    
    res.status(201);
    return await countries.createOne(req.body);
    
  });
```

Реализована общая для всех роутеров логика формирования ответов, их структры и обработки ошибок.
Функции роутеров (callback) возвращают реультат, не обращаясь к обхекту response (при необходимости).
В соотвтесвии с типом результата будет соответствующая струкра ответа. 
Ошибки обрабатываются через перехват исключений и тоже формируется соответсвующая струкруа ответа.

Для обращения к оригинальным методам express роутра используется свойство origin

```js
router.origin.get('/path', callback)
``` 