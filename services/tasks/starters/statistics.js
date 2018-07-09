const moment = require('moment');
module.exports = async (services/*, config*/) => {
  console.log('Start updating statistics ' + moment().format('HH:mm:ss'));
  const storage = await services.getStorage();
  const result = await storage.get('statistic').updateAll();
  const time = moment().format('HH:mm:ss');
  console.log(`Completed updating statistics ${time}, `
    + `updated: ${result.tables} tables of ${result.players} players`
  );
  return true;
};
