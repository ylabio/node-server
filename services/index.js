class Services {

  init(config) {
    this.config = config;
    this.list = [];
    return this;
  }

  /**
   *
   * @param name
   * @param {String} path
   * @returns {Promise<*>}
   */
  async import(name, path, ...args) {
    if (!this.list[name]) {
      const ClassName = require(path);
      this.list[name] = new ClassName();
      await this.list[name].init(this.config[name], this, ...args);
    }
    return this.list[name];
  }

  /**
   * @returns {Promise.<Storage>}
   */
  async getStorage(mode) {
    return this.import('storage', './storage', mode);
  }

  /**
   * @returns {Promise.<Spec>}
   */
  async getSpecification() {
    return this.getSpec();
  }

  /**
   * @returns {Promise.<Spec>}
   */
  async getSpec() {
    return this.import('spec', './spec');
  }

  /**
   * @returns {Promise.<Mailer>}
   */
  async getMail() {
    return this.import('mail', './mail');
  }

  /**
   * @returns {Promise.<RestAPI>}
   */
  async getRestAPI() {
    return this.import('restApi', './rest-api');
  }

  /**
   * @returns {Promise.<Tasks>}
   */
  async getTasks() {
    return this.import('tasks', './tasks');
  }

  /**
   * @returns {Promise.<Test>}
   */
  async getTest() {
    return this.import('test', './test');
  }

  /**
   * @returns {Promise.<Support>}
   */
  async getSupport() {
    return this.import('support', './support');
  }

  /**
   * @returns {Promise.<Initialize>}
   */
  async getInitialize() {
    return this.import('initialize', './initialize');
  }
}

module.exports = Services;
