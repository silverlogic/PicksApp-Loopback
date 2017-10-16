'use strict';
var cron = require('node-cron');
var request = require('superagent');

module.exports = function(app) {
  console.log('Starting boot script 16');
  var Schedule = app.models.Schedule;
  cron.schedule('3 * * * * *', function() {
    // Get current season and week in NFL
    console.log('Fetching schedule from db');
    Schedule.find({where: {stats: null}}).then(function(schedules) {
      if (schedules.length) {
        console.log('found schedules', schedules.length);
        request.get('http://cdn.espn.com/core/nfl/boxscore')
        .query({
          gameId: schedules[0].gameId, xhr: 1,
        }) // query string
        .end(function(err, res) {
          schedules[0].stats = res.body.gamepackageJSON.boxscore.teams;
          schedules[0].save().then(function(instance) {
            console.log('updated schedule with team stats', instance.gameId);
          });
        });
      } else {
        console.log('No schedules without stats');
      }
    });
  });
  console.log('Finished boot script 16');
};
