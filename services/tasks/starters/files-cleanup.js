const moment = require('moment');
module.exports = async (services/*, config*/) => {
  console.log('Start cleanup files ' + moment().format('HH:mm:ss'));
  try {
    const storage = await services.getStorage();
    const files = storage.get('file');
    const result = await files.cleanup();
    const time = moment().format('HH:mm:ss');
    console.log(`Completed at ${time}. `
      + `Deleted ${result.countFiles} files and ${result.countObjects} objects`
    );
  } catch (e) {
    console.log(e);
  }
  return true;
};
