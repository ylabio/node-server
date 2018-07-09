const objectUtils = require('./index.js');

describe('convertForSet', () => {
  test('Сброс отношения', () => {
    let sets = objectUtils.convertForSet({
      parent: {_id:'null'}
    });
    expect(sets).toEqual({parent: {}});
  });
});
