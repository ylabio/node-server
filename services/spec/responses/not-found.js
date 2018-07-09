module.exports = {
  description: 'Not Found',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                'format': 'float',
                example: 404.000,
                description: 'Код ошибки {статус}.{код}'
              },
              code: {type: 'string', description: 'Строковый код ошибки'},
              message: {type: 'string', description: 'Сообщение об ошибке'},
              data: {type: 'object'}
            }
          }
        }
      }
    }
  }
};
