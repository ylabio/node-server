module.exports = (spec, resultSchema, headers) => {
  let def = {
    description: 'Success',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            data: {
              type: 'object'
            }
          }
        }
      }
    }
  };
  const schema = def.content['application/json'].schema;
  if (resultSchema) {
    if (typeof resultSchema === 'object' && resultSchema !== null) {
      if ('$ref' in resultSchema || ('type' in resultSchema)) {
        schema.properties.data = resultSchema;
      } else {
        schema.properties.data.properties = resultSchema;
      }
    } else {
      schema.properties.data = {
        type: typeof resultSchema,
        const: resultSchema
      };
    }
  }
  if (headers) {
    def.headers = headers;
  }
  return def;
};
