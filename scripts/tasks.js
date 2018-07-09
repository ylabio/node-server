const config = require('../config.js');
const Services = require('../services/index');
const args = process.argv.slice(2);

(async () => {
  const services = await new Services().init(config);
  const tasks = await services.getTasks();
  await tasks.start(args[0], args[1]);
})();

process.on('unhandledRejection', function (reason/*, p*/) {
  console.error(reason);
});
