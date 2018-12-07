const config = require('./config.js');
const Services = require('./services');
const args = process.argv.slice(2);

(async () => {
  const services = await new Services().init(config);
  const initialize = await services.getInitialize();
  await initialize.start(...args);
})();

process.on('unhandledRejection', function (reason/*, p*/) {
  console.error(reason);
});
