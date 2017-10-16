'use strict';
var Promise = require('bluebird');
var utils = require('../../server/utils');

function getMockedWeather(Weather, result) {
  var weatherResults = [];
  return new Promise(function(resolve, reject) {
    var lastIndex = result.length - 1;
    var lastTeamName = result[lastIndex]['homeTeam'] ?
      result[lastIndex]['homeTeam']['teamName'] :
      result[lastIndex]['homeTeamName'];

    result.forEach(function(res) {
      var teamName = res['homeTeam'] ?
        res['homeTeam']['teamName'] : res['homeTeamName'];
      console.log('team search', teamName);
      Weather.find({where: {team: teamName}}).then(function(weather) {
        var total = weather.length;
        console.log('found weather', total);
        if (weather.length) {
          res['weather'] = weather[total - 1];
          weatherResults.push(res);
        } else {
          res['weather'] = {};
          weatherResults.push(res);
        }
        if (teamName == lastTeamName) {
          resolve(weatherResults);
        }
      }).catch(function(error) {
        console.log('No weather found ', error);
        weatherResults.push(res);
        if (teamName == lastTeamName) {
          resolve(weatherResults);
        }
      });
    });
  });
}

module.exports = function(Schedule) {
  // Remote Methods
  Schedule.disableRemoteMethodByName('create');
  Schedule.disableRemoteMethodByName('upsert');
  Schedule.disableRemoteMethodByName('upsertWithWhere');
  Schedule.disableRemoteMethodByName('updateAll');
  Schedule.disableRemoteMethodByName('prototype.updateAttributes');
  Schedule.disableRemoteMethodByName('prototype.updateAttribute');
  Schedule.disableRemoteMethodByName('prototype.verify');
  Schedule.disableRemoteMethodByName('replaceOrCreate');
  Schedule.disableRemoteMethodByName('replaceById');
  Schedule.disableRemoteMethodByName('createChangeStream');
  Schedule.disableRemoteMethodByName('find');
  Schedule.disableRemoteMethodByName('findOne');
  Schedule.disableRemoteMethodByName('deleteById');
  Schedule.disableRemoteMethodByName('confirm');
  Schedule.disableRemoteMethodByName('count');
  Schedule.disableRemoteMethodByName('exists');
  /**
  * Finds historical score data based on a given season and week.
  * @param {number} leagueType The sports league to get a schedule from. For
                               NFL, use 0.
  * @param {number} season The season in the league represented by a year.
  * @param {number} week The week in the given season.
  * @param {Function(Error, array)} callback
  */
  Schedule.historical = function(season, week, callback) {
    Schedule.find({where: {season: season, week: week}})
    .then(function(results) {
      callback(null, results);
    })
    .catch(function(error) {
      console.log('Error retrieving schedule');
      callback(error, null);
    });
  };
  /**
  * Finds live, granular score data on a given season and week.
  * @param {number} leagueType The sports league to get a schedule from. For
                               NFL, use 0.
  * @param {number} season The season in the league represented by a year.
  * @param {number} week The week in the given season.
  * @param {Function(Error, array)} callback
  */
  Schedule.live = function(leagueType, season, week, callback) {
    var ScheduleScrapper = Schedule.app.dataSources.ScheduleScrapper;
    var Weather = Schedule.app.models.Weather;
    ScheduleScrapper.live(leagueType, season, week)
    .then(function(result) {
      var promise = getMockedWeather(Weather, result);
      promise.then(function(result) {
        callback(null, result);
      });
    })
    .catch(function(error) {
      console.log('Error getting live schedule');
      callback(error, null);
    });
  };

  /**
  * Retrieves a mock schedule to use for testing in the staging environment.
  * @param {number} leagueType The sports league to get a schedule from.
                               For NFL, use 0.
  * @param {number} timePeriod The period in time to use. Refer to sport scraper
                               documentation for more info.
  * @param {Function(Error, array)} callback
  */
  Schedule.mock = function(callback) {
    callback(null, utils.mockedData);
  };

  /**
  * Retrieves the current season and week number.
  * @param {number} leagueType The sports league to get the current season and week number from. For NFL, use 0.
  * @param {Function(Error, object)} callback
  */
  Schedule.current = function(leagueType, callback) {
    var Nfl = Schedule.app.models.Nfl;
    Nfl.findOne().then(function(nfl) {
      Schedule.find({
        where: {week: nfl.currentWeek, season: nfl.currentSeason},
      }).then(function(result) {
        callback(null, result);
      })
      .catch(function(error) {
      console.log('Error getting current season and week number');
      callback(error, null);
    });
    });
  };
};
