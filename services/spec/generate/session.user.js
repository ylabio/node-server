module.exports = (spec, params) => {
  let def = {
    description: 'Check user of session',
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          _type: {type: 'string', errors: {pattern: 'Недоступно текущей ролью'}}
        },
        additionalProperties: true,
        errors: {required: 'Требуется авторизация'}
      }
    },
    additionalProperties: true,
    required: [],
  };
  if (params) {
    if (params.length) {
      def.properties.user.properties._type.pattern = `^(${params.join('|')})($|-)`;
      def.required.push('user');
      if (params.length === 1 && params[0]==='user'){
        def.properties.user.summary = 'Access: authorized';
      } else {
        def.properties.user.summary = `Access: "${params.join('", "')}"`;
      }
      def.needSecurirty = true;
    } else {
      def.properties.user.summary = 'Access: any';
    }
  }
  return def;
};
