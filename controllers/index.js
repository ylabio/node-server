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
  /**
   * Комментарии
   */
  require('./comments'),

  /**
   * Техподдержка
   */
  //require('./support'),

  /*
   * Файлы
   */
  require('./files'),
];
