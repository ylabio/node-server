module.exports = class BadRequest extends require('./custom') {
  constructor(data = {}, message = 'Bad request params') {
    super(data, message, 400, '000');
  }
};
