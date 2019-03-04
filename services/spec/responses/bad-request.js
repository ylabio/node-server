module.exports = {
  description: 'Bad Request',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              // id: {
              //   type: 'number',
              //   'format': 'float',
              //   example: 400.001,
              //   description: 'Код ошибки {статус}.{код}'
              // },
              code: {type: 'string', description: 'Код ошибки'},
              message: {type: 'string', description: 'Сообщение об ошибке'},
              data: {type: 'object', description: 'Данные про ошибки'}
            }
          }
        }
      }
    }
  }
};
