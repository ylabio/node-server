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

  test('Установка parent', async () => {
    const root = await s.objects.createOne({
      body: {
        name: 'Root',
      },
    });
    const child1 = await s.objects.createOne({body: {name: 'Child 1', parent: {_id: root._id}}});
    const child2 = await s.objects.createOne({body: {name: 'Child 2', parent: {_id: child1._id}}});
    const child3 = await s.objects.createOne({body: {name: 'Child 3', parent: {_id: child2._id}}});

    expect(child1).toMatchObject({
      name: child1.name,
      parent: {_id: root._id, _type: root._type}
    });

    expect(child2).toMatchObject({
      name: child2.name,
      parent: {_id: child1._id, _type: child1._type}
    });

    expect(child3).toMatchObject({
      name: child3.name,
      parent: {_id: child2._id, _type: child2._type}
    });
  });

  test('Установка parent начиная с листового', async () => {
    const root = await s.objects.createOne({
      body: {
        name: 'Root',
      },
    });

    const child1 = await s.objects.createOne({body: {name: 'Child 1'}});
    const child2 = await s.objects.createOne({body: {name: 'Child 2'}});
    const child3 = await s.objects.createOne({body: {name: 'Child 3'}});

    const child3Upd = await s.objects.updateOne({
      id: child3._id,
      body: {parent: {_id: child2._id}}
    });
    const child2Upd = await s.objects.updateOne({
      id: child2._id,
      body: {parent: {_id: child1._id}}
    });
    const child1Upd = await s.objects.updateOne({id: child1._id, body: {parent: {_id: root._id}}});

    expect(child1Upd).toMatchObject({
      name: child1.name,
      parent: {_id: root._id, _type: root._type}
    });

    expect(child2Upd).toMatchObject({
      name: child2.name,
      parent: {_id: child1._id, _type: child1._type}
    });

    expect(child3Upd).toMatchObject({
      name: child3.name,
      parent: {_id: child2._id, _type: child2._type}
    });
  });


  test('Смнена parent c увеличенивем вложенности', async () => {
    // 1. Создание дерева
    const superRoot = await s.objects.createOne({
      body: {
        name: 'SuperRoot',
      },
    });
    const root = await s.objects.createOne({
      body: {
        name: 'Root',
        parent: {_id: superRoot._id}
      },
    });
    const newRoot = await s.objects.createOne({
      body: {name: 'New Root', parent: {_id: root._id}}
    });
    const child = await s.objects.createOne({
      body: {name: 'Child', parent: {_id: root._id}}
    });
    const childSub = await s.objects.createOne({
      body: {
        name: 'childSub',
        parent: {_id: child._id}
      }
    });
    const childSubSub = await s.objects.createOne({
      body: {
        name: 'childSubSub',
        parent: {_id: childSub._id}
      }
    });

    expect(childSub).toMatchObject({
      name: 'childSub',
      parent: {_id: child._id, _type: child._type}
    });

    // 2. Переносим child в newRoot (увеливание вложенности)
    const child1Upd = await s.objects.updateOne({
      id: child._id,
      body: {parent: {_id: newRoot._id}}
    });
    const childSubUpd = await s.objects.getOne({filter: {_id: new ObjectID(childSub._id)}});
    const childSubSubUpd = await s.objects.getOne({filter: {_id: new ObjectID(childSubSub._id)}});

    expect(child1Upd).toMatchObject({
      name: child.name,
      parent: {_id: newRoot._id, _type: newRoot._type}
    });

    expect(childSubUpd).toMatchObject({
      name: childSub.name,
      parent: {_id: child._id, _type: child._type}
    });

    expect(childSubSubUpd).toMatchObject({
      name: childSubSub.name,
      parent: {_id: childSub._id, _type: childSub._type}
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
      await s.objects.getOne({filter: {_id: new ObjectID(children[0]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[1]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[2]._id)}}),
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
  });

  test('Изменения children', async () => {
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
      await s.objects.getOne({filter: {_id: new ObjectID(children[0]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[1]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[2]._id)}}),
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
      await s.objects.getOne({filter: {_id: new ObjectID(children[0]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[1]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[2]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[3]._id)}}),
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
        children: []
      },
    });
    expect(rootUpd2.children).toEqual([]);

    const childrenUpd3 = [
      await s.objects.getOne({filter: {_id: new ObjectID(children[0]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[1]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[2]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[3]._id)}}),
    ];
    expect(childrenUpd3[0].parent).toEqual({});
    expect(childrenUpd3[1].parent).toEqual({});
    expect(childrenUpd3[2].parent).toEqual({});
    expect(childrenUpd3[3].parent).toEqual({});
  });

  test('Order', async () => {
    // Создание нескольких объектов
    const list = {};
    for (let i = 0; i < 10; i++) {
      list[(i + 1)] = await s.objects.createOne({body: {name: (i + 1).toString()}});
    }

    expect(list[1]).toMatchObject({
      name: '1',
      order: 1
    });
    expect(list[10]).toMatchObject({
      name: '10',
      order: 10
    });

    // Перемещение 1 -> 4
    await s.objects.updateOne({id: list[1]._id, body: {order: 4}});
    // проверка списка
    const list1 = await s.objects.getList({sort: {'order': 1}, fields: '_id,name,order'});

    expect(list1[0]).toMatchObject({name: '2', order: 1});
    expect(list1[1]).toMatchObject({name: '3', order: 2});
    expect(list1[2]).toMatchObject({name: '4', order: 3});
    expect(list1[3]).toMatchObject({name: '1', order: 4});
    expect(list1[4]).toMatchObject({name: '5', order: 5});
    expect(list1[5]).toMatchObject({name: '6', order: 6});
    expect(list1[6]).toMatchObject({name: '7', order: 7});
    expect(list1[7]).toMatchObject({name: '8', order: 8});
    expect(list1[8]).toMatchObject({name: '9', order: 9});
    expect(list1[9]).toMatchObject({name: '10', order: 10});

    // Перемещение 9 -> 3
    await s.objects.updateOne({id: list1[8]._id, body: {order: 3}});
    // проверка списка
    const list2 = await s.objects.getList({sort: {'order': 1}, fields: '_id,name,order'});
    expect(list2[0]).toMatchObject({name: '2', order: 1});
    expect(list2[1]).toMatchObject({name: '3', order: 2});
    expect(list2[3]).toMatchObject({name: '4', order: 4});
    expect(list2[4]).toMatchObject({name: '1', order: 5});
    expect(list2[5]).toMatchObject({name: '5', order: 6});
    expect(list2[6]).toMatchObject({name: '6', order: 7});
    expect(list2[7]).toMatchObject({name: '7', order: 8});
    expect(list2[8]).toMatchObject({name: '8', order: 9});
    expect(list2[2]).toMatchObject({name: '9', order: 3});
    expect(list2[9]).toMatchObject({name: '10', order: 10});
  });

  test('Счётчик', async () => {
    // Создание действия и привязка к игре
    const value1 = await s.storage.newCode();
    expect(value1).toEqual(1);

    const value2 = await s.storage.newCode();
    expect(value2).toEqual(2);

    const value3 = await s.storage.newCode({type: 'some'});
    expect(value3).toEqual(1);
  });
});
