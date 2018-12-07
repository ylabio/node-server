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
  .swagger-ui .info{
    margin: 15px 0;
  }
  .swagger-ui .scheme-container {
    padding: 15px 0 25px;
  }
  `;

  router.use('/docs', swaggerUi.serve, (req, res) => {
    swaggerUi.setup(spec.getSchemaOpenApi(), false, {}, css)(req, res);
  });
};
