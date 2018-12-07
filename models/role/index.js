const Collection = require('../../services/storage/collection.js');

class Role extends Collection {

  define() {
    const parent = super.define();
    return {
      collection: 'role',
      indexes: this.spec.extend(parent.indexes, {
        //relativeId: [{'relative._id': 1}],
      }),
      model: this.spec.extend(parent.model, {
        title: 'Роль',
        properties: {
          name: {type: 'string', description: 'Кодовое название', minLength: 2, maxLength: 200},
          title: {type: 'string', description: 'Заголовок', minLength: 2, maxLength: 200},
          description: {type: 'string', description: 'Описание', default: '', maxLength: 100}
        },
        required: ['name', 'title'],
      })
    };
  }

  schemes() {
    return this.spec.extend(super.schemes(), {
      // Схема создания
      create: {
        properties: {
          $unset: []
        },
      },
      // Схема редактирования
      update: {
        properties: {
          $unset: [],
        }
      },
      // Схема просмотра
      view: {
        properties: {
          $unset: []
        }
      },
    });
  }
}

module.exports = Role;
