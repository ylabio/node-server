/**
 *
 * @param spec
 * @param params Object {description='', _type, inverse, copy, search, properties = {}, default, required = [], example={}}
 * @returns {{type: string, description: *, properties: *, rel: *, errors: {rel: string}, additionalProperties: boolean}}
 */
module.exports = (spec, params) => {
  //{description='', rel={}, properties = {}, default, required = [], example={}}
  let result = {
    type: 'object',
    description: params.description || '',
    properties: Object.assign({
      _id: {$ref: '#/components/schemas/object-id'},
      _type: {type: 'string', description: 'Тип объекта'},
      _tree: {type: 'array', description: 'Массив родителей', items: {type: 'object'}}
    }, params.properties || {}
    ),
    rel: params,
    errors: {rel: 'Not found relation object'},
    additionalProperties: params.additionalProperties || false
  };
  result.required = params.required || [];
  //result.required.push('_id');

  if (params.default) {
    result.default = params.default;
  }
  if (typeof params.example !== 'undefined') {
    result.example = params.example;
  }

  if (params.type) {
    params._type = params.type;
    delete params.type;
  }

  if (!params._type || Array.isArray(params._type)) {
    result.properties._type = {type: 'string', description: 'Тип объекта'};
    if (Array.isArray(params._type) && params._type.length) {
      result.properties._type.enum = params._type;
    }
    //result.required.push('_type');
  }
  return result;
};
