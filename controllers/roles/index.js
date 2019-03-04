const {queryUtils, errors} = require('./../../lib');

module.exports = async (router, services) => {

  const spec = await services.getSpecification();
  const storage = await services.getStorage();
  /** @type {Role} */
  const roles = storage.get('role');

  /**
   *
   */
  router.post('/roles', {
    operationId: 'roles.create',
    summary: 'Создание',
    description: 'Создание роли',
    //session: spec.generate('session.user', ['user']),
    tags: ['Roles'],
    requestBody: {
      content: {
        'application/json': {schema: {$ref: '#/components/schemas/role.create'}}
      }
    },
    parameters: [
      {
        in: 'query',
        name: 'fields',
        description: 'Выбираемые поля',
        schema: {type: 'string'},
        example: '*'
      }
    ],
    responses: {
      200: spec.generate('success', {$ref: '#/components/schemas/role.view'})
    }
  }, async (req) => {

    return await roles.createOne({
      body: req.body,
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });

  /**
   *
   */
  router.get('/roles', {
    operationId: 'roles.list',
    summary: 'Выбор списка (поиск)',
    description: 'Список ролей с фильтром',
    tags: ['Roles'],
    //session: spec.generate('session.user', ['user']),
    parameters: [
      {
        in: 'query',
        name: 'search[query]',
        description: 'Поиск по названию или заголовку',
        schema: {type: 'string'}
      },
      {$ref: '#/components/parameters/sort'},
      {$ref: '#/components/parameters/perPage'},
      {$ref: '#/components/parameters/page'},
      {
        in: 'query',
        name: 'fields',
        description: 'Выбираемые поля',
        schema: {type: 'string'},
        example: '_id,name,title'
      }
    ],
    responses: {
      200: spec.generate('success', {
        items: {
          type: 'array',
          items: {$ref: '#/components/schemas/role.view'}
        }
      })
    }
  }, async (req) => {
    const filter = queryUtils.formattingSearch(req.query.search, {
      query: {kind: 'regex', fields: ['name','title']}
    });
    return roles.getList({
      filter,
      sort: queryUtils.formattingSort(req.query.sort),
      limit: req.query.perPage,
      skip: queryUtils.pageToSkip({page: req.query.page, perPage: req.query.perPage}),
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });

  router.put('/roles/:id', {
    operationId: 'roles.update',
    summary: 'Редактирование',
    description: 'Изменение роли',
    tags: ['Roles'],
    //session: spec.generate('session.user', ['user']),
    requestBody: {
      content: {
        'application/json': {schema: {$ref: '#/components/schemas/role.update'}}
      }
    },
    parameters: [
      {
        in: 'path',
        name: 'id',
        description: 'id роли',
        schema: {type: 'string'}
      },
      {
        in: 'query',
        name: 'fields',
        description: 'Выбираемые поля',
        schema: {type: 'string'},
        example: '*'
      }
    ],
    responses: {
      200: spec.generate('success', {$ref: '#/components/schemas/role.view'}),
      404: spec.generate('error', 'Not Found', 404)
    }
  }, async (req) => {

    return await roles.updateOne({
      id: req.params.id,
      body: req.body,
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });

  router.delete('/roles/:id', {
    operationId: 'roles.delete',
    summary: 'Удаление',
    description: 'Удаление роли',
    //session: spec.generate('session.user', ['user']),
    tags: ['Roles'],
    parameters: [
      {
        in: 'path',
        name: 'id',
        description: 'Идентификатор роли',
        schema: {type: 'string'}
      },
      {
        in: 'query',
        name: 'fields',
        description: 'Выбираемые поля',
        schema: {type: 'string'},
        example: '_id'
      }
    ],
    responses: {
      200: spec.generate('success', true),
      404: spec.generate('error', 'Not Found', 404)
    }
  }, async (req) => {

    return await roles.deleteOne({
      id: req.params.id,
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });
};
