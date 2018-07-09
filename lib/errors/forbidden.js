module.exports = class Forbidden extends require('./custom') {
  constructor(data = {}, message = 'Access forbidden', code) {
    super(data, message, 403, code || '001');
  }
};
