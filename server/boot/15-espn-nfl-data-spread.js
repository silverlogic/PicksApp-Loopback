'use strict';
var cron = require('node-cron');
var request = require('superagent');

function getTeamIndex(competitors, homeAway) {
  if (competitors[0].homeAway === homeAway)
    return 0;

  return 1;
}

module.exports = function(app) {
  console.log('Starting boot script 15');
  var Schedule = app.models.Schedule;
  var week = 1;
  var season = 2012;
  var maxWeek = 17;
  var seasonType = 2;
  cron.schedule('2 * * * * *', function() {
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
          var total = leagues[0].events.length;
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
              if (
                game['competitors'][0]['name'] ===
                leagues[0].events[total - 1]['competitors'][0]['name']
              ) {
                console.log('processed week', week);
                if (week === maxWeek) {
                  week = 1;
                  season++;
                } else {
                  week++;
                }
              }
            }).catch(function(error) {
              console.log('error creating schedule', error);
            });
          });
        }
        console.log();
      });
  });
  console.log('Finished boot script 15');
};
