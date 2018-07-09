const lib = require('./lib');

/**
 * Конфиг для тестирования
 * @type {Object}
 */
module.exports = lib.objectUtils.merge(require('./config.js'), {
  mode: 'test',
  server: {
    host: 'localhost',
    port: 8040
  },
  storage: {
    db: {
      url: 'mongodb://localhost:27017',
      name: 'report2-test'
    },
  },
  mail: {
  //   transport: {
  //     host: 'smtp.yandex.com',
  //     port: 465,
  //     secure: true, // use SSL
  //     auth: {
  //       user: '',
  //       pass: ''
  //     }
  //   },
  //   defaults: {
  //     from: 'YSA <boolive@yandex.ru>',
  //     replyTo: 'boolive@yandex.ru'
  //   }
  }
});
