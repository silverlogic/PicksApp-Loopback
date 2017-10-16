'use strict';
var cron = require('node-cron');
var request = require('superagent');

function getTeamIndex(competitors, homeAway) {
  if (competitors[0].homeAway === homeAway)
    return 0;

  return 1;
}

module.exports = function(app) {
  console.log('Starting boot script 12');
  var Schedule = app.models.Schedule;
  var Nfl = app.models.Nfl;
  var week = 1;
  var season = 2012;
  var seasonType = 2;
  Nfl.findOne().then(function(nfl) {
    season = nfl.currentSeason;
    week = nfl.currentWeek;
  });
  cron.schedule('0 0 * * * *', function() {
    // Get current season and week in NFL
    console.log('Fetching schedule from espn');
    request.get('http://site.api.espn.com/apis/v2/scoreboard/header')
      .query({
        dates: season, weeks: week, seasonType: seasonType,
        sport: 'football', league: 'nfl',
      }) // query string
      .end(function(err, res) {
        if (!res) {
          console.log('No response from espn api');
          return;
        }

        var leagues = res.body.sports[0].leagues;

        if (leagues.length) {
          leagues[0].events.forEach(function(game) {
            var homeTeam = game.competitors[
              getTeamIndex(game.competitors, 'home')
              ];
            Schedule.upsertWithWhere(
              {
                season: game.season,
                seasonType: game.seasonType, week: game.week,
                homeTeamName: homeTeam.name,
              }, {
              odds: game.odds,
              spreads: game.odds.details,
            }).then(function(res) {
              console.log('updated schedule successful', res.id, res.week);
            }).catch(function(error) {
              console.log('error creating schedule', error);
            });
          });
        }
      });
  });
  console.log('Finished boot script 12');
};
