const moment = require('moment');
module.exports = async (services/*, config*/) => {
  console.log(`Start indexing search ${moment().format('HH:mm:ss')}`);
  const storage = await services.getStorage();
  const result = await storage.get('search').indexAll();
  // const initialize = await services.getInitialize();
  // await initialize.start('actions','owner@example.com', 'password');
  console.log(`Completed indexing search ${moment().format('HH:mm:ss')}`);
  return true;
};
