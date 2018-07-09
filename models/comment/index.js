const Collection = require('../../services/storage/collection.js');
const {errors} = require('../../lib');

class Comment extends Collection {

  define() {
    const parent = super.define();
    return {
      collection: 'comment',
      indexes: {
        relativeId: [{'relative._id': 1}],
      },
      model: this.spec.extend(parent.model, {
        properties: {
          author: this.spec.generate('rel', {description: 'Автор', type: 'user'}),
          relative: this.spec.generate('rel', {
            description: 'Сущность, которая комментируется',
            type: [], // означет, что нужно указывать тип сущности
            example: {_id: '599fdd9b667b9a3574db5d5f', _type: 'page'}
          }),
          text: {
            type: 'string', minLength: 1,
            example: 'Текст комментрия'
          }
        },
        required: ['relative', 'text'],
      })
    };
  }

  schemes() {
    return Object.assign({}, super.schemes(), {

      // Схема создания
      create: this.spec.extend(this._define.model, {
        title: 'Комментарий (создание)',
        properties: {
          $unset: [
            '_id', '_type', 'dateCreate', 'dateUpdate', 'isDeleted',
            'author'
          ]
        },
        $set: {
          required: ['relative', 'text'],
        }
      }),

      // Схема редактирования
      update: this.spec.extend(this._define.model, {
          title: 'Комментарий (изменение)',
          properties: {
            $unset: [
              '_id', '_type', 'dateCreate', 'dateUpdate',
              'author'
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
          title: 'Комментарий (просмотр)',
          properties: {
            $unset: []
          },
          $set: {
            required: []
          },
          $mode: 'view'
        }
      ),
    });
  }

  async createOne({body, view = true, fields = {'*': 1}, session}) {

    return super.createOne({
      body, view, fields, session,
      prepare: (parentPrepare, object) => {
        parentPrepare(object);
        object.author = session.user ? {
          _id: session.user._id,
          _type: session.user._type
        } : {};
      }
    });
  }
}

module.exports = Comment;
