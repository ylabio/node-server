const {arrayUtils} = require('../../lib');

describe('Auth API', () => {
  let s = {};
  let data = {};

  beforeAll(async () => {
    s.services = await require('../../services/init-spec');
    s.test = await s.services.getTest();
    s.http = await s.test.getHttp();
    // Начальные данные для тестов
    data.users = await s.test.initUsers();
  });

  describe('Test user auth', () => {
    test('Авторизация', async () => {
      const user = arrayUtils.random(data.users);
      const response = await s.http.post('/api/v1/users/sign').send({
        login: user.email,
        password: user.password
      });
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('result.token');
    });
  });
});
