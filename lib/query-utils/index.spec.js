const queryUtils = require('./index.js');

describe('Parse fields parameter', () => {
  test('parse one field', () => {
    let fields = queryUtils.parseFields('name');
    expect(fields).toEqual({name: 1});
  });

  test('parse empty field', () => {
    let fields = queryUtils.parseFields('');
    expect(fields).toEqual(null);
  });

  test('parse two plain fields', () => {
    let fields = queryUtils.parseFields('name1, name2');
    expect(fields).toEqual({name1: 1, name2: 1});
  });

  test('parse sub fields', () => {
    let fields = queryUtils.parseFields('name1, name2(object(property, _id))');
    expect(fields).toEqual({name1: 1, name2: {object: {property: 1, _id: 1}}});
  });

  test('parse multiple sub fields', () => {
    let fields = queryUtils.parseFields(
      'name1, name2(object(property, _id)), name3(object(property, _id))'
    );
    expect(fields).toEqual({
      name1: 1,
      name2: {object: {property: 1, _id: 1}},
      name3: {object: {property: 1, _id: 1}}
    });
  });

  test('parse with many spaces', () => {
    let fields = queryUtils.parseFields(
      '  name1  ,   name2 (   object(    property, _id  ) )       '
    );
    expect(fields).toEqual({name1: 1, name2: {object: {property: 1, _id: 1}}});
  });

  test('parse without spaces', () => {
    let fields = queryUtils.parseFields('name1,name2(object(property,_id))');
    expect(fields).toEqual({name1: 1, name2: {object: {property: 1, _id: 1}}});
  });

  test('parse with quotes and spaces', () => {
    let fields = queryUtils.parseFields('"name1", "name2" (  "object"("property","_id"))');
    expect(fields).toEqual({name1: 1, name2: {object: {property: 1, _id: 1}}});
  });

  test('parse bad query', () => {
    try {
      queryUtils.parseFields('name-sub,^()jkd.sdsd(object(property,_id))');
    } catch (e) {
      expect(e.name).toBe('ParseFieldsException');
    }
  });

  test('* query', () => {
    let fields = queryUtils.parseFields('*,profile(*)');
    expect(fields).toEqual({'*': 1, profile: {'*': 1}});
  });
});


describe('Formatting search parameter', () => {
  test('formatting simple text', () => {
    let search = queryUtils.formattingSimpleSearch('search string');
    expect(search).toEqual([{title: /search string/i}]);
  });

  test('parse array with $or', () => {
    let search = queryUtils.formattingSearch(
      {'series': 'single|episodes', 'origin': 'avatar'},
      {series: {}, origin: {}}
    );
    expect(search).toEqual({
      $and: [
        {
          series: {
            $in: [/single/i, /episodes/i]
          }
        },
        {origin: /avatar/i}
      ]
    });
  });

  test('parse array with $or and const', () => {
    let search = queryUtils.formattingSearch(
      {'series': 'single|episodes', 'origin': 'avatar'},
      {series: {kind: 'const'}, origin: {kind: 'const'}}
    );
    expect(search).toEqual({
      $and: [{
        series: {
          $in: ['single', 'episodes']
        }
      },
        {origin: 'avatar'}]
    });
  });

  test('if search is array', () => {
    let search = queryUtils.formattingSearch(['search1', 'search2']);
    expect(search).toEqual({});
  });

  test('multy fields', () => {
    let search = queryUtils.formattingSimpleSearch('text1|text2', {
      kind: 'const',
      fields: ['name', 'surname']
    });
    expect(search).toEqual([{
        $or: [
          {name: {$in: ['text1', 'text2']}},
          {surname: {$in: ['text1', 'text2']}}
        ]
      }]
    );
  });

  test('multy fields for object', () => {
    // поле search заменяется на name и surname
    let search = queryUtils.formattingSearch(
      {search: 'text1|text2'},
      {search: {kind: 'const', fields: ['name', 'surname']}}
    );
    expect(search).toEqual({$and: [{
      $or: [
        {name: {$in: ['text1', 'text2']}},
        {surname: {$in: ['text1', 'text2']}}
      ]}]});
  });
});

describe('Formatting sort parameter', () => {
  test('asc sort', () => {
    let sort = queryUtils.formattingSort('name');
    expect(sort).toEqual({name: 1});
  });

  test('desc sort', () => {
    let sort = queryUtils.formattingSort('-name');
    expect(sort).toEqual({name: -1});
  });

  test('multiple asc and desc sort', () => {
    let sort = queryUtils.formattingSort('name,-title,price,-create');
    expect(sort).toEqual({name: 1, title: -1, price: 1, create: -1});
  });

  test('multiple sort with spaces', () => {
    let sort = queryUtils.formattingSort(' name, -title  , price,-create  ');
    expect(sort).toEqual({name: 1, title: -1, price: 1, create: -1});
  });

  test('empty asc sort', () => {
    let sort = queryUtils.formattingSort('');
    expect(sort).toEqual(null);
  });

  test('empty desc sort', () => {
    let sort = queryUtils.formattingSort('-');
    expect(sort).toEqual(null);
  });
});
