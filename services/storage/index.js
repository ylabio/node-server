const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const {queryUtils, objectUtils, stringUtils} = require('../../lib');
/** @type {Array}*/
const models = require('../../models');
models.push(require('./test/object'));

class Storage {

  constructor() {
  }

  async init(config, services, mode) {
    this.config = config;
    this.services = services;
    this.spec = await this.services.getSpecification();
    this._client = await MongoClient.connect(this.config.db.url, {useNewUrlParser: true});
    this._db = this._client.db(this.config.db.name);
    this._collections = {};
    if (mode === 'clear') {
      await this.clearStorage();
    }
    //this.ObjectId = ObjectID;
    await this.initModels();
    return this;
  }

  async initModels() {
    for (const ModelClass of models) {
      const instance = new ModelClass();
      const type = instance.type();
      this._collections[type] = instance;
      await this._collections[type].init(this.config[instance.configName()], this.services);
    }
  }

  /**
   * Инициализация коллекции
   * @param type
   * @param name
   * @param indexes
   * @param options
   * @param schemes
   * @param service
   * @returns {Promise.<*>}
   */
  async define({type, collection, indexes, options, schemes}, service) {
    if (!collection) {
      throw new TypeError('Not defined name of the collection');
    }
    if (!type) {
      type = collection;
    }
    if (!indexes) {
      indexes = {};
    }
    if (!options) {
      options = {};
    }
    if (!schemes) {
      schemes = {};
    }
    const mongoCollection = await new Promise((resolve, reject) => {
      options.strict = true;
      this._db.collection(collection, options, (err, coll) => {
        if (err !== null) {
          this._db.createCollection(collection, {}, (err, coll) => {
            if (err === null) {
              resolve(coll);
            } else {
              reject(err);
            }
          });
        } else {
          resolve(coll);
        }
      });
    });
    await this._defineIndexes(mongoCollection, indexes);
    if (service) {
      this._collections[type] = service;
    }
    return mongoCollection;
  }

  /**
   * Создание индексов
   * @param collection
   * @param indexes
   * @returns {Promise.<void>}
   * @private
   */
  async _defineIndexes(collection, indexes) {
    const indexKeys = Object.keys(indexes);
    for (let key of indexKeys) {
      if (!indexes[key][1]) {
        indexes[key].push({});
      }
      if (!indexes[key][1].name) {
        indexes[key][1].name = key;
      }
      if (!await collection.indexExists(indexes[key][1].name)) {
        await collection.createIndex(indexes[key][0], indexes[key][1]);
      }
    }
  }

  get db() {
    return this._db;
  }

  /**
   *
   * @param type
   * @returns {Collection}
   */
  getCollectionService(type) {
    if (!this._collections[type]) {
      throw new Error('Collection service "' + type + '" not found');
    }
    return this._collections[type];
  }

  /**
   *
   * @param type
   * @param base
   * @return {(Collection|*)}
   */
  get(type, base = '') {
    if (base) {
      if (!type || !type.match(`^${stringUtils.escapeRegex(base)}($|-)`)) {
        type = base + (type ? '-' + type : '');
      }
    }
    return this.getCollectionService(type);
  }

  /**
   * Догрузка/фильтр свойств объекта
   * @param object
   * @param fields
   * @param empty
   * @param session
   * @returns {Promise<*>}
   */
  async loadByFields({object, fields, empty = true, session}) {
    if (typeof fields === 'string') {
      fields = queryUtils.parseFields(fields);
    }
    if (!fields || fields === 1) {
      return object;
    }
    const keys = Object.keys(fields);
    let result = {};
    if ('*' in fields) {
      result = objectUtils.clone(object);
    }

    for (let key of keys) {
      let rel, link;
      if (key in object) {
        try {
          if (Array.isArray(object[key])) {
            result[key] = [];
            for (let item of object[key]) {

              link = await this.loadByFields({
                object: item,
                fields: fields[key],
                empty: false,
                session
              });
              if (item._id) {
                const rel = await this.loadRel({rel: item, fields: fields[key], session});
                if (Object.keys(rel).length) {
                  link = Object.assign(rel, link);
                  result[key].push(link);
                }
              } else {
                result[key].push(link);
              }
            }
          } else if (typeof object[key] === 'object' && typeof fields[key] === 'object') {
            link = await this.loadByFields({
              object: object[key],
              fields: fields[key],
              empty: false,
              session
            });
            if (object[key]._id && (fields[key]['*'] || Object.keys(fields[key]).length > 0)) {
              result[key] = Object.assign(
                await this.loadRel({rel: object[key], fields: fields[key], session}),
                link
              );
            } else {
              result[key] = link;
            }
          } else {
            if (object[key] && object[key]._id) {
              result[key] = {_id: object[key]._id};
            } else {
              result[key] = object[key];
            }
          }
        } catch (e) {
          console.log(key, object, fields);
          throw e;
        }
      } else if (empty && key !== '*') {
        result[key] = null;
      }
    }
    if (!result._id && object._id) {
      result._id = object._id;
    }
    return result;
  }

  /**
   * Выборка объекта по rel и догрузка/фильтр свойств объекта
   * @param rel
   * @param fields
   * @param session
   * @returns {Promise<*>}
   */
  async loadRel({rel, fields, session}) {
    try {
      if (rel._id && rel._type) {
        return await this.getCollectionService(rel._type).getOne({
          filter: {_id: new ObjectID(rel._id)},
          fields,
          session
        });
      }
    } catch (e) {
    }
    return {};
  }

  async clearStorage() {
    let list = await this._db.listCollections().toArray();
    for (let collection of list) {
      if (collection.name.indexOf('system.') === -1) {
        await this._db.dropCollection(collection.name);
      }
    }
  }

  is(type, needType) {
    return type && needType && !!type.match(`^${stringUtils.escapeRegex(needType)}($|-)`);
  }

  getRootSession() {
    return {
      user: {
        _id: new ObjectID(),
        _type: 'user-admin',
        type: 'admin',
        email: 'root@boolive.com',
        profile: {
          name: 'root',
        },
        status: 'confirm',
        isBlocked: false,
        isDeleted: false
      }
    }
  }
}

module.exports = Storage;
