//const SECOND = 1000;
//const MINUTE = SECOND * 60;

class Tasks {

  async init(config, services) {
    this.config = config;
    this.services = services;
    this.starters = require('./starters');
    return this;
  }

  async start(name, intervalSec = null) {
    if (!intervalSec) {
      if (this.config.starters[name] && this.config.starters[name].interval) {
        intervalSec = this.config.starters[name].interval;
      } else {
        intervalSec = 60;
      }
      const interval = parseInt(intervalSec * 1000);

      if ((name in this.starters) && interval > 999) {
        return new Promise((resolve, reject) => {
          let errors = 0;
          const loop = async () => {
            try {
              await this.starters[name](this.services, this.config.starters[name] || {});
              errors = 0;
              setTimeout(loop, interval);
            } catch (e) {
              if (errors > 2) {
                reject(e);
              } else {
                setTimeout(loop, interval);
                errors++;
              }
            }
          };
          loop();
        });
      } else {
        console.error('Unknown starter name or bad interval');
      }
    }
  }
}

module.exports = Tasks;
