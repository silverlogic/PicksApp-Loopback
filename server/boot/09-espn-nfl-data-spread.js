'use strict';
var cron = require('node-cron');
var request = require('superagent');
var async = require('async');

function getTeamIndex(competitors, homeAway) {
  if (competitors[0].homeAway === homeAway)
    return 0;

  return 1;
}

module.exports = function(app) {
  console.log('Starting boot script 15');
  var Schedule = app.models.Schedule;
  var done = false;
  var seasonType = 2;
  var weeks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  var seasons = [2012, 2013, 2014, 2015, 2016, 2017];
  cron.schedule('0 0 * * * *', function() {
    if (done) {
      return;
    }
    async.eachLimit(seasons, 1, function(season, cb) {
      async.eachLimit(weeks, 1, function(week, cb2) {
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
                spreads: game.odds ? game.odds.details : '',
              }).then(function(res) {
                console.log('updated schedule successful', res.id, res.week);
                cb2();
              }).catch(function(error) {
                console.log('error creating schedule', error);
              });
            });
          }
        });
      }, function(error) {
        console.log('all weeks done for season ', season);
        cb(error);
      });
    }, function(error) {
      console.log('all seasons processed', error);
      done = true;
    });
  });
  console.log('Finished boot script 15');
};
