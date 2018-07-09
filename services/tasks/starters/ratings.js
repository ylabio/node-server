const moment = require('moment');
module.exports = async (services/*, config*/) => {
  console.log(`Start updating ratings ${moment().format('HH:mm:ss')}`);
  const storage = await services.getStorage();
  const result = await storage.get('rating').calculateAll({});
  // const initialize = await services.getInitialize();
  // await initialize.start('actions','owner@example.com', 'password');
  console.log(`Completed updating ratings ${moment().format('HH:mm:ss')}`);
  return true;
};
