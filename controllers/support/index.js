//const {queryUtils} = require('./../../lib');

module.exports = async (router, services) => {

  const spec = await services.getSpecification();
  const support = await services.getSupport();

  /**
   *
   */
  router.post('/support', {
    operationId: 'support.send',
    description: 'Отправка запроса в техподдержку',
    tags: ['Support'],
    session: spec.generate('session.user', []),
    requestBody: {
      content: {
        'application/json': {schema: {$ref: '#/components/schemas/support'}}
      }
    },
    parameters: [],
    responses: {
      200: spec.generate('success', true),
      400: spec.generate('error', 'Bad Request', 400),
      403: spec.generate('error', 'Forbidden', 403)
    }
  }, async (req/*, res*/) => {

    return await support.send({
      body: req.body,
      session: req.session,
      //fields: queryUtils.parseFields(req.query.fields)
    });
  });
};
