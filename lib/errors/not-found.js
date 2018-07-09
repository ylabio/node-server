module.exports = class NotFound extends require('./custom') {
  constructor(data = {}, message = 'Not found') {
    // if (Object.keys(data).length){
    //   data = {cond: data};
    // }
    data = {};
    super(data, message, 404, '000');
  }
};
