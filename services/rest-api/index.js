const cors = require('cors');
const express = require('express');
const expressRouter = require('express').Router;
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const errors = require('./../../lib').errors;
const controllers = require('./../../controllers');
const xmlparser = require('express-xml-bodyparser');
const httpProxy = require('http-proxy');

class RestAPI {

  async init(config, services) {
    this.config = config;
    this.services = services;
    this.spec = await this.services.getSpecification();
    return this;
  }

  async getServer() {
    const result = express();
    //result.use(morgan('combined'));
    result.use(cookieParser());
    result.use(bodyParser.json());
    result.use(xmlparser());
    result.use(bodyParser.urlencoded({extended: true}));
    result.use(express.static('public'));
    result.use('/api/v1', await this.getRouter());
    result.use(this.getErrorHandler());

    this.proxyResponse = (proxyRes, req, res) => {
      return new Promise((resolve, reject) => {
        const contentType = proxyRes.headers['content-type'] && proxyRes.headers['content-type'].match(/^[^;]+/)[0];
        if (contentType) {
          const chunks = [];
          proxyRes.on('error', (e) => reject(e));
          proxyRes.on('data', (chunk) => chunks.push(chunk));
          proxyRes.on('end', () => {
            let body = Buffer.concat(chunks).toString();
            res.end(body);
            try {
              if (contentType === 'application/json') {
                body = JSON.parse(body);
              }
            } catch (e) {
            }
            resolve(body);
          });
        } else {
          proxyRes.pipe(res);
          resolve();
        }
      });
    };

    this.proxy = httpProxy.createProxyServer({});
    this.proxy.on('proxyRes', (proxyRes, req, res) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      this.proxyResponse(proxyRes, req, res).then((body) => {
        if (this.config.validateResponse) {
          this.validateResponse({
            req,
            status: proxyRes.statusCode,
            headers: proxyRes.headers,
            body,
            schema: req.def
          });
        }
      });
    });
    return result;
  }

  /**
   * Валидация ответа по схеме свагера
   * И логирование ошибок
   * @param req
   * @param status
   * @param headers
   * @param body
   * @param schema
   * @returns {Promise<void>}
   */
  async validateResponse({req, status, headers, body, schema}) {
    if (schema && schema.responses) {
      if (schema.responses[status]) {
        const defResponse = schema.responses[status];
        if (defResponse.headers) {
          console.log('Validate response headers');
        }
        const contentType = headers['content-type'] && headers['content-type'].match(/^[^;]+/)[0];
        if (defResponse.content) {
          if (defResponse.content[contentType]) {
            //console.log('Validate response body');
            // $ref на схему для body в общем объекте спецификации
            const name = this.spec.makeRef([
              'paths',
              req.route.path,
              req.method.toLowerCase(),
              'responses',
              status,
              'content',
              contentType,
              'schema'
            ]);
            this.spec.validate(name, body).catch(e => {
              console.log('Not valid response body', req.method, req.route.path);
            });
          } else {
            console.log(`Unsupported response content-type "${contentType}"`, req.method, req.route.path);
          }
        } else {
          console.log('Not described response body:', status, req.method, req.route.path);
        }
      } else {
        console.log('Not described response status:', status, req.method, req.route.path);
      }
    } else {
      console.log('Not described response', req.method, req.route.path);
    }
  }

  async validateRequest(params, query, headers, body, schema) {

  }

  /**
   * Валидация ответа по схеме свагера
   * И логирование ошибок
   * @param req
   * @param session
   * @param schema
   * @returns {Promise<void>}
   */
  async validateSession({req, session, schema}) {
    if (schema && schema.session) {
      // $ref на схему для body в общем объекте спецификации
      const name = this.spec.makeRef([
        'paths',
        req.route.path,
        req.method.toLowerCase(),
        'session',
        //'schema'
      ]);
      return this.spec.validate(name, session, {}, 'session');
    }
  }

  /**
   * Роутер express
   * @returns {Promise.<*>}
   */
  async getRouter() {
    // Переопределение методов роутера для документирования и обработки ответа
    const router = expressRouter();
    const methods = ['get', 'post', 'put', 'delete', 'options', 'patch', 'head'];
    router.origin = {};
    for (let method of methods) {
      router.origin[method] = router[method].bind(router);
      router[method] = (path, def, fun) => {
        if (typeof def === 'function') {
          fun = def;
        } else {
          if (def.session && def.session.properties && def.session.properties.user && def.session.properties.user.summary){
            def.description = `${def.description || ''} \n\n --- \n\n ${def.session.properties.user.summary}`;
          }
          if (def.session && def.session.needSecurirty && !def.security){
            def.security = this.config.securityAuthorized;
          }
          this.spec.paths(method, path, def);
        }
        router.origin[method](path, this.callbackWrapper(fun, def));
      };
    }
    // router.origin.use = router.use.bind(router);
    // router.use = (...params) => {
    //   params = params.map(param => typeof param === 'function'
    //   ? this.callbackWrapper(param) : param);
    //   router.origin.use(...params);
    // };

    // Поддержка кроссдоменных запросов
    router.use(cors(this.config.cors));

    // Подключение всех контроллеров к роутеру
    for (const controller of controllers) {
      await
        controller(router, this.services);
    }

    return router;
  }

  callbackWrapper(callback, def) {
    return async (req, res, next) => {
      req.def = def;
      // if (def.security) {
      //   if (!req.session.user) {
      //     next(new errors.Forbidden({}, 'Access forbidden for guest'));
      //   }
      // } else
      if (def.session) {
        try {
          await this.validateSession({
            req,
            session: req.session,
            schema: def
          });
        } catch (e) {
          //console.log(JSON.stringify(e.data));
          if (e instanceof errors.Validation) {
            next(new errors.Forbidden(e.data));
          } else {
            next(e);
          }
          return;
        }
      }

      if (def.proxy) {
        this.proxy.web(req, res, Object.assign({}, this.config.proxy, {
          target: this.config.proxy.target + req.baseUrl,
          selfHandleResponse: true
        }));
      } else {
        try {
          res.statusCode = 0; // Для возможности опредлить статус в контроллере
          let result = await callback(req, res, next);
          if (!res.statusCode) {
            res.status(200);
          }
          if (result && result.response) {
            result = result.response;
          } else if (Array.isArray(result)) {
            result = {data: {items: result}};
          } else {
            result = {data: result};
          }
          res.json(result);
          if (this.config.validateResponse) {
            this.validateResponse({
              req,
              status: res.statusCode,
              headers: res.getHeaders(),
              body: result,
              schema: def
            });
          }
        } catch (e) {
          next(e);
        }
      }
    };
  }

  getErrorResponse(e) {
    if (e instanceof errors.Custom) {
      return e.toObject();
    } else if (e instanceof SyntaxError) {
      return {
        //id: 400.003,
        code: 400, //e.name,
        message: e.message,
        data: {}
      };
    } else if (e instanceof Error) {
      return {
        //id: 500,
        code: 500, //e.name,
        message: e.message,
        data: {}
      };
    }
    return {
      //id: 500.000,
      code: 500, //'Unknown error',
      message: JSON.stringify(e)
    };
  }

  /**
   * Обработка всех ошибок для express
   * @returns {function(*=, *, *, *)}
   */
  getErrorHandler() {
    return (err, req, res, next) => { // eslint-disable-line no-unused-vars
      if (this.config.log) {
        console.log(err instanceof errors.Validation ? JSON.stringify(err) : err);
      }
      const result = {errors: this.getErrorResponse(err)};
      res.status(parseInt(result.errors.id || 500)).json(result);
      if (this.config.validateResponse) {
        this.validateResponse({
          req,
          status: res.statusCode,
          headers: res.getHeaders(),
          body: result,
          schema: req.def
        });
      }
    };
  }
}

module.exports = RestAPI;
