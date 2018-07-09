const {errors, queryUtils} = require('./../../lib');
const ObjectID = require('mongodb').ObjectID;

module.exports = async (router, services) => {

  const spec = await services.getSpecification();
  const storage = await services.getStorage();
  /** @type {User} */
  const users = storage.get('user');

  /**
   *
   */
  router.post('/users', {
    operationId: 'users.create',
    summary: 'Регистрация (создание)',
    description: 'Создание нового пользователя (регистарция).\n'
    + 'Указываются свойства учётной записи и свойства профиля в соответствии с типом (type):'
    + 'player, agent, scout, coach, clubManager, admin, moderator.\n',
    tags: ['Users'],
    session: spec.generate('session.user', []),
    requestBody: {
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/user.create'
          }
        }
      }
    },
    parameters: [
      {
        in: 'query', name: 'fields', description: 'Выбираемые поля',
        schema: {type: 'string'}, example: '_id,email,type,profile(name)'
      }
    ],
    responses: {
      201: spec.generate('success', {$ref: '#/components/schemas/user.view'}),
      400: spec.generate('error', 'Bad Request', 400)
    }
  }, async (req, res) => {

    res.status(201);

    return await users.createOne({
      body: req.body,
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });

  /**
   *
   */
  router.post('/users/sign', {
    operationId: 'users.signIn',
    summary: 'Вход',
    description: 'Авторизация по логину и паролю',
    tags: ['Users'],
    session: spec.generate('session.user', []),
    requestBody: {
      content: {
        'application/json': {schema: {$ref: '#/components/schemas/user.signIn'}}
      }
    },
    parameters: [
      {
        in: 'query',
        name: 'fields',
        description: 'Выбираемые поля по пользователю',
        schema: {
          type: 'string'
        },
        example: '_id,profile(name)'
      }
    ],
    responses: {
      200: spec.generate('success', {
          token: {type: 'string', description: 'Токен'},
          user: {$ref: '#/components/schemas/user.view'}
        },
        {
          'Set-Cookie': {type: 'string', description: 'Токен в "Token"'}
        }
      ),
      400: spec.generate('error', 'Bad Request', 400)
    }
  }, async (req, res/*, next*/) => {
    let result = await users.signIn({
      body: req.body,
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
    if (req.body.remember) {
      res.cookie('token', result.token, {maxAge: 2592000000, httpOnly: false});
    } else {
      res.cookie('token', result.token, {expires: false, httpOnly: false});
    }
    return {
      token: result.token,
      user: result.user
    };
  });

  /**
   *
   */
  router.post('/users/password', {
    operationId: 'users.restore',
    summary: 'Вспомнить пароль',
    description: 'Запрос нового пароля. \n\n' +
    'На указанную почту отправляется новый пароль. ' +
    'Старый пароль заменится новым при первом входе с новым паролем',
    tags: ['Users'],
    session: spec.generate('session.user', []),
    requestBody: {
      content: {
        'application/json': {schema: {$ref: '#/components/schemas/user.restore'}}
      }
    },
    parameters: [],
    responses: {
      200: spec.generate('success', true),
      404: spec.generate('error', 'Not Found', 404)
    }
  }, async (req/*, res/*, next*/) => {
    return await users.restore({
      body: req.body,
      session: req.session
    });
  });

  /**
   *
   */
  router.delete('/users/sign', {
    operationId: 'users.signOut',
    summary: 'Выход',
    description: 'Отмена авторизации. Удаляется текущий токен (token) пользователя',
    tags: ['Users'],
    session: spec.generate('session.user', ['user']),
    parameters: [],
    responses: {
      200: spec.generate('success', true),
      404: spec.generate('error', 'Not Found', 404)
    }
  }, async (req/*, res/*, next*/) => {
    return await users.signOut({
      session: req.session
    });
  });

  /**
   *
   */
  router.get('/users', {
    //proxy: true,
    operationId: 'users.list',
    summary: 'Выбор списка (поиск)',
    description: 'Список пользователей с фильтром',
    tags: ['Users'],
    //session: spec.generate('session.user', ['user']),
    parameters: [
      {
        in: 'query', name: 'search[query]', schema: {type: 'string'}, example: '',
        description: 'Обший поиск по фио, телефону, мылу и др'
      },
      {
        in: 'query', name: 'search[name]', schema: {type: 'string'}, example: '',
        description: 'Поиск по имени и фамилии. "|" - для разделения поисковых фраз'
      },
      {
        in: 'query', name: 'search[email]', schema: {type: 'string'}, example: '',
        description: 'Поиск по email'
      },
      {
        in: 'query', name: 'search[phone]', schema: {type: 'string'}, example: '',
        description: 'Поиск по телефону'
      },
      {
        in: 'query', name: 'search[status]',
        schema: {type: 'string', enum: ['new', 'reject', 'confirm']},
        description: 'Статус пользователя'
      },
      {
        in: 'query', name: 'search[isBlocked]', schema: {type: 'boolean'},
        description: 'Признак блокировки'
      },
      {$ref: '#/components/parameters/sort'},
      {$ref: '#/components/parameters/limit'},
      {$ref: '#/components/parameters/skip'},
      {
        in: 'query',
        name: 'fields',
        description: 'Выбираемые поля',
        schema: {type: 'string'}, example: '_id,email,profile(name)'
      }
    ],
    responses: {
      200: spec.generate('success', {
        items: {
          type: 'array',
          items: {$ref: '#/components/schemas/user.view'}
        }
      })
    }
  }, async (req/*, res*/) => {

    const filter = queryUtils.formattingSearch(req.query.search, {
      query: {fields: ['profile.name', 'profile.surname', 'email', 'phone']},
      name: {fields: ['profile.name', 'profile.surname']},
      status: {kind: 'const', fields: ['status']},
      email: {fields: ['email']},
      phone: {fields: ['phone']},
      isBlocked: {kind: 'bool', fields: ['isBlocked']}
    });

    return await users.getList({
      filter,
      sort: queryUtils.formattingSort(req.query.sort),
      limit: req.query.limit,
      skip: req.query.skip,
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });

  /**
   *
   */
  router.get('/users/:id', {
    operationId: 'users.one',
    summary: 'Выбор одного',
    description: 'Пользователь по идентификатору',
    tags: ['Users'],
    session: spec.generate('session.user', ['user']),
    parameters: [
      {
        in: 'path',
        name: 'id',
        schema: {type: 'string'},
        description: 'Идентификатор пользователя или self для выборки по токену текущего юзера'
      },
      {
        in: 'query',
        name: 'fields',
        description: 'Выбираемые поля',
        schema: {type: 'string'}, example: '_id,email,type,profile(name)'
      }
    ],
    responses: {
      200: spec.generate('success', {$ref: '#/components/schemas/user.view'}),
      404: spec.generate('error', 'Not Found', 404)
    }
  }, async (req/*, res*/) => {

    if (!req.params.id || (req.params.id === 'self' && !req.session.user)) {
      throw new errors.NotFound();
    }

    const filter = queryUtils.formattingSearch({
      _id: req.params.id === 'self'
        ? req.session.user._id
        : req.params.id,
    }, {
      _id: {kind: 'ObjectId'},
    });

    return await users.getOne({
      filter,
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });

  });

  /**
   *
   */
  router.put('/users/:id', {
    operationId: 'users.update',
    summary: 'Редактирование',
    description: 'Измненение свойств пользователя. Доступно владельцу профиля и админу',
    tags: ['Users'],
    session: spec.generate('session.user', ['user']),
    requestBody: {
      content: {
        'application/json': {schema: {$ref: '#/components/schemas/user.update'}}
      }
    },
    parameters: [
      {
        in: 'path',
        name: 'id',
        schema: {type: 'string', minLength: 24, maxLength: 24},
        description: 'Идентификатор пользователя'
      },
      {
        in: 'query',
        name: 'fields',
        description: 'Выбираемые поля по пользователю',
        schema: {type: 'string'}, example: '_id,type,profile(name)'
      },
      {
        in: 'query',
        name: 'fields',
        description: 'Выбираемые поля',
        schema: {type: 'string'}, example: '_id,email,type,profile(name)'
      }
    ],
    responses: {
      200: spec.generate('success', {$ref: '#/components/schemas/user.view'}),
      400: spec.generate('error', 'Bad Request', 400),
      404: spec.generate('error', 'Not Found', 404)
    }
  }, async (req/*, res*/) => {

    const user = await users.getOne({filter: new ObjectID(req.params.id), session: req.session});

    return await storage.get(user._type, 'user').updateOne({
      id: req.params.id,
      body: req.body,
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });

  /**
   *
   */
  router.delete('/users/:id', {
    operationId: 'users.delete',
    summary: 'Удаление',
    description: 'Удаляется учётная запись. Помечается признаком isDeleted',
    tags: ['Users'],
    session: spec.generate('session.user', ['user']),
    parameters: [
      {
        in: 'path',
        name: 'id',
        schema: {type: 'string', minLength: 24, maxLength: 24},
        description: 'Идентификатор пользователя'
      },
      // {
      //   in: 'query',
      //   name: 'fields',
      //   description: 'Выбираемые поля',
      //   schema: {type: 'string'},
      //   example: '_id,email,type,profile(name)'
      // }
    ],
    responses: {
      200: spec.generate('success', true),
      404: spec.generate('error', 'Not Found', 404)
    }
  }, async (req/*, res*/) => {

    const user = await users.getOne({filter: new ObjectID(req.params.id), session: req.session});

    return await storage.get(user._type, 'user').deleteOne({
      id: req.params.id,
      session: req.session,
      //fields: queryUtils.parseFields(req.query.fields)
    });
  });

  router.put('/users/:id/password', {
    operationId: 'users.password',
    summary: 'Смена пароля',
    description: 'Изменение пароля авторизованного пользователя',
    tags: ['Users'],
    session: spec.generate('session.user', ['user']),
    requestBody: {
      content: {
        'application/json': {schema: {$ref: '#/components/schemas/user.changePassword'}}
      }
    },
    parameters: [
      {
        in: 'path',
        name: 'id',
        schema: {type: 'string', minLength: 24, maxLength: 24},
        description: 'Идентификатор пользователя'
      },
    ],
    responses: {
      200: spec.generate('success'),
      400: spec.generate('error', 'Bad Request', 400),
      403: spec.generate('error', 'Forbidden', 403)
    }
  }, async (req/*, res*/) => {
    return await users.changePassword({
      id: req.params.id,
      body: req.body,
      session: req.session,
      //fields: queryUtils.parseFields(req.query.fields)
    });
  });
};
