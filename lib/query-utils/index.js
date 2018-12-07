const escapeStringRegexp = require('escape-string-regexp');
const ObjectID = require('mongodb').ObjectID;
const moment = require('moment');
const queryUtils = {

  /**
   * Если строка представляет число, то конвертация в целое или действительное
   * @param value
   */
  type(value) {
    try {
      const result = Number(value);
      if (Number.isNaN(result) || result === null) {
        const date = moment(value, ['YYYY-MM-DDTHH:mm:ss.SSS Z','YYYY-MM-DDTHH:mm:ss Z','YYYY-MM-DDTHH:mm:ss']);
        if (date.isValid()){
          console.log( date.toDate());
          return date.toDate();
        }
        return value;
      } else {
        return result;
      }
    } catch (e) {
      return value;
    }
  },

  /**
   * Парсер форматированной строки, перечисляющей поля для выборки
   * @param fieldsString String
   * @return Object
   */
  parseFields: (fieldsString) => {
    if (fieldsString === 1) {
      return {'*': 1};
    }
    if (!fieldsString || typeof fieldsString !== 'string') {
      return null;
    }
    let formatted = fieldsString.replace(/["'`]?([a-z0-9_*]+)["'`]?\s*(,|$|\))/uig, '"$1":1$2');
    formatted = formatted.replace(/["'`]?([a-z0-9_*]+)["'`]?\s*(\()/uig, '"$1":{');
    formatted = '{' + formatted.replace(/\)/g, '}') + '}';
    try {
      return JSON.parse(formatted);
    } catch (e) {
      throw {message: 'Incorrect fields format', name: 'ParseFieldsException'};
    }
  },

  /**
   * Форматирование множественного параметра поиска (объекта фильтра) в mongodb объект фильтра
   * @param searchField String|Object
   * @param propertyTypes Object По ключ свойства параметры сравнения для него
   * {search: {
   *    kind:'regex', //тип сравнения, regex(по умолчанию), const
   *    fields:['name','surname'], //В каких полях сравнивать c $or и если отличается от key
   *    },
   *  price: {
   *    kind:'const',
   *  }
   * @returns Object|null
   */
  formattingSearch: (searchField, propertyTypes = {}) => {
    let result = [];
    if (!Array.isArray(searchField) && searchField === Object(searchField)) {
      const keys = Object.keys(searchField);
      for (let key of keys) {
        if (propertyTypes[key] && typeof searchField[key] !== 'undefined') {
          let value = searchField[key];
          if (typeof propertyTypes[key] === 'function') {
            propertyTypes[key] = propertyTypes[key](searchField[key]);
          }
          if ('value' in propertyTypes[key]){
            value = propertyTypes[key].value;
          }
          if (propertyTypes[key]) {
            if (!propertyTypes[key].fields || !propertyTypes[key].fields.length) {
              propertyTypes[key].fields = [key];
            }
            const cond = queryUtils.formattingSimpleSearch(value, propertyTypes[key]);
            if (cond) {
              if (Array.isArray(cond)) {
                result = result.concat(cond);
              } else {
                result.push(cond);
              }
            }
          }
        }
      }
    }
    return result.length ? {$and: result} : {};
  },

  /**
   * Форматер строки в объект фильтра mongodb
   * @param searchValue Строка фильтра
   * @param type Object Опции сравнения
   * {
   *    kind:'regex', //тип сравнения, regex(по умолчанию), const
   *    fields:['name','surname'], //В каких полях сравнивать c $or или в каком одном
   *    }
   * @returns {Object}
   */
  formattingSimpleSearch(searchValue, type = {kind: 'regex', fields: ['title'], exists: false}) {
    if (!type.kind) {
      type.kind = 'regex';
    }
    let values;
    let $exists = true;
    let $in = [];
    if (typeof searchValue !== 'string'){
      searchValue = [searchValue];
    } else {
      searchValue = searchValue.split('|');
    }
    searchValue.map(value => {
      if (typeof type.kind === 'function') {
        $in.push(type.kind(value, type));
      } else {
        switch (type.kind.toLowerCase()) {
          case 'object-id':
          case 'objectid':
            if (value) {
              if (value === 'null') {
                $exists = false;
              } else {
                $in.push(new ObjectID(value));
              }
            }
            break;
          case 'is':
            $in.push(new RegExp(`^${escapeStringRegexp(value.trim())}($|-)`, 'i'));
            break;
          case 'regex':
          case 'regexp':
            $in.push(new RegExp(escapeStringRegexp(value.trim()), 'i'));
            break;
          case 'regex-start':
          case 'regexp-start':
            $in.push(new RegExp('^' + escapeStringRegexp(value.trim()), 'i'));
            break;
          case 'bool':
          case 'boolean':
            if (value === 'null') {
              $exists = false;
            } else {
              $in.push(!(value === 'false' || value === '0' || value === ''));
            }
            break;
          case 'between':
            values = value.split(';');
            if (values.length === 2) {
              $in.push({
                  $gte: this.type(values[0]),
                  $lte: this.type(values[1])
                }
              );
            } else {
              $in.push({$eq: this.type(values[0])});
            }
            break;
          case 'between-age':
            values = value.split(';');
            if (values.length === 2) {
              $in.push({
                $gte: moment().subtract(values[1], 'years').toDate(),
                $lte: moment().subtract(values[0], 'years').toDate()
              });
            } else {
              $in.push({
                $gte: moment().subtract(values[0], 'years').toDate(),
                $lte: moment().subtract(values[0] + 1, 'years').toDate()
              });
            }
            break;
          case 'between-date':
            values = value.split(';');
            if (values.length === 2) {
              $in.push({
                $gte: moment(values[1]).toDate(),
                $lte: moment(values[0]).toDate()
              });
            } else {
              $in.push({
                $qe: moment(values[0]).toDate()
              });
            }
            break;
          case 'gt':
            $in.push({$gt: this.type(value)});
            break;
          case 'lt':
            $in.push({$lt: this.type(value)});
            break;
          case 'gte':
            $in.push({$gte: this.type(value)});
            break;
          case 'lte':
            $in.push({$lte: this.type(value)});
            break;
          case 'const':
          case 'eq':
          default:
            if (value) {
              if (value === 'null') {
                $exists = false;
              } else {
                $in.push(value);
              }
            }
        }
      }
    });
    let result;
    if ($in.length > 0 && type.fields && type.fields.length) {
      if ($in.length > 1) {
        result = {$in};
      } else if ($in.length > 0) {
        result = $in[0];
      }
      if (type.fields.length === 1) {
        return [{[type.fields[0]]: result}];
      } else {
        return [{$or: type.fields.map(field => ({[field]: result}))}];
      }
    } else {
      if (type.exists && !$exists && type.fields && type.fields.length === 1) {
        result = [{[type.fields[0]]: {$exists: false}}];
      }
      if (type.empty && !$exists && type.fields && type.fields.length === 1) {
        result = [{[type.fields[0]]: ''}];
      }
      return result;
    }
  },

  /**
   * Форматирование параметра сортировки
   * @param sortField String
   * @returns Object
   */
  formattingSort: (sortField) => {
    if (typeof sortField === 'string') {
      let fields = sortField.split(',').map(field => field.replace(/\s/g, ''));
      let result = {};
      for (let field of fields) {
        if ((!field || field === '-')) {
          //bad sort
        } else if (field.substring(0, 1) === '-') {
          result[field.substring(1)] = -1;
        } else {
          result[field] = 1;
        }
      }
      if (Object.keys(result).length !== 0) {
        return result;
      }
    }
    return null;
  }
};

module.exports = queryUtils;
