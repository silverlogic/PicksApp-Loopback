'use strict';

module.exports = function(Schedule) {
  /**
  * Finds historical score data based on a given season and week.
  * @param {number} season The season in the league represented by a year.
  * @param {number} week The week in the given season.
  * @param {Function(Error, array)} callback
  */
  Schedule.schedule = function(season, week, callback) {
    var ScheduleScrapper = Schedule.app.dataSources.ScheduleScrapper;
    ScheduleScrapper.schedule(season, week, function(error, result) {
      if (error) {
        console.log('Error retrieving schedule');
        callback(error, null);
      } else {
        var games = result['games'];
        callback(null, games);
      }
    });
  };

  /**
  * Finds live, granular score data on a given season and week.
  * @param {number} season The season in the league represented by a year.
  * @param {number} week The week in the given season.
  * @param {Function(Error, array)} callback
  */
  Schedule.liveSchedule = function(season, week, callback) {
    var ScheduleScrapper = Schedule.app.dataSources.ScheduleScrapper;
    ScheduleScrapper.live(season, week, function(error, result) {
      if (error) {
        console.log('Error getting live schedule');
        callback(error, null);
      } else {
        var games = result['games'];
        callback(null, games);
      }
    });
  };
};
