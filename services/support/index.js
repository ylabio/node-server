class Support {

  async init(config, services) {
    this.config = config;
    this.services = services;
    this.mail = await this.services.getMail();
    this.spec = await this.services.getSpecification();
    this.spec.schemas('support', {
      type: 'object',
      title: 'Запрос в техподдержку',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          maxLength: 100,
          errors: {format: 'Incorrect format'}
        },
        subject: {type: 'string', maxLength: 100, minLength: 3},
        text: {type: 'string', maxLength: 5000, minLength: 3}
      },
      require: ['email', 'subject', 'text']
    });
    return this;
  }

  async send({body, session}) {
    let object = await this.spec.validate('support', body, {session});

    let role = session.user ? session.user.type : 'гость';
    let name = session.user && session.user.profile ? `Имя отправителя: ${session.user.profile.name} ${session.user.profile.surname}` : '';

    const mailBody = {
      replyTo: object.email,
      to: this.config.email,
      subject: 'Отправка запроса в техподдержку',
      text: `
Email: ${object.email}
Роль отправителя: ${role}
${name}
Тема: ${object.subject}
Текст:
${object.text}
      `
    };

    this.mail.tranport.sendMail(mailBody);

    return true;
  }
}

module.exports = Support;
