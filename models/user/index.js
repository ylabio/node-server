const Collection = require('../../services/storage/collection.js');
const {errors, stringUtils} = require('../../lib');
const ObjectID = require('mongodb').ObjectID;
const moment = require('moment');

class User extends Collection {

  constructor() {
    super();
    this.status = {
      REJECT: 'reject',
      NEW: 'new',
      CONFIRM: 'confirm',
    };
  }

  async init(config, services) {
    await super.init(config, services);
    this.mail = await this.services.getMail();
    return this;
  }

  define() {
    const parent = super.define();
    return {
      collection: 'user',
      indexes: {
        phone: [{'phone': 1}, {
          'unique': true,
          partialFilterExpression: {phone: {$gt: ''}, isDeleted: false}
        }],
        email: [{'email': 1}, {
          'unique': true,
          partialFilterExpression: {email: {$gt: ''}, isDeleted: false}
        }]
      },
      // Полная схема объекта
      model: this.spec.extend(parent.model, {
        properties: {
          email: {
            type: 'string',
            format: 'email',
            maxLength: 100,
            errors: {format: 'Incorrect format'}
          },
          phone: {
            type: 'string',
            pattern: '^\\+[0-9]{10,20}$',
            example: '+79993332211',
            errors: {pattern: 'Incorrect format'}
          },
          password: {type: 'string', minLength: 6, errors: {minLength: 'At least 6 characters'}},
          profile: {
            type: 'object',
            description: 'Свойства профиля',
            properties: {
              name: {type: 'string', maxLength: 100, description: 'Имя'},
              surname: {type: 'string', maxLength: 100, description: 'Фамилия'},
              middlename: {type: 'string', maxLength: 100, default: '', description: 'Отчество'},
              avatar: this.spec.generate('rel', {description: 'Аватарка', type: 'file'}),
              birthday: {
                type: 'string',
                anyOf: [{format: 'date-time'}, {const: ''}],
                description: 'Дата рождения',
              }
            },
            required: ['name', 'surname']
          },
          status: {type: 'string', enum: ['new', 'confirm', 'reject']},
        },
        required: ['email', 'phone', 'password', 'profile']
      })
    };
  }

  schemes() {
    return Object.assign({}, super.schemes(), {

      // Схема создания
      create: this.spec.extend(this._define.model, {
        title: 'Пользователь (создание)',
        properties: {
          $unset: [
            '_id', '_type', 'dateCreate', 'dateUpdate', 'isDeleted',
            'status'
          ]
        },
        $set: {
          required: ['email', 'phone', 'password', 'profile'],
        }
      }),

      // Схема редактирования
      update: this.spec.extend(this._define.model, {
          title: 'Пользователь (изменение)',
          properties: {
            $unset: [
              '_id', '_type', 'dateCreate', 'dateUpdate', 'status'
            ],
            profile: {
              $set: {
                required: []
              }
            }
          },
          $set: {
            required: [],
          },
          $mode: 'update'
        }
      ),

      // Схема просмотра
      view: this.spec.extend(this._define.model, {
          title: 'Пользователь (просмотр)',
          properties: {
            $unset: [
              'password'
            ]
          },
          $set: {
            required: []
          },
          $mode: 'view'
        }
      ),

      // Схема авторизации
      signIn: {
        title: 'Авторизация',
        type: 'object',
        properties: {
          login: {
            type: 'string',
            description: 'Email указанный при регистарции',
            example: 'user@example.com'
          },
          password: {type: 'string'},
          remember: {type: 'boolean', description: 'Долгосрочное хранение куки с токеном'}
        },
        required: ['login', 'password'],
        additionalProperties: false
      },

      // Схема сброса пароля
      restore: {
        title: 'Запрос пароля',
        type: 'object',
        properties: {
          login: {
            type: 'string', format: 'email',
            description: 'Email указанный при регистрации', example: 'user@example.com'
          },
        },
        required: ['login'],
        additionalProperties: false
      },

      //Схема смены пароля
      changePassword: {
        title: 'Смена пароля',
        type: 'object',
        properties: {
          oldPassword: {
            type: 'string',
            description: 'Старый пароль'
          },
          newPassword: {
            type: 'string',
            minLength: 6,
            description: 'Новый пароль'
          }
        },
        required: ['oldPassword', 'newPassword'],
        additionalProperties: false
      }
    });
  }

  async createOne({body, view = true, fields = {'*': 1}, session, validate, prepare, schema = 'create'}) {
    let password = '';
    return await super.createOne({
      body, view, fields, session, validate, schema,
      prepare: async (parentPrepare, object) => {
        const prepareDefault = (object) => {
          parentPrepare(object);
          object.email = object.email ? object.email.toLowerCase() : '';
          object.phone = object.phone ? object.phone.toLowerCase() : '';

          if (!object.password) {
            object.password = stringUtils.random(
              this.config.password.length, this.config.password.chars
            );
          }
          password = object.password;

          object.password = stringUtils.hash(object.password);
          object.status = this.status.NEW;

        };
        await (prepare ? prepare(prepareDefault, object) : prepareDefault(object));

        this.notifyReg(object, password);
      }
    });
  }

  async updateOne({id, body, view = true, validate, prepare, fields = {'*': 1}, session}) {
    return super.updateOne({
      id, body, view, fields, session, validate,
      prepare: async (parentPrepare, object) => {
        const prepareDefault = (object) => {
          parentPrepare(object);
          if ('password' in object) {
            object.password = stringUtils.hash(object.password);
          }
        };
        await (prepare ? prepare(prepareDefault, object) : prepareDefault(object));
      }
    });
  }

  /**
   * Смена пароля
   * @param id
   * @param body
   * @param session
   * @param fields
   * @returns {Promise.<boolean>}
   */
  async changePassword({id, body, session, fields = {'*': 1}}) {
    if (!session.user || id !== session.user._id) {
      throw new errors.Forbidden({});
    }
    await this.validate('changePassword', body, session);

    const user = await this.native.findOne({
      _id: new ObjectID(id)
    });

    if (body.oldPassword === body.newPassword) {
      throw new errors.Validation({
        path: ['password'],
        rule: 'equal',
        accept: false,
        message: 'New and old passwords cannot equal'
      });
    }

    if (user.password !== stringUtils.hash(body.oldPassword)) {
      throw new errors.Validation({
        path: ['oldPassword'],
        rule: 'incorrect',
        accept: true,
        message: 'Old passwords was incorrect'
      });
    }

    await this.updateOne({id, body: {password: body.newPassword}, session, fields});

    return true;
  }

  /**
   * Авторизация по логину/паролю
   * @param body
   * @param fields
   * @param session
   * @param fields
   * @returns {Promise.<{user: *, token: *}>}
   */
  async signIn({body, session, fields = {'*': 1}}) {
    const form = await this.validate('signIn', body, session);

    let passwordHash = stringUtils.hash(form.password);
    let user = await this.native.findOne({
      email: form.login, $or: [
        {password: passwordHash}, {newPassword: passwordHash}
      ]
    });
    if (!user) {
      throw new errors.Validation([
        {path: [], rule: 'find', accept: true, message: 'Wrong login or password'}
      ]);
    }
    // Доступ на вход
    if (!this.canAuth(user)) {
      throw new errors.Forbidden({}, 'User is not confirmed or is blocked', '001');
    }
    // Подтверждение нового пароля
    if (user.newPassword !== passwordHash) {
      await this.native.update({_id: user._id}, {
        $set: {
          password: passwordHash
        }
      });
    }
    // Создание токена
    /** @type Token */
    const tokenStorage = this.storage.get('token');
    const token = await tokenStorage.createOne({
      body: {
        user: {_id: user._id.toString(), _type: user._type}
      }
    });
    return {
      user: await this.view(user, {fields, session}),
      token: token.value
    };
  }

  /**
   * Выход (удаление токена)
   * @param session
   * @returns {Promise.<boolean>}
   */
  async signOut({session}) {
    if (session.token && session.token !== 'null') {
      /** @type Token */
      const tokenStorage = await this.storage.get('token');
      await tokenStorage.deleteOne({
        filter: {
          value: session.token
        }
      });
    }
    return true;
  }

  /**
   * Авторизация по токену
   * @param token
   * @param fields
   * @returns {Promise.<*>}
   */
  async auth({token, fields = {'*': 1}}) {
    if (token && token !== 'null') {
      /** @type Token */
      const tokenStorage = await this.storage.get('token');
      return await tokenStorage.getOne({
        filter: {
          value: token,
          isDeleted: false,
          dateCreate: {
            $gte: moment().subtract(1, 'month').toDate()
          }
        },
        fields
      });
    }
    return false;
  }

  /**
   * Запрос пароля
   * @param body
   * @param session
   * @returns {Promise.<boolean>}
   */
  async restore({body, session}) {
    let form = await this.validate('restore', body, session);

    let user = await this.native.findOne({email: form.login});
    if (!user) {
      throw new errors.NotFound({}, 'User not found');
    }
    let password = stringUtils.random(this.config.password.length, this.config.password.chars);
    await this.native.updateOne({_id: user._id}, {
      $set: {
        newPassword: stringUtils.hash(password)
      }
    });
    this.mail.tranport.sendMail({
      to: user.email,
      subject: 'Новый пароль',
      text: `Добрый день!\n\nВы запросили новый пароль: ${password}`
    });
    return true;
  }

  /**
   * Проверка возможности авторизоваться
   * @param user
   * @returns {boolean}
   */
  canAuth(user/*, token*/) {
    // Доступ на вход
    return true;
  }

  notifyReg(user, password) {
    if (user.email && process.env.NODE_ENV !== 'test') {
      this.mail.tranport.sendMail({
        to: user.email,
        subject: 'Регистрация',
        text: `Добрый день, ${user.profile.name} ${user.profile.surname}!\n\n` +
        'Вы успешно зарегистрировались\n\n' +
        `Логин: ${user.email}\n\n` +
        `Пароль: ${password}\n\n`
      });
    }
  }
}

module.exports = User;
