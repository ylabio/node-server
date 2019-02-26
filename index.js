/**
 * Start application server
 */
const config = require('./config.js');
const Services = require('./services');

(async () => {
  const services = await new Services().init(config);
  // Сервис с express сервером и настроенным роутингом
  const restApi = await services.getRestAPI();
  const server = await restApi.getServer();
  server.listen(config.server.port, config.server.host, function () {
    console.log(`Server run on http://${config.server.host}:${config.server.port}`);
    console.log(`API Doc on http://${config.server.host}:${config.server.port}/api/v1/docs/`);
  });
})();

process.on('unhandledRejection', function (reason/*, p*/) {
  console.error(reason);
});
