'use strict';
var cron = require('node-cron');
var request = require('superagent');

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
  console.log('Starting boot script 17');
  var Schedule = app.models.Schedule;
  var Nfl = app.models.Nfl;
  var week = 1;
  var season = 2017;
  var seasonType = 2;
  Nfl.findOne().then(function(nfl) {
    season = nfl.currentSeason;
    week = nfl.currentWeek;
  });
  cron.schedule('0 0 * * * *', function() {
    // Get current season and week in NFL
    console.log('Fetching schedule from espn');
    request.get('http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard')// dates=2017&weeks=6&seasontype=2&sport=football&league=nfl
      .query({dates: season, week: week, seasonType: seasonType}) // query string
      .end(function(err, res) {
        if (!res) {
          console.log('No response from espn api');
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
            }).catch(function(error) {
              console.log('error creating schedule', error);
            });
          });
        }
      });
  });
  console.log('Finished boot script 17');
};
