/**
 * Сервис для инициализации сервера
 */
class Initialize {

  async init(config, services) {
    this.config = config;
    this.services = services;
    this.starters = require('./starters');
    return this;
  }

  async start(name, ...args) {
    if (name in this.starters) {
      await this.starters[name](this.services, this.config.starters[name] || {}, args);
    }
  }
}

module.exports = Initialize;
