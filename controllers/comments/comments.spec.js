const {arrayUtils} = require('../../lib');

describe('Comments API', () => {
  let s = {};
  let data = {};

  beforeAll(async () => {
    s.services = await require('../../services/init-spec');
    s.test = await s.services.getTest();
    s.http = await s.test.getHttp();

    data.admin = await s.test.initUsersAdmin();
    data.auth = await s.test.initAuthAdmin();
    data.users = await s.test.initUsers();
    data.comments = await s.test.initComments();
  });

  describe('Test comments CRUD', () => {
    test('Create comment to user as object', async () => {
      const userId = arrayUtils.random(data.users)._id;

      const body = {
        relative: {
          _id: userId,
          _type: 'user'
        },
        text: 'This is a comment'
      };

      const response = await s.http
        .post('/api/v1/comments/').query({fields: '*'})
        .set('X-Token', data.auth.token)
        .send(body);

      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({result: {text: 'This is a comment'}});
    });

    test('Update comment', async () => {
      const body = {
        text: 'This is a updated comment'
      };

      const response = await s.http
        .put('/api/v1/comments/' + arrayUtils.random(data.comments)._id)
        .query({fields: '*'})
        .set('X-Token', data.auth.token)
        .send(body);

      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({result: {text: 'This is a updated comment'}});
    });

    test('Delete comment', async () => {
      const response = await s.http
        .delete('/api/v1/comments/' + arrayUtils.random(data.comments)._id)
        .query({fields: '*,isDeleted'})
        .set('X-Token', data.auth.token)
        .send();

      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({result: {isDeleted: true}});
    });
  });
});
