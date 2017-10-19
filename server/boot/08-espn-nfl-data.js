'use strict';
var cron = require('node-cron');
var request = require('superagent');
var async = require('async');

function getTeamIndex(competitors, homeAway) {
  if (competitors[0].homeAway === homeAway)
    return 0;

  return 1;
}

function getWinner(competitors) {
  if (competitors[0].winner)
    return competitors[0].team.name;
  if (competitors[1].winner)
    return competitors[1].team.name;

  return '';
}

function getTeamObject(data) {
  var result = {
    score: data.score,
    record: data.record,
    abbreviation: data.team.abbreviation,
    displayName: data.team.displayName,
    teamName: data.team.name,
  };

  if (data.linescores) {
    result['scoreByQuarter'] = {
      Q1: data.linescores[0].value,
      Q2: data.linescores[1].value,
      Q3: data.linescores[2].value,
      Q4: data.linescores[3].value,
      OT: data.linescores[4] ? data.linescores[4].value : 0,
    };
  }
  return result;
}

module.exports = function(app) {
  console.log('Starting boot script 08 espn data load');
  var Schedule = app.models.Schedule;
  var weeks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  var seasons = [
    2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007,
    2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017,
  ];
  var seasonType = 2;
   async.eachLimit(seasons, 1, function(season, cb) {
     async.eachLimit(weeks, 1, function(week, cb2) {
      request.get('http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard')
        .query({dates: season, week: week, seasonType: seasonType}) // query string
        .end(function(err, res) {
          if (!res) {
            console.log('No response from espn api');
            cb2();
            return;
          }

          var events = res.body.events;
          var total = events.length;
          if (total) {
            events.forEach(function(game) {
              var homeTeam = game.competitions[0].competitors[
                getTeamIndex(game.competitions[0].competitors, 'home')
                ];
              var awayTeam = game.competitions[0].competitors[
                getTeamIndex(game.competitions[0].competitors, 'away')
                ];

              Schedule.upsertWithWhere(
                {
                  season: season,
                  seasonType: seasonType, week: week,
                  homeTeamName: homeTeam.team.name,
                }, {
                season: season, seasonType: seasonType,
                week: week,
                gameStatus: game.competitions[0].status.type.shortDetail,
                homeTeamName: homeTeam.team.name,
                winnerName: getWinner(game.competitions[0].competitors),
                homeTeam: getTeamObject(homeTeam),
                awayTeam: getTeamObject(awayTeam),
                date: game.date,
                venue: game.competitions[0].venue,
                gameId: game.id,
              }).then(function(res) {
                console.log('saved schedule successful', res.id, res.week);
                if (
                  game['competitions'][0]['competitors'][0]['team']['name'] ===
                  events[total - 1]['competitions'][0]
                    ['competitors'][0]['team']['name']
                ) {
                  console.log('processed week', week);
                  cb2();
                }
              }).catch(function(error) {
                console.log('error creating schedule', error);
                cb2(error);
              });
            });
          }
        });
     }, function(error) {
       console.log('all weeks data processed', error);
       cb(error);
     });
   }, function(error) {
     console.log('all season data processed', error);
     Schedule.find({where: {stats: null}}).then(function(schedules) {
      console.log('found schedules', schedules.length);
      async.eachLimit(schedules, 1, function(schedule, cb) {
        if (!schedule.gameId) {
          cb();
          return;
        }
        request.get('http://cdn.espn.com/core/nfl/boxscore')
        .query({
          gameId: schedule.gameId, xhr: 1,
        }) // query string
        .end(function(err, res) {
          if (!res.body.gamepackageJSON) {
            cb();
            return;
          }
          schedule.stats = res.body.gamepackageJSON.boxscore.teams;
          schedule.save().then(function(instance) {
            console.log('updated schedule with team stats', instance.gameId);
            cb();
          });
        });
      }, function(error) {
        console.log('all schedules processed', error);
      });
    });
   });
  console.log('Finished boot script 08 espn data load');
};
