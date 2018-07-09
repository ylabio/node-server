module.exports = class ValidationUnique extends require('./validation') {
  constructor(data = {}, message = 'Not unique data') {
    super(data, message, 400, '001');
  }


};
