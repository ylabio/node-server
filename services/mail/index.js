const nodemailer = require('nodemailer');

class Mail {

  async init(config/*, services*/) {
    this.tranport = nodemailer.createTransport(config.transport, config.defaults);
  }
}

module.exports = Mail;
