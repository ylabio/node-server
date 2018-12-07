/**
 * Обновление связей на моменты в играх
 * @param services
 * @param config
 * @param args
 * @returns {Promise<void>}
 */
const {objectUtils} = require('../../../lib');

/**
 * Сервис со вспомогательными утилитами для тестирования сервера
 */
class Example {

  async init(config, services) {
    this.config = config;
    this.services = services;
    this.s = {
      storage: await this.services.getStorage('clear'),
    };
    this.data = {};
    return this;
  }

  async initUsersAdmin() {
    const type = 'user';
    if (!this.data['user-admin']) {
      const roles = await this.initRoles();
      let body = {
        _key: 'test-user',
        username: 'test',
        email: 'test@example.com',
        phone: '+70000000000',
        password: '123456',
        role: {_id: roles.find(s => s.name === 'admin')._id},
        profile: {
          name: 'AdminName',
          surname: 'AdminSurname'
        }
      };

      let admin = await this.s.storage.get(type).upsertOne({
        filter: {_key: body._key}, body, session: {}
      });

      // await this.s.storage.get('user').updateStatus({
      //   id: admin._id.toString(),
      //   body: {status: 'confirm'},
      //   session: {user: admin}
      // });
      this.data['user-admin'] = objectUtils.merge(body, admin);
    }
    return this.data['user-admin'];
  }

  async initRoles() {
    const type = 'role';
    if (!this.data[type]) {
      let items = [
        {name: 'admin', title: 'Админ'},
        {name: 'investor', title: 'Инвестор'},
        {name: 'consult', title: 'Инвестиционный консультант'},
      ];
      this.data[type] = [];
      for (let body of items) {
        this.data[type].push(objectUtils.merge(body, await this.s.storage.get(type).upsertOne({
          filter: {name: body.name},
          body
        })));
      }
    }
    return this.data[type];
  }

  /**
   *
   * @returns {Promise<Array>}
   */
  async initUsers() {
    const type = 'user';
    if (!this.data[type]) {
      const roles = await this.initRoles();
      let items = [
        {
          _key: 'user1',
          email: 'petya@example.com',
          phone: '+79993332211',
          password: 'password',
          username: 'petya',
          role: {_id: roles.find(s => s.name === 'investor')._id},
          profile: {
            name: 'Петя',
            surname: 'Иванов'
          }
        },
        {
          _key: 'user2',
          email: 'vasya@example.com',
          phone: '+79993332233',
          password: 'password',
          username: 'vasya',
          role: {_id: roles.find(s => s.name === 'consult')._id},
          profile: {
            name: 'Вася',
            surname: 'Петров'
          }
        }
      ];
      this.data[type] = [];
      for (let body of items) {
        this.data[type].push(objectUtils.merge(body, await this.s.storage.get(type).upsertOne({
          filter: {_key: body._key},
          body
        })));
      }
    }
    return this.data[type];
  }
}


module.exports = async (services, config, args) => {

  const init = await new Example().init(config, services);

  await init.initUsersAdmin();
  await init.initUsers();

  console.log('completed');
};
