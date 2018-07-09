const {errors, queryUtils} = require('./../../lib');

module.exports = async (router, services) => {

  const spec = await services.getSpecification();
  const storage = await services.getStorage();
  /** @type {User} */
  const userStore = storage.get('user');
  /**
   * Инициализация сессии запроса
   * - Аутентификация запроса по токену
   * - Параметры локали
   */
  router.use('', async (req, res, next) => {
    req.session = {
      acceptLang: (req.query.lang || req.get('X-Lang') || req.get('Accept-Language') || 'ru').split('-')[0]
    };
    try {
      let token = req.get('X-Token');
      let auth = await userStore.auth({token, fields: 'token,user(*)'});
      if (auth) {
        req.session.user = auth.user;
        req.session.token = auth.token;
      }
      next();
    } catch (e) {
      if (e instanceof errors.NotFound) {
        next();//new errors.Forbidden({}, 'Token not found', 101)
      } else {
        next(e);
      }
    }
  });
};
