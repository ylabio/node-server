let errors = {
  Custom: require('./custom'),
  BadRequest: require('./bad-request'),
  Forbidden: require('./forbidden'),
  NotFound: require('./not-found'),
  Unauthorized: require('./unauthorized'),
  Validation: require('./validation'),
  ValidationUnique: require('./validation-unique'),

  convert(e) {
    if (e.code === 11000) {
      let match = e.message.match(
        /index\:\ (?:.*\.)?\$?(?:([_a-z0-9]*)(?:_\d*)|([_a-z0-9]*))\s*dup key/i
      );
      let field = match[1] || match[2];
      if (field) {
        return new errors.ValidationUnique([
            {
              path: field,
              rule: 'unique',
              accept: true,
              message: 'Not unique'
            }
          ]
        );
      }
    }
    return e;
  }
};

module.exports = errors;
