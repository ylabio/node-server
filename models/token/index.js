const Collection = require('../../services/storage/collection.js');
const {stringUtils} = require('../../lib');

class Token extends Collection {

  define() {
    const parent = super.define();
    return {
      collection: 'token',
      indexes: {
        value: [{'value': 1}, {
          'unique': true,
          partialFilterExpression: {phone: {$gt: ''}, isDeleted: false}
        }]
      },
      // Полная схема объекта
      model: this.spec.extend(parent.model, {
        properties: {
          user: this.spec.generate('rel', {description: 'Пользователь', type: 'user'}),
          value: {type: 'string', description: 'Токен для идентификации'},
        },
        required: ['user']
      })
    };
  }

  schemes() {
    return Object.assign({}, super.schemes(), {

      // Схема создания
      create: this.spec.extend(this._define.model, {
        title: 'Сессия (создание)',
        properties: {
          $unset: [
            '_id', '_type', 'dateCreate', 'dateUpdate', 'isDeleted', 'value'
          ]
        },
      }),

      // Схема редактирования
      update: this.spec.extend(this._define.model, {
          title: 'Сессия (изменение)',
          properties: {
            $unset: [
              '_id', '_type', 'dateCreate', 'dateUpdate', 'value'
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
          title: 'Сессия (просмотр)',
          $set: {
            required: []
          },
          $mode: 'view'
        }
      ),
    });
  }

  async createOne({body, view = true, fields = {'*': 1}, session, validate, prepare, schema = 'create'}) {
    return super.createOne({
      body, view, fields, session, validate, schema,
      prepare: async (parentPrepare, object) => {
        const prepareDefault = async (object) => {
          parentPrepare(object);
          object.value = await stringUtils.generateToken();
        };
        await (prepare ? prepare(prepareDefault, object) : prepareDefault(object));
      }
    });
  }
}

module.exports = Token;
