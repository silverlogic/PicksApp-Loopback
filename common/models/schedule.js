'use strict';
var Promise = require('bluebird');

module.exports = function(Schedule) {
  // Remote Methods

  /**
  * Finds historical score data based on a given season and week.
  * @param {number} leagueType The sports league to get a schedule from. For
                               NFL, use 0.
  * @param {number} season The season in the league represented by a year.
  * @param {number} week The week in the given season.
  * @param {Function(Error, array)} callback
  */
  Schedule.historical = function(leagueType, season, week, callback) {
    var ScheduleScrapper = Schedule.app.dataSources.ScheduleScrapper;
    ScheduleScrapper.historical(leagueType, season, week)
    .then(function(result) {
      callback(null, result);
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
    ScheduleScrapper.live(leagueType, season, week)
    .then(function(result) {
      callback(null, result);
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
  Schedule.mock = function(leagueType, timePeriod, callback) {
    var ScheduleScrapper = Schedule.app.dataSources.ScheduleScrapper;
    ScheduleScrapper.mock(leagueType, timePeriod)
    .then(function(result) {
      callback(null, result);
    })
    .catch(function(error) {
      console.log('Error getting mock schedule');
      callback(error, null);
    });
  };

  /**
  * Retrieves the current season and week number.
  * @param {number} leagueType The sports league to get the current season and week number from. For NFL, use 0.
  * @param {Function(Error, object)} callback
  */
  Schedule.current = function(leagueType, callback) {
    var ScheduleScrapper = Schedule.app.dataSources.ScheduleScrapper;
    ScheduleScrapper.current(leagueType)
    .then(function(result) {
      callback(null, result);
    })
    .catch(function(error) {
      console.log('Error getting current season and week number');
      callback(error, null);
    });
  };
};
