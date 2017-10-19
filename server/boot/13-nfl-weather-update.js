'use strict';
var cron = require('node-cron');

module.exports = function(app) {
  console.log('Starting boot script 13');
  var Weather = app.models.Weather;
  var Schedule = app.models.Schedule;
  var Nfl = app.models.Nfl;
  var season = 20017;
  var week = 5;
  Nfl.findOne().then(function(nfl) {
    season = nfl.currentSeason;
    week = nfl.currentWeek;
  });
  cron.schedule('0 0 * * * *', function() {
    // Get current season and week in NFL
    console.log('Fetching weather data');
      Schedule.find({
        where: {season: season, week: week, weather: null},
      }).then(function(schedules) {
      schedules.forEach(function(schedule) {
        Weather.find({
          where: {team: schedule.homeTeamName},
        }).then(function(weatherResults) {
          if (weatherResults.length) {
            schedule.weather = weatherResults[weatherResults.length - 1];
            schedule.save().then(function() {
              console.log('schedule updated with weather');
            });
          }
        });
      });
    }).catch(function(error) {
        console.log('schedule find error', error);
      });
    console.log('Finished boot script 13');
  });
};
