const lib = require('./lib');
const fs = require('fs');
/**
 * Конфиг всех сервисов
 * @type {Object}
 */
let config = {

  server: {
    host: 'localhost',
    port: 8060
  },
  restApi: {
    // Прокси на другой сервер
    proxy: {
      target: 'https://example.com',
      secure: false
    },
    log: false,
    securityAuthorized: [{token: []}], // Способ авторизация в сваггере по умолчанию, если определено условие доступа
    validateResponse: false,
    // Кроссдоменные запросы
    cors: {
      /**
       * С каких хостов допустимы запросы
       * - false для отключения CORS
       * - ['http://localhost:8000', /\.ysa\.com$/]
       * - '*' - все хосты
       */
      origin: [
        'http://localhost:8061',
        'https://example.com',
      ],
      /**
       * Допустмые методы от кросдоменна
       */
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      /**
       *  Для PUT, DELETE запросов и других с нестандартными заголовками ил их значениями
       *  Сервер будет сперва получать OPTION запрос
       */
      preflightContinue: true,
      /**
       * Разрешенные заголовки от клиента. У клиента должен быть Access-Control-Request-Headers
       */
      allowedHeaders: ['X-Token', 'Content-Type', 'AccessToken'],
      /**
       * Доступные заголовки для клиента
       */
      exposedHeaders: ['X-Token', 'Content-Type', 'AccessToken'],
      /**
       * Чтобы работали кросдоменные куки. У клиента должен быть withCredentials:true
       */
      credentials: true,
      /**
       * Сколько секунд браузер может кэшировать OPTION запросы при preflightContinue:true
       */
      maxAge: 100,
      /**
       * Код для OPTIONS запросов
       */
      optionsSuccessStatus: 204
    },
  },
  storage: {
    db: {
      url: 'mongodb://localhost:27017',
      name: 'fondkino'
    },

    user: {
      password: {
        length: 8,
        chars: 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM123456678990-!=+&$#'
      }
    },

    file: {
      kinds: {
        // Тип файла по расширению или mime
        image: ['gif', 'png', 'jpeg', 'jpg'],
        doc: ['txt', 'pdf', 'doc', 'docx', 'rtf', 'xls', 'xlsx', 'csv'],
        other: ['*']
      },
      dir: './public/uploads',
      url: '/uploads' //настроить в nginx
    },

    support: {
      email: 'Support <boolive@yandex.ru>'
    }
  },

  mail: {
    transport: {
      host: 'smtp.yandex.com',
      port: 465,
      secure: true, // use SSL
      //service: 'gmail',
      auth: {
        user: 'daniilsidorov2017@yandex.com',
        pass: 'qqaazzwwssxx'
      }
    },
    defaults: {
      from: '<daniilsidorov2017@yandex.ru>',
      replyTo: 'support@ylab.io'
    }
  },

  validator: {},
  roles: {},
  spec: {
    default: {
      openapi: '3.0.0',
      info: {
        title: 'NodeServer',
        description: 'NodeServer REST API',
        termsOfService: '',//url
        // contact: {
        // name: 'API Support',
        // url: 'http://www.example.com/support',
        // email: 'support@example.com'
        // },
        // license:{
        // name: 'Apache 2.0',
        // url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
        // },
        version: '1.0.0',
      },
      servers: [
        {
          url: '/api/v1',
          description: 'API server',
          // variables: {
          //   version: {
          //     enum: [
          //       'v1',
          //       'v2'
          //     ],
          //     default: 'v1'
          //   },
          // }
        }
      ],
      paths: {},
      components: {
        schemas: {},
        responses: {},
        parameters: {},
        examples: {},
        requestBodies: {},
        headers: {},
        securitySchemes: {
          token: {
            type: 'apiKey',
            in: 'header',
            name: 'AccessToken'
          },
        },
        links: {},
        callbacks: {}
      },
      security: [
        //{token: []}, //global
      ],
      tags: [
        //{name: 'Authorize', description: 'Авторизация'},
        {
          name: 'Users',
          description: 'Пользователи'
        },
        {name: 'Roles', description: 'Роли пользователей'},
        //{name: 'Support', description: 'Техподдержка'},
        {name: 'Files', description: 'Загрузка, управление файлами'},
      ],
      // externalDocs: {
      //   description: 'Исходник для импорта в postman',
      //   url: '/api/v1/docs/source.json'
      // },
    }
  },

  tasks: {
    starters: {
      // 'files-cleanup': {
      //   interval: 24 * 60 * 60, //каждый день в секундах
      // },
    }
  },

  initialize: {
    starters: {}
  },
};

const localFilename = 'config-local.js';

if (!fs.existsSync(`./${localFilename}`)) {
  fs.writeFileSync(localFilename, 'module.exports = {};\n');
  console.log(`A local configuration file "${localFilename}" was created`);
}

module.exports = lib.objectUtils.merge(config, require(`./${localFilename}`));
