const x = require('jest');

const {arrayUtils} = require('../../../lib');
const ObjectID = require('mongodb').ObjectID;

describe('Storage', () => {
  let s = {};
  let data = {};

  beforeAll(async () => {
    s.services = await require('../../init-spec');
    // s.test = await s.services.getTest();
    s.storage = await s.services.getStorage('clear');
    s.objects = s.storage.get('object');

    data.session = {
      user: {
        _id: new ObjectID(),
        _type: 'user-admin'
      }
    };
  });

  test('Добавление/удаление объекта', async () => {
    // Создание действия и привязка к игре
    const newObj = await s.objects.createOne({
      body: {
        name: 'Test'
      },
      session: data.session
    });

    expect(newObj).toMatchObject({
      name: 'Test',
    });

    const delObj = await s.objects.deleteOne({
      id: newObj._id,
      session: data.session
    });

    expect(delObj).toMatchObject({
      name: 'Test',
      isDeleted: true
    });
  });

  test('Установка children', async () => {
    // Подготовка объектов в качестве подчиенных
    const children = [
      await s.objects.createOne({body: {name: 'Child 1'}}),
      await s.objects.createOne({body: {name: 'Child 2'}}),
      await s.objects.createOne({body: {name: 'Child 3'}}),
      await s.objects.createOne({body: {name: 'Child 4'}}),
    ];
    /**
     * Добавление children в новый root
     */
    // Создание родительского объекта
    const root = await s.objects.createOne({
      body: {
        name: 'Root',
        children: [
          {_id: children[0]._id},
          {_id: children[1]._id},
          {_id: children[2]._id}
        ]
      },
    });

    // Проверка children
    expect(root).toMatchObject({
      name: 'Root',
      children: [
        {_id: children[0]._id, _type: children[0]._type},
        {_id: children[1]._id, _type: children[1]._type},
        {_id: children[2]._id, _type: children[2]._type}
      ]
    });

    // Проверка parent у children
    const childrenUpd = [
      await s.objects.getOne({filter:{_id: new ObjectID(children[0]._id)}}),
      await s.objects.getOne({filter:{_id: new ObjectID(children[1]._id)}}),
      await s.objects.getOne({filter:{_id: new ObjectID(children[2]._id)}}),
    ];

    expect(childrenUpd[0]).toMatchObject({
      name: children[0].name,
      parent: {_id: root._id, _type: root._type}
    });

    expect(childrenUpd[1]).toMatchObject({
      name: children[1].name,
      parent: {_id: root._id, _type: root._type}
    });

    expect(childrenUpd[2]).toMatchObject({
      name: children[2].name,
      parent: {_id: root._id, _type: root._type}
    });

    /**
     * Установка нового children в root
     */
    const rootUpd = await s.objects.updateOne({
      id: root._id,
      body: {
        children: [
          {_id: children[1]._id},
          {_id: children[3]._id},
        ]
      },
    });
    expect(rootUpd).toMatchObject({
      name: 'Root',
      children: [
         {_id: children[1]._id, _type: children[1]._type},
         {_id: children[3]._id, _type: children[3]._type}
      ]
    });
    // Проверка сброса parent и его сохранения/установки
    const childrenUpd2 = [
      await s.objects.getOne({filter:{_id: new ObjectID(children[0]._id)}}),
      await s.objects.getOne({filter:{_id: new ObjectID(children[1]._id)}}),
      await s.objects.getOne({filter:{_id: new ObjectID(children[2]._id)}}),
      await s.objects.getOne({filter:{_id: new ObjectID(children[3]._id)}}),
    ];
    expect(childrenUpd2[0].parent).toEqual({});
    expect(childrenUpd2[1].parent).toEqual(
      {_id: root._id, _type: root._type}
    );
    expect(childrenUpd2[2].parent).toEqual({});
    expect(childrenUpd2[3].parent).toEqual(
      {_id: root._id, _type: root._type}
    );

    /**
     * Установка пустого children
     */
    const rootUpd2 = await s.objects.updateOne({
      id: root._id,
      body: {
        children: [
        ]
      },
    });
    expect(rootUpd2.children).toEqual([]);

    const childrenUpd3 = [
      await s.objects.getOne({filter:{_id: new ObjectID(children[0]._id)}}),
      await s.objects.getOne({filter:{_id: new ObjectID(children[1]._id)}}),
      await s.objects.getOne({filter:{_id: new ObjectID(children[2]._id)}}),
      await s.objects.getOne({filter:{_id: new ObjectID(children[3]._id)}}),
    ];
    expect(childrenUpd3[0].parent).toEqual({});
    expect(childrenUpd3[1].parent).toEqual({});
    expect(childrenUpd3[2].parent).toEqual({});
    expect(childrenUpd3[3].parent).toEqual({});
  });
});
