module.exports = (spec, params) => {
  let result = {
    type: ['string', 'object'],
    patternProperties: {
      '^.*$': {type: 'string'},
    },
    i18n: 'in'
  };
  if (typeof params.description !== 'undefined') {
    result.description = params.description;
    delete params.description;
  }
  if (typeof params.example !== 'undefined') {
    result.example = params.example;
    delete params.example;
  }
  if (typeof params.defaultValue !== 'undefined') {
    result.default = params.defaultValue;
    delete params.defaultValue;
  }
  if (typeof params.default !== 'undefined') {
    result.default = params.default;
    delete params.default;
  }
  result.patternProperties['^.*$'] = Object.assign({type: 'string'}, params);
  return result;
};
