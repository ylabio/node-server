const Collection = require('../collection.js');
const {errors} = require('../../../lib/index');
const ObjectID = require('mongodb').ObjectID;

/**
 * Для тестирования
 */
class Object extends Collection {

  define() {
    const parent = super.define();
    return {
      collection: 'object',
      description: 'Тестовая модель',
      indexes: {
        title: [{'title': 1}, {}],
      },
      // Полная схема объекта
      model: this.spec.extend(parent.model, {
        properties: {
          name: {type: 'string', maxLength: 100},
          status: {type: 'string', enum: ['new', 'confirm'], default: 'new'},
          children: {
            type: 'array',
            items: this.spec.generate('rel', {
              description: 'Подчиненные объекты',
              type: 'object',
              inverse: 'parent',
              copy:'name'
            })
          },
          parent: this.spec.generate('rel', {
            description: 'Родительский клуб',
            type: 'object',
            inverse: 'children',
            copy:'name'
          }),
        },
        $set: {
          required: [
            'name'
          ]
        },
      })
    };
  }

  schemes() {
    return {
      // Схема создания
      create: this.spec.extend(this._define.model, {
        title: 'Test (создание)',
        properties: {
          $unset: [
            '_id', '_type',
            'dateCreate', 'dateUpdate', 'isDeleted'
          ]
        }
      }),

      // Схема редактирования
      update: this.spec.extend(this._define.model, {
          title: 'Test (изменение)',
          properties: {
            $unset: [
              '_id', '_type',
              'dateCreate', 'dateUpdate'
            ]
          },
          $set: {
            required: []
          },
          $mode: 'update'
        }
      ),

      // Схема просмотра
      view: this.spec.extend(this._define.model, {
          title: 'Test (просмотр)',
          $set: {
            required: []
          },
          $mode: 'view'
        }
      ),
    };
  }
}

module.exports = Object;
