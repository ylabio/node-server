module.exports = {
  in: 'query',
  name: 'lang',
  description: 'Язык запроса. ' +
  'Если не указан, то определяется по заголовку X-Lang или AcceptLanguage. ' +
  'Если указать "all", то вернуться все переводы',
  schema: {type: 'string'},
  example: 'ru'
};
