const {queryUtils, errors} = require('./../../lib');

module.exports = async (router, services) => {

  const spec = await services.getSpecification();
  const storage = await services.getStorage();
  /** @type {Comment} */
  const comments = storage.get('comment');

  /**
   *
   */
  router.post('/comments', {
    operationId: 'comments.create',
    summary: 'Создание',
    description: 'Создание комментария авторизованным пользователем. '
    + 'Автор проставляется автоматически',
    session: spec.generate('session.user', ['user']),
    tags: ['Comments'],
    requestBody: {
      content: {
        'application/json': {schema: {$ref: '#/components/schemas/comment.create'}}
      }
    },
    parameters: [
      {
        in: 'query',
        name: 'fields',
        description: 'Выбираемые поля',
        schema: {type: 'string'},
        example: '_id,text'
      }
    ],
    responses: {
      200: spec.generate('success', {$ref: '#/components/schemas/comment.view'})
    }
  }, async (req) => {

    return await comments.createOne({
      body: req.body,
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });

  /**
   *
   */
  router.get('/comments', {
    operationId: 'comments.list',
    summary: 'Выбор списка (поиск)',
    description: 'Список комментариев с фильтром',
    tags: ['Comments'],
    session: spec.generate('session.user', ['user']),
    parameters: [
      {
        in: 'query',
        name: 'search[relative]',
        description: 'Идентификатор сущности, к которой привязаны комментарии',
        schema: {type: 'string'}
      },
      {$ref: '#/components/parameters/sort'},
      {$ref: '#/components/parameters/limit'},
      {$ref: '#/components/parameters/skip'},
      {
        in: 'query',
        name: 'fields',
        description: 'Выбираемые поля',
        schema: {type: 'string'},
        example: '_id,user(email),text'
      }
    ],
    responses: {
      200: spec.generate('success', {
        items: {
          type: 'array',
          items: {$ref: '#/components/schemas/comment.view'}
        }
      })
    }
  }, async (req) => {
    const filter = queryUtils.formattingSearch(req.query.search, {
      relative: {kind: 'ObjectId', fields: ['relative._id']}
    });
    return comments.getList({
      filter,
      sort: queryUtils.formattingSort(req.query.sort),
      limit: req.query.limit,
      skip: req.query.skip,
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });

  router.put('/comments/:id', {
    operationId: 'comments.update',
    summary: 'Редактирование',
    description: 'Изменение комментария автором или админом',
    tags: ['Comments'],
    session: spec.generate('session.user', ['user']),
    requestBody: {
      content: {
        'application/json': {schema: {$ref: '#/components/schemas/comment.update'}}
      }
    },
    parameters: [
      {
        in: 'path',
        name: 'id',
        description: 'id комментария',
        schema: {type: 'string'}
      },
      {
        in: 'query',
        name: 'fields',
        description: 'Выбираемые поля',
        schema: {type: 'string'},
        example: '_id,text'
      }
    ],
    responses: {
      200: spec.generate('success', {$ref: '#/components/schemas/comment.view'}),
      404: spec.generate('error', 'Not Found', 404)
    }
  }, async (req) => {

    return await comments.updateOne({
      id: req.params.id,
      body: req.body,
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });

  router.delete('/comments/:id', {
    operationId: 'comments.delete',
    summary: 'Удаление',
    description: 'Удаление комментария',
    session: spec.generate('session.user', ['user']),
    tags: ['Comments'],
    parameters: [
      {
        in: 'path',
        name: 'id',
        description: 'Идентификатор комментария',
        schema: {type: 'string'}
      },
      {
        in: 'query',
        name: 'fields',
        description: 'Выбираемые поля',
        schema: {type: 'string'},
        example: '_id,text'
      }
    ],
    responses: {
      200: spec.generate('success', true),
      404: spec.generate('error', 'Not Found', 404)
    }
  }, async (req) => {

    return await comments.deleteOne({
      id: req.params.id,
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });
};
