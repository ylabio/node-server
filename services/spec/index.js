const Ajv = require('ajv');
const ObjectID = require('mongodb').ObjectID;
const {errors, objectUtils, queryUtils} = require('./../../lib');
const acceptLanguage = require('accept-language');
const languagesCodes = Object.keys(require('./languages'));

class Spec {

  constructor() {
    this.validator = new Ajv({
      v5: true,
      removeAdditional: true,
      useDefaults: true,
      coerceTypes: true,
      messages: true,
      allErrors: true,
      verbose: true,
      passContext: true
    });

    this.specification = {
      $async: true,
      openapi: '3.0.0',
      info: {
        title: 'API',
        version: '1.0.0',
      },
      servers: [],
      paths: {},
      components: {
        schemas: {},
        responses: {},
        parameters: {},
        examples: {},
        requestBodies: {},
        headers: {},
        securitySchemes: {},
        links: {},
        callbacks: {}
      },
      security: {},
      tags: [],
      externalDocs: {},
    };

    this.trees = {};

    const self = this;

    this.validator.addKeyword('rel', {
      type: 'object',
      modifying: true,
      async: true,
      compile: (sch, parentSchema) => {
        return async function (data, dataPath, parentObject, propName, rootData) {
          const context = this;
          try {
            let types = sch.type || sch._type; // тип в схеме (может быть массивом)
            // Если по схеме тип не опредлен, то берем переданный
            if ((!types || (Array.isArray(types) && !types.length)) && data._type) {
              types = [data._type];
            }
            if (data._id && context.collection) {
              if (types) {
                if (!Array.isArray(types)) {
                  types = [types];
                }
                // Выборка из коллекции
                let cond = {_id: new ObjectID(data._id)};
                for (let type of types) {
                  const link = await self.storage.get(type).native.findOne(cond);
                  if (link) {
                    const rel = await context.collection.onLinkPrepare({
                      path: dataPath.substring(1).replace(/\[[0-9]+\]/, ''),
                      link
                    });
                    data._type = type;
                    if (rel) {
                      data = Object.assign(data, rel);
                    }
                    return true;
                  }
                }
              }
              //console.log(data);
              return false;
            }
            return true;
          } catch (e) {
            //console.log(data);
            console.log(e);
            return false;
          }
        };
      },
      errors: 'full',
      metaSchema: {
        type: 'object',
        properties: {
          // Условия на связываемый объект
          type: {type: ['string', 'array']},
          _type: {type: ['string', 'array']},
          // Сведения о связи
          copy: {type: 'string'},
          search: {type: 'string'},
          inverse: {type: 'string'},
          tree: {type: 'string'}
        }
      }
    });

    this.validator.addKeyword('i18n', {
      type: ['string', 'object'],
      modifying: true,
      compile: (sch, parentSchema) => {
        return function (data, dataPath, parentObject, propName, rootData) {
          const context = this;
          try {
            if (sch === 'in') {
              if (typeof data === 'string') {
                acceptLanguage.languages(languagesCodes);
                const key = acceptLanguage.get(context.session.acceptLang || 'ru');
                parentObject[propName] = {[key]: data};
              }
            } else {
              if (typeof data === 'object' && context.session.acceptLang !== 'all') {
                acceptLanguage.languages(Object.keys(data));
                const key = acceptLanguage.get(context.session.acceptLang || 'ru');
                parentObject[propName] = data[key];
              }
            }
          } catch (e) {
            return false;
          }
          return true;
        };
      },
      errors: false,
      metaSchema: {
        type: 'string',
        enum: ['in', 'out']
      }
    });
  }

  async init(config, services) {
    this.config = config;
    this.services = services;
    this.specification = objectUtils.merge(this.specification, config.default);
    this.schemas(require('./schemas'));
    this.responses(require('./responses'));
    this.parameters(require('./parameters'));
    this.generates = require('./generate');
    this.storage = await this.services.getStorage();
    return this;
  }

  add($id, def) {
    let paths = $id.match(/^#?\/?([^\/]+)\/(.*)$/);
    if (paths) {
      switch (paths[1]) {
        case 'parameters':
          this.parameters(paths[2], def);
          break;
        case 'responses':
          this.responses(paths[2], def);
          break;
        case 'schemas':
          this.schemas(paths[2], def);
          break;
        default:
          throw new TypeError('Not supported schema path, defined by $id: ' + $id);
      }
    }
  }

  schemas(name, def) {
    if (typeof name === 'function') {
      name = name(this);
    }
    if (typeof name === 'object' && typeof def === 'undefined') {
      let def = name;
      let names = Object.keys(def);
      for (let name of names) {
        if (typeof def[name] === 'function') {
          this.specification.components.schemas[name] = def[name](this);
        } else {
          this.specification.components.schemas[name] = def[name];
        }
        this.specification.components.schemas[name].$async = true;
      }
    } else {
      this.specification.components.schemas[name] = def;
      this.specification.components.schemas[name].$async = true;
    }
    this.isChanged = true;
  }

  parameters(name, def) {
    if (typeof name === 'function') {
      name = name(this);
    }
    if (typeof name === 'object' && typeof def === 'undefined') {
      let def = name;
      let names = Object.keys(def);
      for (let name of names) {
        if (typeof def[name] === 'function') {
          this.specification.components.parameters[name] = def[name](this);
        } else {
          this.specification.components.parameters[name] = def[name];
        }
      }
    } else {
      this.specification.components.parameters[name] = def;
    }
  }

  responses(name, def) {
    if (typeof name === 'function') {
      name = name(this);
    }
    if (typeof name === 'object' && typeof def === 'undefined') {
      let def = name;
      let names = Object.keys(def);
      for (let name of names) {
        if (typeof def[name] === 'function') {
          this.specification.components.responses[name] = def[name](this);
        } else {
          this.specification.components.responses[name] = def[name];
        }
      }
    } else {
      this.specification.components.responses[name] = def;
    }
    this.isChanged = true;
  }

  paths(method, path, def) {
    path = path.replace(/:([a-z]+)/uig, '{$1}');
    if (!this.specification.paths[path]) {
      this.specification.paths[path] = {};
    }
    this.specification.paths[path][method] = def;
    this.isChanged = true;
  }

  /**
   * Валидация
   * @param name Путь к схеме, например #parameters/user.
   *             Если путь не начинается с #, то добавится #/components/schemas/
   * @param value Значение для валидации
   */
  async validate(name, value, context = {}, basePath = '') {
    this._updateSchema();
    try {
      let result;
      if (typeof name === 'string') {
        if (name.substring(0, 1) !== '#' && name.substring(0, 5) !== 'root#') {
          name = 'root#/components/schemas/' + name;
        }
      }
      const v = this.validator.getSchema(name);
      result = await v.call(context, value);

      return result;
    } catch (e) {
      //console.log(JSON.stringify(e.data));
      throw this.customErrors(basePath, e, value);
    }
  }

  _updateSchema() {
    if (this.isChanged) {
      if (this.validator.getSchema('root')) {
        this.validator.removeSchema('root');
      }
      const es = this.escapeSchema(this.specification);
      this.validator.addSchema(es, 'root');
      this.isChanged = false;
    }
  }

  generate(name, ...params) {
    if (name in this.generates) {
      return this.generates[name](this, ...params);
    }
    return {};
  }

  /**
   * @deprecated
   */
  generateSchema(name, ...params) {
    return this.generate(name, ...params);
  }

  getSchema(relativePath = '') {
    this._updateSchema();
    let result = this.validator.getSchema('root' + relativePath);
    if (result) {
      return result.schema;
    }
    return {};
  }

  escapeSchema(obj) {
    let result;
    if (Array.isArray(obj)) {
      result = [];
      for (let i = 0; i < obj.length; i++) {
        result.push(this.escapeSchema(obj[i]));
      }
    } else if (typeof obj === 'object' && obj !== null) {
      result = {};
      let keys = Object.keys(obj);
      for (let key of keys) {
        const keyEscape = key.replace(/\//g, '\\');
        result[keyEscape] = this.escapeSchema(obj[key]);
        if (key === 'schema' || key === 'session') {
          result[keyEscape].$async = true;
        }
      }
    } else if (typeof obj === 'function') {
      result = obj;
    } else {
      result = obj;
    }
    return result;
  }

  getSchemaOpenApi() {
    const filter = (obj) => {
      let result;
      if (Array.isArray(obj)) {
        result = [];
        for (let i = 0; i < obj.length; i++) {
          result.push(filter(obj[i]));
        }
      } else if (typeof obj === 'object' && obj !== null) {
        result = {};
        let keys = Object.keys(obj);
        for (let key of keys) {
          if (key !== '_tree') {
            result[key.replace(/\\/g, '/')] = filter(obj[key]);
          }
        }
      } else if (typeof obj === 'function') {
        result = 'func';
      } else {
        result = obj;
      }
      return result;
    };
    return filter(this.getSchema());
  }

  makeRef(parts = []) {
    let result = 'root#/' + parts.map(item => typeof item === 'string'
      ? item.replace(/\//g, '\\')
      : item).join('/');
    result = result.replace(/:([a-z0-9]+)/gi, '{$1}');
    return result;
  }

  getValue(path, value) {
    if (typeof value !== 'object' || value === null) {
      return undefined;
    }
    let paths = path.split('.');
    let current = value;
    for (let i = 0; i < paths.length; ++i) {
      if (typeof current[paths[i]] === 'undefined') {
        return undefined;
      } else {
        current = current[paths[i]];
      }
    }
    return current;
  };

  /**
   * Кастомное сообщение об ошибке
   * @param key
   * @param schema
   * @param property
   * @returns {*}
   */
  getCustomMessage(key, schema, property) {
    if (schema && schema.errors) {
      if (typeof schema.errors === 'string') {
        return schema.errors.replace('{key}', property);
      } else {
        if (schema.errors[key]) {
          return schema.errors[key].replace('{key}', property);
        }
      }
    }
    return null;
  };

  /**
   * Исключение с подробным описанием ошибок по схеме
   * @param rootField
   * @returns {*}
   */
  customErrors(rootField = '', validationError, value) {
    const combinePath = (...paths) => {
      return paths.join('.').replace(/(\.\.|\[)/g, '.').replace(/(^\.|\.$|])/g, '');
    };

    const errorsList = validationError.errors || this.validator.errors;

    let issues = [];
    if (errorsList) {
      errorsList.map(({keyword, params, dataPath, schema, parentSchema, message}) => {
        let key, path;
        switch (keyword) {
          case 'required':
            key = params.missingProperty;
            path = combinePath(...rootField.split('/'), dataPath, key);
            issues.push({
              path: path,//.split('.'),
              rule: keyword,
              //accept: true,
              //value: 'undefined',
              message: this.getCustomMessage(keyword, schema[key], key) || message
            });
            break;
          default:
            key = dataPath.split('.').pop();
            issues.push({
              path: combinePath(rootField, dataPath),//.split('.'),
              rule: keyword,
              //accept: parentSchema[keyword],
              // value: this.getValue(combinePath(dataPath), value),
              message: this.getCustomMessage(keyword, parentSchema, key) || message
            });
        }
      });
    }
    console.log(JSON.stringify(issues));
    return new errors.Validation(issues);
  };

  extend(def, newDef) {
    let result = def;
    if (typeof def === 'string') {
      result = this.getSchema(def);
    }
    if (typeof def === 'function') {
      result = def(this);
    } else {
      result = def;
    }
    result = objectUtils.merge(result, newDef/*, {replaceEmpty: true}*/);

    if (result.$mode) {
      if (result.$mode === 'view') {
        result = this.clearRulesView(result);
      } else if (result.$mode === 'update') {
        result = this.clearRulesUpdate(result);
      }
      delete result.$mode;
    }
    return result;
  }

  clearRulesView(schema) {
    let result = {};
    let keys = Object.keys(schema);
    for (let key of keys) {
      if (['type', 'description', 'title', 'items',
        'properties', 'additionalProperties', '$ref', '$id', 'i18n'].indexOf(key) !== -1) {
        result[key] = schema[key];
      }
      if (key === 'i18n') {
        result[key] = 'out';
      }
      if (key === 'items') {
        result[key] = this.clearRulesView(result[key]);
      }
      if (key === 'properties') {
        let propsNames = Object.keys(result[key]);
        for (let propName of propsNames) {
          result[key][propName] = this.clearRulesView(result[key][propName]);
        }
      }
      if (key === '$ref' && schema[key] === '#/components/schemas/object-id') {
        delete result['$ref'];
        result['type'] = 'string';
      }
    }
    return result;
  };

  clearRulesUpdate(schema) {
    let result = {};
    let keys = Object.keys(schema);
    for (let key of keys) {
      if (['default'].indexOf(key) === -1) {
        result[key] = schema[key];
      }
      if (key === 'items') {
        result[key] = this.clearRulesUpdate(result[key]);
      }
      if (key === 'properties') {
        let propsNames = Object.keys(result[key]);
        for (let propName of propsNames) {
          result[key][propName] = this.clearRulesUpdate(result[key][propName]);
        }
      }
    }
    return result;
  };

  findLinks(schema, path = '', type = '') {
    let result = {};
    if (typeof schema === 'object') {
      if (schema.rel) {
        result[path] = Object.assign({}, {size: '1'}, schema.rel);
        // @todo Если свойство - деревро, то запомнить соответствие типа и названия дерева (чтобы знать в каких коллекциях отношение)
        if (schema.rel.tree) {
          if (!this.trees[schema.rel.tree]) {
            this.trees[schema.rel.tree] = {};
          }
          this.trees[schema.rel.tree][type] = path;
          result[path].treeTypes = this.trees[schema.rel.tree];
        }
      } else if (schema.type === 'array' && schema.items && schema.items.rel) {
        result[path] = Object.assign({}, {size: 'M'}, schema.items.rel);
      } else if (schema.properties) {
        let propsNames = Object.keys(schema.properties);
        for (let propName of propsNames) {
          Object.assign(
            result,
            this.findLinks(schema.properties[propName], `${path}${path ? '.' : ''}${propName}`, type)
          );
        }
      }
    }
    return result;
  }
}

module.exports = Spec;
