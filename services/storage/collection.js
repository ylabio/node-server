const ObjectID = require('mongodb').ObjectID;
const moment = require('moment');
const {errors, queryUtils, objectUtils, stringUtils} = require('./../../lib');

class Collection {

  constructor() {
  }

  type() {
    if (!this._type) {
      this._type = stringUtils.toDash(this.constructor.name);
    }
    return this._type;
  }

  configName() {
    return this.type();
  }

  /**
   * @param config
   * @param services {Services}
   * @returns {Promise.<Collection>}
   */
  async init(config, services) {
    this.config = config;
    this.services = services;
    this.spec = await this.services.getSpec();
    this.storage = await this.services.getStorage();

    this._define = this.define();
    this._schemes = await this.schemes();
    this._links = this.spec.findLinks(this._define.model);

    this.native = await this.storage.define(this._define, this);

    // Схемы в спецификацию
    // if (this._define.schema) {
    //   this.spec.schemas(this.type(), this._define.schema);
    // }
    const keys = Object.keys(this._schemes);
    for (let key of keys) {
      this.spec.schemas(this.type() + '.' + key, this._schemes[key]);
    }
    // if (Object.keys(this._links).length) {
    //   console.log(this.type(), this._links);
    // }
    return this;
  }

  /**
   * Параметры коллекции
   * @returns {{collection: string, indexes: {}}}
   */
  define() {
    return {
      collection: 'objects', // название коллекции в монге
      indexes: {
        //name: [{'title': 1}, {'unique': true, partialFilterExpression: {isDeleted: false}}],
      },
      options: {},
      model: {
        type: 'object',
        title: 'Объект',
        properties: {
          _id: {type: 'string', description: 'Идентификатор ObjectId'},
          _type: {type: 'string', description: 'Тип объекта'},
          dateCreate: {type: 'string', format: 'date-time', description: 'Дата и время создания в секундах'},
          dateUpdate: {type: 'string', format: 'date-time', description: 'Дата и время обновления в секундах', default: 0},
          isDeleted: {type: 'boolean', description: 'Признак, удалён ли объект', default: false},
        },
        additionalProperties: false
      }
    };
  }

  /**
   * Схемы для валидации или фильтра. Применются в методах коллекции
   * @returns {{}}
   */
  schemes() {
    return {

      // Схема создания
      create: this.spec.extend(this._define.model, {
        title: 'Объект (создание)',
        properties: {
          $unset: ['_id', '_type', 'dateCreate', 'dateUpdate', 'isDeleted'],
        },
        $set: {
          required: []
        }
      }),

      // Схема редактирования
      update: this.spec.extend(this._define.model, {
          title: 'Объект (изменение)',
          properties: {
            $unset: [
              '_id', '_type', 'dateCreate', 'dateUpdate'
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
        title: 'Объект (просмотр)',
        properties: {
          $unset: []
        },
        $set: {
          required: []
        },
        $mode: 'view'
      }),

      delete: this.spec.extend(this._define.model, {
        title: 'Объект (удаление)',
        properties: {
          $leave: [
            'isDeleted'
          ]
        },
        $set: {
          required: ['isDeleted']
        },
      })
    };
  }

  /**
   * Выбор одного объекта
   * @param filter
   * @param view Применить схему валидации view (фильтровать) для найденного объекта
   * @param fields Какие поля выбрать, если view == true (с учётом схему валидации)
   * @param session Объект сессии с авторизованным юзером, языком
   * @param throwNotFound Исключение, если объект не найден
   * @returns {Promise.<*>}
   */
  async getOne({filter = {}, view = true, fields = {'*': 1}, session, throwNotFound = true}) {
    const pFields = queryUtils.parseFields(fields) || fields || {};
    let result = await this.native.findOne(filter);
    if (throwNotFound && (!result || (view && !('isDeleted' in pFields) && result.isDeleted))) {
      throw new errors.NotFound({}, 'Not found');
    }
    if (result && view) {
      result = await this.view(result, {fields: pFields, session, view});
    }
    return result;
  }

  /**
   * Выбор списка
   * @param filter
   * @param sort
   * @param limit
   * @param skip
   * @param view Отфильтровать ответ в соответсвии со схемой отображения
   * @param fields
   * @param session
   * @param isDeleted
   * @returns {Promise.<Array>}
   */
  async getList({
                  filter = {}, sort = {}, limit = 10, skip = 0, view = true, fields = {'*': 1},
                  session, isDeleted = true, distinct = ''
                }) {
    if (isDeleted) {
      filter = Object.assign({$or: [{isDeleted: false}, {isDeleted: {$exists: false}}]}, filter);
    }
    let list;
    if (distinct) {
      list = await this.native.find(filter)
        .sort(sort)
        .skip(parseInt(skip) || 0)
        .limit(parseInt(limit) || 10)
        .toArray();
    } else {
      list = await this.native.find(filter)
        .sort(sort)
        .skip(parseInt(skip) || 0)
        .limit(parseInt(limit) || 10)
        .toArray();
    }
    if (view) {
      list = await this.viewList(list, {fields, session, view});
    }

    if (fields && fields.items && fields.count) {
      const count = await this.native.count(filter);
      return {
        items: list,
        count: count
      };
    }

    return list;
  }

  async viewList(list, options = {}, limit = 0) {
    let result = [];
    const source = list.items ? list.items : list;
    const f = options.fields && options.fields.items ? options.fields.items : options.fields;
    for (const item of source) {
      result.push(await this.view(item, Object.assign({}, options, {fields: f})));
    }
    if (limit) {
      result = result.slice(0, limit);
    }
    if (Array.isArray(list.items)) {
      return Object.assign(list, {items: result});
    } else {
      return result;
    }
  }

  /**
   * Создание одного объекта
   * @param object
   * @param view
   * @param override
   * @returns {Promise.<*|Object>}
   */
  async createOne({body, view = true, validate, prepare, fields = {'*': 1}, session, schema = 'create'}) {
    try {
      let object = objectUtils.clone(body);

      // Валидация с возможностью переопредления
      const validateDefault = (object) => this.validate(schema, object, session);
      object = await (validate ? validate(validateDefault, object) : validateDefault(object));

      // Системная установка/трансформация свойств
      const prepareDefault = (object) => {
        object._id = new ObjectID();
        object._type = this.type();
        object.dateCreate = moment().toDate();
        object.dateUpdate = moment().toDate();
        object.isDeleted = false;
      };
      await (prepare ? prepare(prepareDefault, object) : prepareDefault(object));

      // Конвертация свойств для монги
      object = await this.convertTypes(object);

      // запись в базу
      let result = (await this.native.insertOne(object)).ops[0];

      // По всем связям оповестить об их добавлении
      await this.saveLinks({
        object: result,
        path: '',
        set: result
      });

      // Подготовка на вывод
      return view ? await this.view(result, {fields, session, view}) : result;
    } catch (e) {
      throw errors.convert(e);
    }
  }

  /**
   * Обновление одного объекта
   * @param _id
   * @param object
   * @param view
   * @param override
   * @returns {Promise.<*>}
   */
  async updateOne({id, body, view = true, validate, prepare, fields = {'*': 1}, session, prev, schema = 'update'}) {
    try {
      let object = objectUtils.clone(body);
      const _id = new ObjectID(id);

      if (!prev) {
        prev = await this.native.findOne({_id});
      }

      // Валидация с возможностью переопредления
      const validateDefault = (object) => this.validate(schema, object, session);
      object = await (validate ? validate(validateDefault, object, prev) : validateDefault(object, prev));

      // @todo удаление обратных связей, если связи изменены

      // Конвертация значений для монги
      object = await this.convertTypes(object);

      // Системная установка/трансформация свойств
      const prepareDefault = (object, prev) => {
        object.dateUpdate = moment().unix();
      };
      await (prepare ? prepare(prepareDefault, object, prev) : prepareDefault(object, prev));

      // Конвертация в плоский объект
      let $set = objectUtils.convertForSet(object);

      let result = await this.native.updateOne({_id}, {$set});

      if (result.matchedCount) {
        const objectNew = await this.getOne({filter: {_id}, view: false, fields, session});

        // Обновление обратных отношений
        await this.saveLinks({
          object: objectNew, // новый объект
          path: '',
          set: objectNew, // новый объект для рекурсивного обхода
          setPrev: prev, // старый объект для рекурсивного обхода
          changes: object // изменения
        });

        return view ? await this.view(objectNew, {fields, session, view}) : objectNew;
      }

      //throw new errors.NotFound({_id}, 'Not found for update');
      return false;
    } catch (e) {
      throw errors.convert(e);
    }
  }

  async updateMany({filter, body, validate, prepare, session, schema = 'update'}) {
    try {
      let object = objectUtils.clone(body);

      // Валидация с возможностью переопредления
      const validateDefault = (object) => this.validate(schema, object, session);
      object = await (validate ? validate(validateDefault, object) : validateDefault(object));

      // Конвертация значений для монги
      object = await this.convertTypes(object);

      // Системная установка/трансформация свойств
      const prepareDefault = (object) => {
        object.dateUpdate = moment().unix();
      };
      await (prepare ? prepare(prepareDefault, object) : prepareDefault(object));

      // Конвертация в плоский объект
      let $set = objectUtils.convertForSet(object);

      let result = await this.native.updateMany(filter, {$set});

      if (result.matchedCount) {
        return true;
      }
      return false;
    } catch (e) {
      throw errors.convert(e);
    }
  }

  /**
   * Создание или перезапись объекта
   * @param filter
   * @param object
   * @param view Отфильтровать ответ в соответсвии со схемой отображения
   * @returns {Promise.<*>}
   */
  async upsertOne({filter, body, view = true, fields = {'*': 1}, session}) {
    let result;
    let object = await this.native.findOne(filter);
    if (!object) {
      result = await this.createOne({body, view, fields, session});
    } else {
      result = await this.updateOne({
        id: object._id.toString(), body, view, fields, session, prev: object
      });
    }
    return result;
  }

  /**
   * Физическое удаление объекта
   * @param _id
   * @returns {Promise.<boolean>}
   */
  async destroyOne({id/*, fields = {'*': 1}*/, session}) {

    // По всем связям оповестить об удалении

    let result = await this.native.deleteOne({_id: new ObjectID(id)});
    if (result.deletedCount === 0) {
      throw new errors.NotFound({_id: id}, 'Not found for delete');
    }
    return true;
  }

  /**
   * Пометка объекта как удаленный
   * @param id
   * @returns {Promise.<boolean>}
   */
  async deleteOne({id, fields = {'*': 1, 'isDeleted': 1}, session}) {
    // По всем связям оповестить об изменении isDelete
    const pFields = queryUtils.parseFields(fields) || fields || {};
    pFields.isDeleted = 1;
    const _id = new ObjectID(id);
    return await this.updateOne({
      id: _id,
      body: {isDeleted: true},
      fields: pFields,
      session,
      schema: 'delete'
    });
  }

  /**
   * Удаление нескольких объектов
   * @param filter
   * @param session
   * @returns {Promise.<boolean>}
   */
  async deleteMany({filter, session}) {
    // У всех объектов по всем их связям оповестить об удалении
    // !Но это не эффективно
    await this.native.updateMany(filter, {
      $set: {
        isDeleted: true
      }
    });
    return true;
  }

  async upsertItem({_id, path, body, fields, view, session}) {

  }

  async removeItem({_id, path, body, fields, view, session}) {

  }

  async viewAppend(object, options = {}) {
    return object;
  }

  /**
   * Фильтр объекта по схеме и fields, и подгрузка связанных сущностей
   * @param object
   * @param options
   * @returns {Promise.<*>}
   */
  async view(object, options = {}) {
    const _view = (typeof options.view === 'undefined' || options.view === true)
      ? {type: true, schema: true, fields: true}
      : options.view || {};

    object = await this.viewAppend(object, options);

    if (_view.type || _view.schema) {
      object = await this.reconvertTypes(object);
    }
    if (_view.schema) {
      object = await this.validate(options.schema || 'view', object, options.session);
    }
    if (_view.fields) {
      if (typeof options.fields !== 'string' &&
        (!options.fields || !Object.keys(options.fields).length)) {
        options.fields = {_id: 1};
      }
      object = await this.storage.loadByFields(
        {object, fields: options.fields, session: options.session || {}}
      );
    }
    return object;
  }

  reconvertTypes(obj) {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        obj[i] = this.reconvertTypes(obj[i]);
      }
    } else if (obj instanceof String || obj instanceof Number || obj instanceof Boolean) {
      obj = obj.valueOf();
    } else if (typeof obj === 'object' && obj !== null) {
      if (obj instanceof ObjectID) {
        return obj.toString();
      } else if (obj instanceof Date) {
        return obj.toISOString();
      } else {
        let keys = Object.keys(obj);
        for (let key of keys) {
          obj[key] = this.reconvertTypes(obj[key]);
        }
      }
    }
    return obj;
  }

  convertTypes(obj) {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        obj[i] = this.convertTypes(obj[i]);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      let keys = Object.keys(obj);
      for (let key of keys) {
        if (key === '_id' && obj[key]) {
          obj[key] = new ObjectID(obj[key]);
        } else if ((key === 'birthday' || /^date([A-Z]|$)/.test(key)) &&
          (key !== 'dateGame') && typeof obj[key] === 'string' && obj[key]) {
          obj[key] = moment(obj[key]).toDate();
        } else /*if (key !== '$outer')*/{
          obj[key] = this.convertTypes(obj[key]);
        }
      }
    }
    return obj;
  }

  async saveLinks({object, path, set, setPrev, changes, canDelete = true}) {
    let exists = {};
    if (Array.isArray(set)) {
      for (let i = 0; i < set.length; i++) {
        const setPrevItem = set[i]._id && setPrev && setPrev.find(
          item => {
            if (!item) {
              console.log(path, set, setPrev);
            }
            return item._id && item._id.toString() === set[i]._id.toString();
          }
        );
        await this.saveLinks({
          object,
          path: `${path}`,
          set: set[i],
          setPrev: setPrevItem ? setPrevItem : undefined,
          changes,
          canDelete: false
        });
        if (set[i]._id) {
          exists[set[i]._id] = true;
        }
      }
      if (setPrev) {
        for (let i = 0; i < setPrev.length; i++) {
          if (setPrev[i]._id && !exists[setPrev[i]._id]) {
            await this.storage.getCollectionService(setPrev[i]['_type']).onForeignDelete({
              object,
              path: `${path}`,
              link: setPrev[i]
            });
          }
        }
      }
    } else if (typeof set === 'object') {
      if (path && set['_id'] && set['_type']) {

        if (!setPrev || !setPrev['_id'] || !setPrev['_type']) {
          // Если свойство новое или ранее не являлось связью
          await this.storage.getCollectionService(set['_type']).onForeignAdd({
            object,
            path,
            link: set
          });
        } else if (setPrev['_id'].toString() !== set['_id'].toString()) {
          if (canDelete) {
            // Если свойство ранее было другой связью
            await this.storage.getCollectionService(setPrev['_type']).onForeignDelete({
              object,
              path,
              link: setPrev
            });
          }
          await this.storage.getCollectionService(set['_type']).onForeignAdd({
            object,
            path,
            link: set
          });
        } else {
          // Связь не обновилась. Но уведомляем об изменении объекта
          await this.storage.getCollectionService(set['_type']).onForeignUpdate({
            object,
            path,
            link: set,
            changes
          });
        }
      } else if (path && Object.keys(set).length === 0 && setPrev && setPrev['_id'] && setPrev['_type']) {
        await this.storage.getCollectionService(setPrev['_type']).onForeignDelete({
          object,
          path,
          link: setPrev
        });
      } else {
        let keys = Object.keys(set);
        for (let key of keys) {
          if (key !== '_id' && key !== '_type') {
            await this.saveLinks({
              object,
              path: `${path}${path ? '.' : ''}${key}`,
              set: set[key],
              setPrev: setPrev ? setPrev[key] : undefined,
              changes
            });
          }
        }
      }
    }
    // Перебор свойств sepPrev, которые не просмотерны - там удаленные связи
    // if (setPrev){
    //
    // }
  }

  async removeLinks(object, path, set) {

  }


  async validate(schemeName, object, session) {
    if (this._schemes[schemeName]) {
      await this.spec.validate(`${this.type()}.${schemeName}`, object, {
        session: session || {},
        collection: this
      });
    }
    return object;
  }

  /**
   * Общее определение связи
   * @param path Свойство в котором устанваливается связь
   * @param link Объект связи {_id, _type,...}
   * @returns {Promise.<{_id}>}
   */
  async onLinkPrepare({path, link}) {
    if (this._links && this._links[path]) {
      let props = {
        _id: link._id,
        _type: link._type
      };
      if (this._links[path].copy) {
        Object.assign(
          props,
          await this.storage.get(link._type).view(
            link,
            {fields: this._links[path].copy, view: {type: true, fields: true}}
          ));
      }
      if (this._links[path].prepare) {
        Object.assign(
          props,
          await this._links[path].prepare({path, link, foreign: false})
        );
      }
      if (this._links[path].search) {
        const obj = await this.storage.get(link._type).view(
          link,
          {fields: this._links[path].search, view: {type: true, fields: true}}
        );
        delete obj._id;
        props.search = objectUtils.getAllValues(obj, true);
      }
      return props;
    }
  }

  /**
   * Установка обратной связи, если в схеме есть её опредление в inverse
   * @param object Объект, в котором уставлена связь
   * @param path Свойство объекта, в котором связь
   * @param link Объект связи на объект, где нужно создать обратную связь
   * @returns {Promise.<void>}
   */
  async onForeignAdd({object, path, link}) {
    if (this._links) {
      const keys = Object.keys(this._links);

      for (const key of keys) {

        if (this._links[key]._type === object._type &&
          this._links[key].inverse === path) {
          let props = {
            _id: object._id,
            _type: object._type
          };
          if (this._links[key].copy) {
            Object.assign(
              props,
              await this.storage.getCollectionService(object._type).view(
                object,
                {fields: this._links[key].copy, view: {type: true, fields: true}}
              ));
          }
          if (this._links[key].prepare) {
            Object.assign(
              props,
              await this._links[key].prepare({object, path, link, foreign: true})
            );
          }
          // Если size=1 и ссылка уже есть, то нужно проинформировать об её удалении
          // Если size=1 то $set
          if (this._links[key].size === '1') {
            try {
              const prevObject = await this.getOne({
                filter: {_id: new ObjectID(link._id)},
                view: {type: true}
              });
              // Если key уже опредлен, то нужно сообщить об удалении обратной связи
              if (prevObject[key] && prevObject[key]._id && prevObject[key]._type) {
                await this.storage.getCollectionService(prevObject[key]._type).onForeignDelete({
                  object: prevObject,
                  path: key,
                  link: prevObject[key]
                });
              }
            } catch (e) {
              console.log(e);
            }
            await this.native.updateOne({_id: new ObjectID(link._id)}, {
              $set: {[key]: this.convertTypes(props)}
            });
          } else {
            await this.native.updateOne({_id: new ObjectID(link._id)}, {
              $push: {[key]: this.convertTypes(props)}
            });
          }
        }
      }
    }
  }

  async onForeignDelete({object, path, link}) {
    if (this._links) {
      const keys = Object.keys(this._links);
      for (const key of keys) {
        if (this._links[key]._type === object._type &&
          this._links[key].inverse === path && !this._links[key].remember) {
          await this.onForeignDeleteKey({key, object, path, link});
        }
      }
    }
  }

  async onForeignDeleteKey({key, object, path, link}) {
    // Если size=1, то $set={}
    if (this._links[key].size === '1') {
      // @todo Возможно, надо убедиться, что в свойстве удаляемая связь
      await this.native.updateOne({_id: new ObjectID(link._id)}, {
        $set: {[key]: {}}
      });
    } else {
      await this.native.updateOne({_id: new ObjectID(link._id)}, {
        $pull: {[key]: {_id: new ObjectID(object._id)}}
      });
    }
  }

  async onForeignUpdate({object, path, link, changes}) {
    if (this._links) {
      const keys = Object.keys(this._links);
      for (const key of keys) {
        if (this._links[key]._type === object._type &&
          this._links[key].inverse === path) {
          let props = {
            _id: object._id,
            _type: object._type
          };
          if (this._links[key].copy) {
            Object.assign(
              props,
              await this.storage.getCollectionService(object._type).view(
                object,
                {fields: this._links[key].copy}
              ));
          }
          if (this._links[key].prepare) {
            Object.assign(
              props,
              await this._links[key].prepare({object, path, link, changes, foreign: true})
            );
          }
          props = this.convertTypes(props);
          // Если size=1, то $set: {[key]: props} без поиска элемента
          if (this._links[key].size === '1') {
            await this.native.updateOne({_id: new ObjectID(link._id)}, {
              $set: {[key]: props}
            });
          } else {
            await this.native.updateOne({_id: new ObjectID(link._id), [`${key}._id`]: props._id}, {
              $set: {[`${key}.$`]: props}
            });
          }
        }
      }
    }
  }

  async remakeLinks({filter}) {

    // Курсор на список документов с учётом filter

    // Рекурсивный перебор свойств (нужно учитывать вложенность, массивы)
    // При обнаружении свойства-отношения
    // 1) Если связь обратная и у связанного объекта нет связи или самого объекта нет, то обратную связь надо удалить
    // 2) иначе обновить поля обратной связи
    // 3) Если связь обычная, то обновить поля связи
    // подготавливать по нему свежие данные

  }

}

module.exports = Collection;
