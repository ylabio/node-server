const swaggerUi = require('swagger-ui-express');

module.exports = async (router, services) => {

  let spec = await services.getSpecification();

  router.origin.get('/docs/source.json', async (req, res) => {
    res.json(Object.assign({}, spec.getSchemaOpenApi(), {
      // host: req.headers.host,
      // schemes: ['https']
    }));
  });

  const css = `
  .swagger-ui .topbar{
    display: none;
  }
  .swagger-ui .info {
    margin: 10px 0;
  }
  .swagger-ui .scheme-container {
    padding: 15px 0;
    position: fixed;
    width: 200px;
    top: 0;
    right: 0;
    z-index: 1;
    border-bottom-left-radius: 5px;
    }
  .swagger-ui .global-server-container {
    display: none;
    }
  `;

  router.use('/docs', swaggerUi.serve, (req, res) => {
    swaggerUi.setup(spec.getSchemaOpenApi(), false, {}, css)(req, res);
  });
};
