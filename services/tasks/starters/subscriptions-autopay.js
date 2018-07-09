const moment = require('moment');
module.exports = async (services/*, config*/) => {
  console.log('Start refresh subscriptions ' + moment().format('HH:mm:ss'));
  try {
    const storage = await services.getStorage();
    const s = storage.get('subscription');
    const result = await s.checkPays();
    const time = moment().format('HH:mm:ss');
    console.log(`Completed at ${time}. `);
  } catch (e) {
    console.log(e);
  }
  return true;
};
