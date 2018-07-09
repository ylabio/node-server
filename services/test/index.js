const {arrayUtils, objectUtils} = require('../../lib');

/**
 * Сервис со вспомогательными утилитами для тестирования сервера
 */
class Test {

  async init(config, services) {
    this.config = config;
    this.services = services;
    this.s = {
      storage: await this.services.getStorage('clear'),
      restApi: await this.services.getRestAPI(),
    };
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
    if (!this._initUsersAdmin) {
      let body = {
        //type: 'admin',
        email: 'owner@example.com',
        phone: '+70000000000',
        password: '123456',
        profile: {
          name: 'AdminName',
          surname: 'AdminSurname'
        }
      };

      let admin = await this.s.storage.get('user').createOne({body, session: {}});

      // await this.s.storage.get('user').updateStatus({
      //   id: admin._id.toString(),
      //   body: {status: 'confirm'},
      //   session: {user: admin}
      // });
      this._initUsersAdmin = objectUtils.merge(body, admin);
    }
    return this._initUsersAdmin;
  }

  async initUsers() {
    if (!this._initUsers) {
      const admin = await this.initUsersAdmin();
      let bodyItems = [
        {
          email: 'user1@example.com',
          phone: '+79990000041',
          password: '123456',
          profile: {
            name: 'userName',
            surname: 'userSurname'
          }
        },
        {
          email: 'user2@example.com',
          phone: '+79990000042',
          password: '123456',
          profile: {
            name: 'userName2',
            surname: 'userSurname2',
            birthday: '1999-01-01T00:00:00+03:00'
          }
        },
        {
          email: 'user3@example.com',
          phone: '+79990000043',
          password: '123456',
          profile: {
            name: 'userName3',
            surname: 'userSurname3',
            birthday: '1999-01-01T00:00:00+03:00'
          }
        }
      ];
      this._initUsers = [];
      for (let body of bodyItems) {
        let user = await this.s.storage.get('user').createOne({body});
        // user = await this.s.storage.get('user').updateStatus({
        //   id: user._id.toString(),
        //   body: {status: 'confirm'},
        //   session: {user: admin}
        // });
        this._initUsers.push(
          objectUtils.merge(body, user)
        );
      }
    }
    return this._initUsers;
  }

  async initComments() {
    if (!this._initComments) {
      const admin = await this.initUsersAdmin();
      const users = await this.initUsers();

      let bodyItems = [
        {
          relative: {
            _id: arrayUtils.random(users)._id,
            _type: 'user'
          },
          text: 'This is a first comment'
        },
        {
          relative: {
            _id: arrayUtils.random(users)._id,
            _type: 'user'
          },
          text: 'This is a second comment'
        },
        {
          relative: {
            _id: arrayUtils.random(users)._id,
            _type: 'user'
          },
          text: 'This is a third comment'
        }
      ];

      this._initComments = [];

      for (let body of bodyItems) {
        const comment = await this.s.storage.get('comment').createOne({
          body,
          session: {user: admin}
        });
        this._initComments.push(
          objectUtils.merge(body, comment)
        );
      }
    }
    return this._initComments;
  };

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
