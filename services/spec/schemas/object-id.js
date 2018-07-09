module.exports = {
  type: 'string',
  //title: 'ObjectId',
  //description: 'Шестнадцатеричная строка из 24 символов',
  anyOf: [
    {pattern: '^[0-9a-fA-F]{24}$'},
    {const: ''}
  ],
  errors: {
    pattern: 'Incorrect identifier format'
  },
};
