const bluebird = require('bluebird');
const crypto = require('crypto');
bluebird.promisifyAll(crypto);

const stringUtils = {

  random (length = 6,
           chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'){
    let text = '';
    for (let i = 0; i < length; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
  },

  hash(value) {
    return crypto.createHash('md5').update(value).digest('hex');
  },

  async generateToken() {
    return await crypto.randomBytes(32).toString('hex');
  },

  escapeRegex (s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  },

  toDash(value) {
    return value.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase();
  }
};

module.exports = stringUtils;
