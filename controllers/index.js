module.exports = [
  /**
   * Документация АПИ
   */
  require('./swagger'),
  /**
   * Пользователи
   */
  require('./auth'),
  require('./users'),
  require('./roles'),

  /**
   * Техподдержка
   */
  //require('./support'),

  /*
   * Файлы
   */
  require('./files'),
];
