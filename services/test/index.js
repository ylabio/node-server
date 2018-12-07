const {arrayUtils, objectUtils} = require('../../lib');

/**
 * Сервис со вспомогательными утилитами для тестирования сервера
 */
class Test {

  async init(config, services) {
    this.config = config;
    this.services = services;
    this.s = {
      /** @type Storage */
      storage: await this.services.get('storage','clear'),
      restApi: await this.services.get('rest-api'),
    };
    this.s.storage.
    this.data = {};
    return this;
  }

  /**
   * RestAPI в supertest для прямого вызова api запросов
   * Имитация HTTP запросов к роутреам приложения
   * Для тестирвания
   * @returns {Promise.<Test|obj|*>}
   */
  async getHttp() {
    if (!this._http) {
      this._http = require('supertest')(await this.s.restApi.getServer());
    }
    return this._http;
  }

  async initUsersAdmin() {
    const type = 'user';
    if (!this.data['user-admin']) {
      let body = {
        _key: 'test-user',
        email: 'test@example.com',
        phone: '+70000000000',
        password: '123456',
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


  /**
   *
   * @returns {Promise<Array>}
   */
  async initUsers() {
    const type = 'user';
    if (!this.data[type]) {
      let items = [
        {
          _key: 'user1',
          email: 'petya@example.com',
          phone: '+79993332211',
          password: 'password',
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

  /**
   *
   * @returns {Promise<Array>}
   */
  async initProjects() {
    const type = 'project';
    if (!this.data[type]) {
      let items = [
        {name: 'project1', title: 'Проект 1'},
        {name: 'project2', title: 'Проект 2'}
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

  async initPlans() {
    const type = 'plan';
    if (!this.data[type]) {
      const projects = await this.initProjects();

      let items = [
        // {
        //   name: 'draft',
        //   title: 'Черновая оценка',
        //   description: 'Черновая быстрая оценка проекта',
        //   project: {_id: projects[0]._id},
        //   _key: 'test-project-1__draft'
        // },
        // {
        //   name: 'detail',
        //   title: 'Детальная оценка',
        //   description: 'Детальная оценка для утверждения договора работ',
        //   project: {_id: projects[0]._id},
        //   _key: 'test-project-1__detail'
        // },
        {
          name: 'plan',
          title: 'План по спринтам',
          description: 'План работ по спринтам. Незапланированные задачи в бэклоге',
          project: {_id: projects[0]._id},
          _key: 'test-project-1__plan'
        },
        {
          name: 'plan',
          title: 'План по спринтам',
          description: 'План работ по спринтам. Незапланированные задачи в бэклоге',
          project: {_id: projects[1]._id},
          _key: 'test-project-2__plan'
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

  /**
   *
   * @returns {Promise<Array>}
   */
  async initSprints() {
    const type = 'sprint';
    if (!this.data[type]) {
      const plans = await this.initPlans();
      const statuses = await this.initStatuses();

      let items = [
        {
          _key: 'test-project-1__sprint1',
          title: 'Спринт 1',
          dateStart: '2018-09-10T00:00:00+03:00',
          dateEnd: '2018-09-23T23:59:59+03:00',
          project: {_id: plans[0].project._id},
          plan: {_id: plans[0]._id},
          status: {_id: statuses.find(s => s.name === 'closed')._id}
        },
        {
          _key: 'test-project-1__sprint1',
          title: 'Спринт 2',
          dateStart: '2018-09-10T00:00:00+03:00',
          dateEnd: '2018-09-23T23:59:59+03:00',
          project: {_id: plans[0].project._id},
          plan: {_id: plans[0]._id},
          status: {_id: statuses.find(s => s.name === 'plan')._id}
        },
        // Backlog спринты должны сами создаваться
        // {
        //   _key: 'test-project-1__backlog',
        //   title: 'Backlog',
        //   project: {_id: plans[0].project._id},
        //   plan: {_id: plans[0]._id},
        //   isBacklog: true
        // },
        // {
        //   _key: 'test-project-2__backlog',
        //   title: 'Backlog',
        //   project: {_id: plans[1].project._id},
        //   plan: {_id: plans[1]._id},
        //   isBacklog: true
        // },
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

  async initFeatures() {
    const type = 'feature';
    if (!this.data[type]) {
      const plans = await this.initPlans();
      const sprints = await this.initSprints();
      const statuses = await this.initStatuses();

      let items = [
        {
          _key: 'test-project-1__feature1',
          title: 'Эпик 1',
          description: 'Описание эпика 1',
          time: 28800,
          timeReal: 0,
          status: {_id: statuses[0]._id},
          sprint: {_id: sprints[0]._id},
          plan: {_id: plans[0]._id},
          project: {_id: plans[0].project._id},
        },
        {
          _key: 'test-project-2__feature1',
          title: 'ЭПИК 1',
          description: 'Описание эпика 1',
          time: 14400,
          timeReal: 0,
          status: {_id: statuses[1]._id},
          sprint: {_id: sprints[1]._id},
          plan: {_id: plans[1]._id},
          project: {_id: plans[1].project._id},
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

  async initTasks() {
    const type = 'task';
    if (!this.data[type]) {
      const plans = await this.initPlans();
      const sprints = await this.initSprints();
      const features = await this.initFeatures();
      const statuses = await this.initStatuses();
      const executors = await this.initUsers();

      let items = [
        {
          _key: 'task-1',
          title: 'Задача 1',
          description: 'Описание задачи 1',
          time: 7200,
          timeReal: 0,
          priority: 0,
          status: {_id: statuses[0]._id},
          feature: {_id: features[0]._id},
          sprint: {_id: sprints[0]._id},
          plan: {_id: plans[0]._id},
          project: {_id: plans[0].project._id},
          executor: {_id: executors[0]._id}
        },
        {
          _key: 'task-2',
          title: 'Задача 2',
          description: 'Описание задачи 2',
          time: 14400,
          timeReal: 0,
          priority: 0,
          status: {_id: statuses[1]._id},
          feature: {_id: features[1]._id},
          sprint: {_id: sprints[1]._id},
          plan: {_id: plans[1]._id},
          project: {_id: plans[1].project._id},
          executor: {_id: executors[1]._id}
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

  async initStatuses() {
    const type = 'status';
    if (!this.data[type]) {
      let items = [
        {name: 'plan', title: 'Планируется', for: ['sprint'], color: '#a2a2a2'},
        {name: 'agreed', title: 'Согласован', for: ['sprint'], color: '#52959e'},
        {name: 'todo', title: 'В очереди', for: ['task'], color: '#b472af'},
        {name: 'work', title: 'В работе', for: ['task', 'sprint'], color: '#219aff'},
        {name: 'completed', title: 'Выполнен(|а|о)', for: ['task', 'sprint'], color: '#c1c318'},
        {name: 'closed', title: 'Закрыт(|а|о)', for: ['task','sprint'], color: '#65ac10'},
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
   * Авторизация админа
   * @returns {Promise.<*>}
   */
  async initAuthAdmin() {
    if (!this._initAuthAdmin) {
      const admin = await this.initUsersAdmin();
      let body = {
        login: admin.email,
        password: admin.password
      };
      this._initAuthAdmin = await this.s.storage.get('user').signIn({body});
    }
    return this._initAuthAdmin;
  }

  async initFiles() {
    if (!this._initFiles) {
      let bodyItems = [
        {
          url: 'http://example.com/file.png',
          name: 'file1',
          type: 'image',
          mime: 'image/pmg',
          originalName: 'my-image.png'
        },
        {
          url: 'http://example.com/file2.avi',
          name: 'file2',
          type: 'video',
          mime: 'video/mpeg-4',
          originalName: 'home-video2.avi'
        }
      ];
      this._initFiles = [];
      for (let body of bodyItems) {
        this._initFiles.push(
          objectUtils.merge(body, await this.s.storage.get('file').createOne({body}))
        );
      }
    }
    return this._initFiles;
  }
}

module.exports = Test;
