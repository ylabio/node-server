const ObjectID = require('mongodb').ObjectID;
const {merge, clone} = require('./merge.js');

const objectUtils = {

  convertForSet: (object) => {
    let keys = Object.keys(object);
    let result = {};
    for (let key of keys) {
      if (
        typeof object[key] === 'object' &&
        object[key] !== null &&
        !Array.isArray(object[key]) &&
        !(object[key] instanceof Date) &&
        !ObjectID.isValid(object[key])
      ) {
        if ('_id' in object[key] && (!object[key]._id || object[key]._id === 'null')) {
          result[`${key}`] = {};
        } else {
          let value = objectUtils.convertForSet(object[key]);
          let valueKeys = Object.keys(value);
          for (let valueKey of valueKeys) {
            result[`${key}.${valueKey}`] = value[valueKey];
          }
        }
      } else {
        result[key] = object[key];
      }
    }
    return result;
  },

  getAllValues: (object, clear = false) => {
    const set = objectUtils.convertForSet(object);
    const keys = Object.keys(set);
    const result = [];
    for (let i = 0; i < keys.length; i++) {
      if (!clear || (set[keys[i]] !== '' && set[keys[i]] !== null && typeof set[keys[i]] !== 'undefined')) {
        result.push(set[keys[i]]);
      }
    }
    return result;
  },

  unset: (obj, path) => {
    if (typeof path === 'number') {
      path = [path];
    }
    if (obj === null) {
      return obj;
    }
    if (!path) {
      return obj;
    }
    if (typeof path === 'string') {
      return objectUtils.unset(obj, path.split('.'));
    }

    const currentPath = path[0];

    if (path.length === 1) {
      if (Array.isArray(obj)) {
        obj.splice(currentPath, 1);
      } else {
        delete obj[currentPath];
      }
    } else {
      return objectUtils.unset(obj[currentPath], path.slice(1));
    }
    return obj;
  },

  get: (obj, path, defaultValue) => {
    if (typeof path === 'string') {
      path = path.split('.');
    }
    if (typeof path === 'number') {
      path = [path];
    }
    if (typeof obj === 'undefined') {
      return defaultValue;
    }
    if (path.length === 0) {
      return obj;
    }
    return objectUtils.get(obj[path[0]], path.slice(1), defaultValue);
  },

  set: (obj, path, value, doNotReplace) => {
    if (typeof path === 'number') {
      path = [path];
    }
    if (!path || path.length === 0) {
      return obj;
    }
    if (typeof path === 'string') {
      return objectUtils.set(obj, path.split('.'), value, doNotReplace);
    }
    const currentPath = path[0];
    const currentValue = obj[currentPath];
    if (path.length === 1) {
      if (currentValue === void 0 || !doNotReplace) {
        obj[currentPath] = value;
      }
      return currentValue;
    }

    if (currentValue === void 0) {
      //check if we assume an array
      if (typeof path[1] === 'number') {
        obj[currentPath] = [];
      } else {
        obj[currentPath] = {};
      }
    }

    return objectUtils.set(obj[currentPath], path.slice(1), value, doNotReplace);
  },

  leave: (object, paths) => {
    let result = {};
    for (let path of paths) {
      objectUtils.set(result, path, objectUtils.get(object, path));
    }
    return result;
  },

  merge: merge,
  clone: clone
};

module.exports = objectUtils;
