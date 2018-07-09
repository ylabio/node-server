module.exports = class Unauthorized extends require('./custom') {
  constructor(data = {}, message = 'Unauthorized request') {
    super(data, message, 401, '000');
  }
};
