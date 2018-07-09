const moment = require('moment');
const ObjectID = require('mongodb').ObjectID;
/**
 * Обновление связей на моменты в играх
 * @param services
 * @param config
 * @param args
 * @returns {Promise<void>}
 */
const {arrayUtils, objectUtils} = require('../../../lib');

/**
 * Сервис со вспомогательными утилитами для тестирования сервера
 */
class Init {

  async init(config, services) {
    this.config = config;
    this.services = services;
    this.s = {
      storage: await this.services.getStorage(),
    };
    return this;
  }

  /**
   * Города со связами на страны
   * @returns {Promise<Array>}
   */
  async initCities() {
    if (!this._initCities) {
      let countries = await this.initCountries();

      let bodyItems = [
        {title: 'Москва', country: {_id: arrayUtils.random(countries)._id}},
        {title: 'Хельсинки', country: {_id: arrayUtils.random(countries)._id}}
      ];
      this._initCities = [];
      for (let body of bodyItems) {
        this._initCities.push(objectUtils.merge(body, await this.s.storage.get('city').createOne({body})));
      }
    }
    return this._initCities;
  }

  /**
   * Создание стран для тестов
   * @returns {Promise<Array>}
   */
  async initCountries() {
    if (!this._initCountries) {
      let bodyItems = [
        {
          title: {
            ru: 'Россия',
            en: 'Russia'
          },
          code: 'RUS'
        },
        {
          title: {
            ru: 'Финляндия',
            en: 'Finland'
          },
          code: 'FIN'
        }
      ];
      this._initCountries = [];
      for (let body of bodyItems) {
        this._initCountries.push(objectUtils.merge(body, await this.s.storage.get('country').createOne({body})));
      }
    }
    return this._initCountries;
  }

  /**
   * Лиги для тестов
   * @returns {Promise<Array>}
   */
  async initLeagues(length) {
    if (!this._initLeagues) {
      let bodyItems = [];
      for (let i = 0; i < 2; i++) {
        bodyItems.push({title: 'КХЛ' + i});
      }
      this._initLeagues = [];
      for (let body of bodyItems) {
        this._initLeagues.push(objectUtils.merge(body, await this.s.storage.get('league').createOne({body})));
      }
    }
    return this._initLeagues;
  }

  /**
   * Турниры для тестов
   * @returns {Promise<Array>}
   */
  async initTournaments() {
    if (!this._initTournaments) {
      let bodyItems = [
        {title: 'Регулярный чемпионат'},
        {title: 'Кубок Гагарина'},
      ];
      this._initTournaments = [];
      for (let body of bodyItems) {
        this._initTournaments.push(
          objectUtils.merge(body, await this.s.storage.get('tournament').createOne({body}))
        );
      }
    }
    return this._initTournaments;
  }

  async initUsersAdmin() {
    if (!this._initUsersAdmin) {
      let body = {
        type: 'admin',
        email: 'owner@example.com',
        phone: '+70000000000',
        password: '123456',
        profile: {
          name: 'AdminName',
          surname: 'AdminSurname'
        }
      };

      let admin = await this.s.storage.get('user').createOne({body, session: {}});

      await this.s.storage.get('user').updateStatus({
        id: admin._id.toString(),
        body: {status: 'confirm'},
        session: {user: admin}
      });
      this._initUsersAdmin = objectUtils.merge(body, admin);
    }
    return this._initUsersAdmin;
  }

  async initUsersPlayers() {
    if (!this._initUsersPlayers) {
      const admin = await this.initUsersAdmin();
      const teams = await this.initTeams();
      let bodyItems = [
        {
          type: 'player',
          email: 'player1@example.com',
          phone: '+79990000041',
          password: '123456',
          profile: {
            name: 'PlayerName',
            surname: 'PlayerSurname',
            teams: [{
              _id: arrayUtils.random(teams)._id,
              playerNumber: 6,
              confirmed: false
            }],
            birthday: '1999-01-01T00:00:00+03:00',
            playerRole: 'centre',
            stickGrip: 'left',
          }
        },
        {
          type: 'player',
          email: 'player2@example.com',
          phone: '+79990000042',
          password: '123456',
          profile: {
            name: 'PlayerName2',
            surname: 'PlayerSurname2',
            teams: [{
              _id: arrayUtils.random(teams)._id,
              playerNumber: 7,
              confirmed: false
            }],
            birthday: '1999-01-01T00:00:00+03:00',
            playerRole: 'centre',
            stickGrip: 'left',
          }
        },
        {
          type: 'player',
          email: 'player3@example.com',
          phone: '+79990000043',
          password: '123456',
          profile: {
            name: 'PlayerName3',
            surname: 'PlayerSurname3',
            teams: [{
              _id: arrayUtils.random(teams)._id,
              playerNumber: 8,
              confirmed: false
            }],
            birthday: '1999-01-01T00:00:00+03:00',
            playerRole: 'centre',
            stickGrip: 'left',
          }
        }
      ];
      this._initUsersPlayers = [];
      for (let body of bodyItems) {
        let player = await this.s.storage.get('user-player').createOne({body});
        player = await this.s.storage.get('user-player').updateStatus({
          id: player._id.toString(),
          body: {status: 'confirm'},
          session: {user: admin}
        });
        this._initUsersPlayers.push(
          objectUtils.merge(body, player)
        );
      }
    }
    return this._initUsersPlayers;
  }

  async initPlayerComments() {
    if (!this._initPlayerComments) {
      const admin = await this.initUsersAdmin();
      const players = await this.initUsersPlayers();

      let bodyItems = [
        {
          relative: {
            _id: arrayUtils.random(players)._id,
            _type: 'user-player'
          },
          text: 'This is a first comment'
        },
        {
          relative: {
            _id: arrayUtils.random(players)._id,
            _type: 'user-player'
          },
          text: 'This is a second comment'
        },
        {
          relative: {
            _id: arrayUtils.random(players)._id,
            _type: 'user-player'
          },
          text: 'This is a third comment'
        }
      ];

      this._initPlayerComments = [];

      for (let body of bodyItems) {
        const comment = await this.s.storage.get('comment').createOne({
          body,
          session: {user: admin}
        });
        this._initPlayerComments.push(
          objectUtils.merge(body, comment)
        );
      }
    }
    return this._initPlayerComments;
  };

  async initComplaintsKinds() {
    if (!this._initComplaintsKinds) {
      const admin = await this.initUsersAdmin();
      let bodyItems = [
        {
          for: 'game',
          title: 'Игрок не принимал участия в данной игре'
        },
        {
          for: 'game',
          title: 'Размечены не все моменты Игрока'
        },
        {
          for: 'user',
          title: 'Фиктивная страница'
        },
        {
          for: 'user',
          title: 'Недостоверная  информация в анкете'
        }
      ];

      this._initComplaintsKinds = [];
      try {
        for (let body of bodyItems) {
          const complaintKind = await this.s.storage.get('complaint-kind').createOne({
            body,
            session: {user: admin}
          });
          this._initComplaintsKinds.push(
            objectUtils.merge(body, complaintKind)
          );
        }
      } catch (e) {
        console.log(JSON.stringify(e.data));
      }
    }

    return this._initComplaintsKinds;
  }

  async initComplaints() {
    if (!this._initComplaints) {
      const admin = await this.initUsersAdmin();
      const players = await this.initUsersPlayers();
      const kinds = await this.initComplaintsKinds();

      let bodyItems = [
        {
          relative: {
            _id: players[0]._id,
            _type: players[0]._type
          },
          kind: {_id: arrayUtils.random(kinds)._id}
        },
        {
          relative: {
            _id: players[1]._id,
            _type: players[1]._type
          },
          kind: {_id: arrayUtils.random(kinds)._id}
        },
        {
          relative: {
            _id: players[2]._id,
            _type: players[2]._type
          },
          kind: {_id: arrayUtils.random(kinds)._id}
        }
      ];

      this._initComplaints = [];

      for (let body of bodyItems) {
        const complaint = await this.s.storage.get('complaint').addOne({
          body,
          session: {user: admin}
        });
        this._initComplaints.push(
          objectUtils.merge(body, complaint)
        );
      }
    }

    return this._initComplaints;
  }

  async initPlayerFavorites() {
    if (!this._initPlayerFavorites) {
      const admin = await this.initUsersAdmin();
      const players = await this.initUsersPlayers();

      let bodyItems = [
        {
          relative: {
            _id: arrayUtils.random(players)._id,
            _type: 'user-player'
          }
        },
        {
          relative: {
            _id: arrayUtils.random(players)._id,
            _type: 'user-player'
          }
        },
        {
          relative: {
            _id: arrayUtils.random(players)._id,
            _type: 'user-player'
          }
        }
      ];

      this._initPlayerFavorites = [];

      for (let body of bodyItems) {
        const favorite = await this.s.storage.get('favorite').addOne({
          body,
          session: {user: admin}
        });
        this._initPlayerFavorites.push(
          objectUtils.merge(body, favorite)
        );
      }
    }
    return this._initPlayerFavorites;
  };

  /**
   * Агенты
   * @returns {Promise<Array>}
   */
  async initUsersAgents() {
    if (!this._initUsersAgents) {
      const admin = await this.initUsersAdmin();
      const cities = await this.initCities();
      let bodyItems = [
        {
          type: 'agent',
          email: 'agent1@example.com',
          phone: '+79990000051',
          password: '123456',
          profile: {
            name: 'AgentName',
            surname: 'AgentSurname',
            city: {_id: arrayUtils.random(cities)._id},
            birthday: '1999-01-01T00:00:00+03:00',
            experience: 10000,
            regionWork: 'СНГ'
          }
        },
        {
          type: 'agent',
          email: 'agent2@example.com',
          phone: '+79990000052',
          password: '123456',
          profile: {
            name: 'AgentName',
            surname: 'AgentSurname',
            city: {_id: arrayUtils.random(cities)._id},
            birthday: '1999-01-01T00:00:00+03:00',
            experience: 10000,
            regionWork: 'СНГ'
          }
        }
      ];
      this._initUsersAgents = [];
      for (let body of bodyItems) {
        let agent = await this.s.storage.get('user-agent').createOne({body});
        agent = await this.s.storage.get('user-agent').updateStatus({
          id: agent._id.toString(),
          body: {status: 'confirm'},
          session: {user: admin}
        });
        this._initUsersAgents.push(
          objectUtils.merge(body, agent)
        );
      }
    }
    return this._initUsersAgents;
  }

  /**
   * Авторизация админа
   * @returns {Promise.<*>}
   */
  async initAuthAdmin() {
    if (!this._initAuthAdmin) {
      const admin = await this.initUsersAdmin();
      let body = {
        login: admin.email,
        password: admin.password
      };
      this._initAuthAdmin = await this.s.storage.get('user').signIn({body});
    }
    return this._initAuthAdmin;
  }

  /**
   * Клубы
   * @returns {Promise<Array>}
   */
  async initClubs() {
    if (!this._initClubs) {
      const admin = await this.initUsersAdmin();
      const cities = await this.initCities();
      let bodyItems = [
        {
          name: 'ЦСКА',
          city: {_id: arrayUtils.random(cities)._id},
          status: 'confirm'
        },
        {
          name: 'Динамо',
          city: {_id: arrayUtils.random(cities)._id},
          status: 'confirm'
        }
      ];
      this._initClubs = [];
      for (let body of bodyItems) {
        let club = await this.s.storage.get('club').createOne({body, session: {user: admin}});
        this._initClubs.push(
          objectUtils.merge(body, club)
        );
      }
    }
    return this._initClubs;
  }

  /**
   * Команды
   * @returns {Promise<Array>}
   */
  async initTeams() {
    if (!this._initTeams) {
      const admin = await this.initUsersAdmin();
      const cities = await this.initCities();
      const leagues = await this.initLeagues();
      const clubs = await this.initClubs();
      let bodyItems = [
        {
          name: 'ЦСКА#1',
          league: {_id: leagues[0]._id},
          club: {_id: arrayUtils.random(clubs)._id},
          city: {_id: arrayUtils.random(cities)._id},
          status: 'confirm'
        },
        {
          name: 'Динамо#2',
          league: {_id: leagues[0]._id},
          club: {_id: arrayUtils.random(clubs)._id},
          city: {_id: arrayUtils.random(cities)._id},
          status: 'confirm'
        },
        {
          name: 'Динамо#3',
          league: {_id: leagues[1]._id},
          club: {_id: arrayUtils.random(clubs)._id},
          city: {_id: arrayUtils.random(cities)._id},
          status: 'confirm'
        }
      ];
      this._initTeams = [];
      for (let body of bodyItems) {
        let team = await this.s.storage.get('team').createOne({body, session: {user: admin}});
        this._initTeams.push(
          objectUtils.merge(body, team)
        );
      }
    }
    return this._initTeams;
  }

  /**
   * Создание этапов для тестов
   * @returns {Promise<Array>}
   */
  async initStages() {
    if (!this._initStages) {
      let bodyItems = [
        {
          title: {ru: 'Регулярный чемпионат', en: 'Regular championship'}
        },
        {
          title: {ru: 'Плэй-офф', en: 'Play-off'}
        }
      ];
      this._initStages = [];
      for (let body of bodyItems) {
        this._initStages.push(objectUtils.merge(body, await this.s.storage.get('stage').createOne({body})));
      }
    }
    return this._initStages;
  }

  async initGames() {
    if (!this._initGames) {
      const admin = await this.initUsersAdmin();
      const stages = await this.initStages();
      const files = await this.initFiles();
      const leagues = await this.initLeagues();
      const teams = await this.initTeams();

      let bodyItems = [
        {
          image: {_id: arrayUtils.random(files)._id},
          video: {_id: arrayUtils.random(files)._id},
          dateGame: '2017-09-26',
          stage: {_id: arrayUtils.random(stages)._id},
          league: {_id: leagues[0]._id},
          team1: {_id: teams[0]._id},
          team2: {_id: teams[1]._id},
          score: {
            team1: 5,
            team2: 1
          }
        },
        {
          image: {_id: arrayUtils.random(files)._id},
          video: {_id: arrayUtils.random(files)._id},
          dateGame: '2017-09-28',
          stage: {_id: arrayUtils.random(stages)._id},
          league: {_id: leagues[0]._id},
          team1: {_id: teams[1]._id},
          team2: {_id: teams[0]._id},
          score: {
            team1: 5,
            team2: 5
          }
        }
      ];
      this._initGames = [];
      for (let body of bodyItems) {
        const g = objectUtils.merge(body, await this.s.storage.get('game').createOne({
          body,
          session: {user: admin}
        }));
        this._initGames.push(g);
        await this.s.storage.get('game').updateStatus({
          id: g._id,
          body: {status: 'confirm'},
          session: {user: admin}
        });
      }
    }
    return this._initGames;
  }

  /**
   * Создание видов действий для тестов
   * @returns {Promise<Array>}
   */
  async initActionsKinds() {
    if (!this._initActionsKinds) {
      let bodyItems = [
        {
          title: {ru: 'Броски', en: 'Shots'},
          whom: 'player'
        },
        {
          title: {ru: 'Силовые приемы', en: 'Сheckings'},
          whom: 'player'
        },
        {
          title: {ru: 'Отраженные броски', en: 'Saves'},
          whom: 'goalkeeper'
        },
        {
          title: {ru: 'Пропущенные голы', en: 'Goals against'},
          whom: 'goalkeeper'
        }
      ];
      this._initActionsKinds = [];
      for (let body of bodyItems) {
        this._initActionsKinds.push(
          objectUtils.merge(body, await this.s.storage.get('action-kind').createOne({body}))
        );
      }
    }
    return this._initActionsKinds;
  }

  /**
   * Создание действий для тестов
   * @returns {Promise<Array>}
   */
  async initActions() {
    if (!this._initActions) {
      const admin = await this.initUsersAdmin();
      const players = await this.initUsersPlayers();
      const games = await this.initGames();
      const files = await this.initFiles();
      const kinds = await this.initActionsKinds();

      let bodyItems = [
        {
          player: {_id: arrayUtils.random(players)._id},
          game: {_id: arrayUtils.random(games)._id},
          image: {_id: arrayUtils.random(files)._id},
          timeStart: 5,
          timeLength: 100,
          kinds: [{_id: arrayUtils.random(kinds)._id, plusMinus: 1}]
        },
        {
          player: {_id: arrayUtils.random(players)._id},
          game: {_id: arrayUtils.random(games)._id},
          image: {_id: arrayUtils.random(files)._id},
          timeStart: 0,
          timeLength: 50,
          kinds: [{_id: arrayUtils.random(kinds)._id, plusMinus: -1}]
        },
        {
          player: {_id: arrayUtils.random(players)._id},
          game: {_id: arrayUtils.random(games)._id},
          image: {_id: arrayUtils.random(files)._id},
          timeStart: 5632,
          timeLength: 2300,
          kinds: [{_id: arrayUtils.random(kinds)._id, plusMinus: 1}]
        }
      ];
      this._initActions = [];
      for (let body of bodyItems) {
        this._initActions.push(
          objectUtils.merge(
            body, await this.s.storage.get('action').createOne({body, session: {user: admin}})
          )
        );
      }
    }
    return this._initActions;
  }

  async initFiles() {
    if (!this._initFiles) {
      let bodyItems = [
        {
          url: 'http://example.com/file.avi',
          name: 'file1',
          type: 'video',
          mime: 'video/mpeg-4',
          originalName: 'my-super-video.avi'
        },
        {
          url: 'http://example.com/file2.avi',
          name: 'file2',
          type: 'video',
          mime: 'video/mpeg-4',
          originalName: 'my-super-video2.avi'
        }
      ];
      this._initFiles = [];
      for (let body of bodyItems) {
        this._initFiles.push(
          objectUtils.merge(body, await this.s.storage.get('file').createOne({body}))
        );
      }
    }
    return this._initFiles;
  }

  async initAnalysis() {
    if (!this._initAnalysis) {
      const admin = await this.initUsersAdmin();
      const players = await this.initUsersPlayers();
      const games = await this.initGames();

      let bodyItems = [{
        time: 25,
        svg: '<svg>Some SVG content</svg>',
        game: {
          _id: arrayUtils.random(games)._id
        }
      }, {
        time: 30,
        svg: '<svg>Some SVG content</svg>',
        game: {
          _id: arrayUtils.random(games)._id
        }
      }, {
        time: 40,
        svg: '<svg>Some SVG content</svg>',
        game: {
          _id: arrayUtils.random(games)._id
        }
      }];

      this._initAnalysis = [];

      for (let body of bodyItems) {
        this._initAnalysis.push(
          objectUtils.merge(body, await this.s.storage.get('analysis').createOne({
            body,
            session: {user: admin}
          }))
        );
      }
    }
    return this._initAnalysis;
  };

  async initStatistics() {
    if (!this._initStatistics) {
      const admin = await this.initUsersAdmin();
      const players = await this.initUsersPlayers();
      const leagues = await this.initLeagues();

      let bodyItems = [{
        tournament: 'Регулярный чемпионат',
        season: '2013/2014',
        team: 'Металлург (Магнитогорск)',
        table: {
          gamesPlayed: 54.0,
          goals: 23.0,
          assists: 45.0,
          points: 68.0,
          plusMinus: 46.0,
          penaltyTime: 2760.0,
          equalityPlayGoals: 18.0,
          powerPlayGoals: 5.0,
          shorthandedGoals: 0.0,
          overtimeGoals: 0.0,
          gameWinningGoals: 5.0,
          bulletWinning: 0.0,
          shots: 135.0,
          shotsSuccessPercent: 17.0,
          shotsAvg: 2.5,
          faceOffs: 951.0,
          faceOffsWinning: 484.0,
          faceOffsWinningPercent: 50.9,
          timeOnIceAvg: 1265.0,
          shiftsAvg: 20.4,
          checkings: 0.0,
          shotsBlocked: 0.0,
          fouls: 0.0
        },
        user: {
          _id: arrayUtils.random(players)._id,
        },
        league: {
          _id: arrayUtils.random(leagues)._id,
        },
        type: 'player',
      }, {
        tournament: 'Регулярный чемпионат',
        season: '2013/2014',
        team: 'Металлург (Магнитогорск)',
        table: {
          gamesPlayed: 54.0,
          goals: 23.0,
          assists: 45.0,
          points: 68.0,
          plusMinus: 46.0,
          penaltyTime: 2760.0,
          equalityPlayGoals: 18.0,
          powerPlayGoals: 5.0,
          shorthandedGoals: 0.0,
          overtimeGoals: 0.0,
          gameWinningGoals: 5.0,
          bulletWinning: 0.0,
          shots: 135.0,
          shotsSuccessPercent: 17.0,
          shotsAvg: 2.5,
          faceOffs: 951.0,
          faceOffsWinning: 484.0,
          faceOffsWinningPercent: 50.9,
          timeOnIceAvg: 1265.0,
          shiftsAvg: 20.4,
          checkings: 0.0,
          shotsBlocked: 0.0,
          fouls: 0.0
        },
        user: {
          _id: arrayUtils.random(players)._id,
        },
        league: {
          _id: arrayUtils.random(leagues)._id,
        },
        type: 'player',
      }, {
        tournament: 'Регулярный чемпионат',
        season: '2013/2014',
        team: 'Металлург (Магнитогорск)',
        table: {
          gamesPlayed: 54.0,
          goals: 23.0,
          assists: 45.0,
          points: 68.0,
          plusMinus: 46.0,
          penaltyTime: 2760.0,
          equalityPlayGoals: 18.0,
          powerPlayGoals: 5.0,
          shorthandedGoals: 0.0,
          overtimeGoals: 0.0,
          gameWinningGoals: 5.0,
          bulletWinning: 0.0,
          shots: 135.0,
          shotsSuccessPercent: 17.0,
          shotsAvg: 2.5,
          faceOffs: 951.0,
          faceOffsWinning: 484.0,
          faceOffsWinningPercent: 50.9,
          timeOnIceAvg: 1265.0,
          shiftsAvg: 20.4,
          checkings: 0.0,
          shotsBlocked: 0.0,
          fouls: 0.0
        },
        user: {
          _id: arrayUtils.random(players)._id,
        },
        league: {
          _id: arrayUtils.random(leagues)._id,
        },
        type: 'player',
      }];

      this._initStatistics = [];
      for (let body of bodyItems) {
        const report = await this.s.storage.get(body.type, 'statistic').createOne({
          body,
          session: {user: admin}
        });
        this._initStatistics.push(
          objectUtils.merge(body, report)
        );
      }
    }
    return this._initStatistics;
  }

  async initReports() {
    if (!this._initReports) {
      const admin = await this.initUsersAdmin();
      const players = await this.initUsersPlayers();

      let bodyItems = [{
        text: 'Report test text 1',
        type: 'user',
        relative: {
          _id: arrayUtils.random(players)._id,
          _type: 'user'
        }
      }, {
        text: 'Report test text 2',
        type: 'user',
        relative: {
          _id: arrayUtils.random(players)._id,
          _type: 'user'
        }
      }, {
        text: 'Report test text 3',
        type: 'user',
        relative: {
          _id: arrayUtils.random(players)._id,
          _type: 'user'
        }
      }];

      this._initReports = [];
      for (let body of bodyItems) {
        const report = await this.s.storage.get('report').createOne({
          body,
          session: {user: admin}
        });
        this._initReports.push(
          objectUtils.merge(body, report)
        );
      }
    }
    return this._initReports;
  }

  async initForRatings() {
    const leagues = await this.initLeagues();
    const players = await this.initUsersPlayers();
    const seasons = ['2016/2017', '2017/2018'];
    const stages = await this.initStages();
    const kinds = await this.initActionsKinds();
    // Создать игры под разные лиги, сезоны, этапы
    // В играх для нескольиких игроков создать действия
    const game = {
      video: {_id: arrayUtils.random(files)._id},
      dateGame: '2017-09-26',
      stage: {_id: arrayUtils.random(stages)._id},
      league: {_id: arrayUtils.random(leagues)._id},
      team1: {_id: arrayUtils.random(teams)._id},
      team2: {_id: arrayUtils.random(teams)._id},
      score: {
        team1: 5,
        team2: 1
      }
    };
  }
}


module.exports = async (services, config, args) => {

  const init = await new Init().init(config, services);

  await init.initActions();

  console.log('completed');
};
