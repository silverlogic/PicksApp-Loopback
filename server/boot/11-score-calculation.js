'use strict';
var cron = require('node-cron');
var moment = require('moment');
var Promise = require('bluebird');
var async = require('async');
var utils = require('../utils');

function showError(message, status, code) {
  var missingValuesError = new Error();
  missingValuesError.status = status ? status : 400;
  missingValuesError.message = message;
  missingValuesError.code = code ? code : 'BAD_REQUEST';
  return missingValuesError;
}

function getWinners(schedules) {
  return new Promise(function(resolve, reject) {
    var winners = [];
    schedules.forEach(function(schedule) {
      if (schedule.gameStatus == 'FINAL' ||
          schedule.gameStatus == 'FINAL OT') {
        var awayTeam = schedule.awayTeam;
        var homeTeam = schedule.homeTeam;
        if (homeTeam['score'] > awayTeam['score']) {
          winners.push(homeTeam['teamName']);
        } else {
          winners.push(awayTeam['teamName']);
        }
      } else {
        reject('Not all games are completed');
      }
    });
    resolve(winners);
  });
}

module.exports = function(app) {
  console.log('Starting boot script 11');
  console.log('Setting up schedulers');
  var nodeEnvironment = process.env.NODE_ENV;
  var Nfl = app.models.Nfl;
  var Season = app.models.Season;
  var Week = app.models.Week;
  var Score = app.models.Score;
  var Pick = app.models.Pick;
  var Schedule = app.models.Schedule;
  var nfl, winners, currentSeason, loadedSeasons;
  // Setup scheduler for updating picks every hour
  cron.schedule('0 0 * * * *', function() {
    // Get current season and week in NFL
    Nfl.findOne()
    .then(function(nflModel) {
      console.log('found nfl', nflModel);
      nfl = nflModel;
      currentSeason = nfl.currentSeason;
      if (nodeEnvironment == 'production') {
        // Get live schedule for current season and week
        return Schedule.find({
          where: {season: nfl.currentSeason, week: nfl.currentWeek},
        });
      } else {
        // Use mock-schedule for testing purposes
        // Determine which one to use based on server time
        // The hour will be in 24-hour format
        var currentHour = moment().hour();
        if (currentHour == 19) {
          // Current hour is 8:00pm
          // Retrieve mock schedule for all games completed
          return utils.mockedData;
        } else if (currentHour >= 13 && currentHour <= 18) {
          // Current hour is between 1:00pm and 7:00pm
          // Retrieve mock schedule for some games completed
          return utils.mockedDataIncomplete;
        } else {
          // Current hour is between 9:00pm and 12:00pm
          // Retrieve mock schedule for no games completed
          return utils.mockedDataNoGame;
        }
     }
    })

    .then(function(schedules) {
      getWinners(schedules).then(function(result) {
        winners = result;
        console.log('winners', winners);
        Season.find(
          {where: {season: nfl.currentSeason}}
        ).then(function(seasons) {
          loadedSeasons = seasons;
          // Go through each season
          async.eachLimit(loadedSeasons, 1, function(season, cb) {
            // Get the current week for the season
            console.log('Updating for season ' + season.id);
             Week.findById(season.week)
            .then(function(week) {
              // Get the picks for the week
              console.log('Week found ', week);
              Pick.find({where: {week: week.id}}).then(function(picks) {
                console.log('picks found', picks.length);
                // Go through each pick and determine if participant picked correctly
                // or not
                async.eachLimit(picks, 1, function(pick, callback) {
                  console.log('Processing pick ', pick);
                  // Get score for participant in season
                  Score.findOne({where: {season: season.id,
                              participant: pick.participant}})
                  .then(function(score) {
                    console.log('Processing score ', score);
                    if (winners.indexOf(pick.selectedWinner) >= 0) {
                      // Participant earns selected points
                      score.score += pick.selectedPoints;
                    } else {
                      // Participant loses selected points
                      score.score -= pick.selectedPoints;
                    }
                    score.save();
                    console.log('Score Saved and called back');
                    callback();
                  });
                }, function(error) {
                  console.log('picks done', error);
                  cb(error);
                });
              });
            });
          }, function(err) {
            if (err) {
              return Promise.reject(showError(err));
            } else {
              if (loadedSeasons) {
                console.log('Updating NFL model after score completion');
                // Update NFL model with new week and new season if at the end
                if (nfl.currentWeek == 17) {
                  // Update season and week
                  nfl.currentSeason += 1;
                  nfl.currentWeek = 1;
                } else {
                  // Update week
                  nfl.currentWeek += 1;
                }
                nfl.save().then(function(nfl) {
                  if (currentSeason == nfl.currentSeason) {
                    console.log('Updating seasons with new week',
                      nfl.currentWeek);
                    // Only need to update current week for each season
                    async.eachLimit(loadedSeasons, 1, function(season, cb) {
                      Week.upsertWithWhere(
                        {season: season.id, week: nfl.currentWeek},
                        {season: season.id, week: nfl.currentWeek}
                      )
                      .then(function() {
                        cb();
                      });
                    }, function(error) {
                      console.log(
                        'All current seasons have been updated; error:',
                        error
                      );
                    });
                  } else {
                    console.log('new seasons entered', nfl.currentSeason);
                  }
                });
              }
            }
          });
        });
      }).catch(function(error) {
        console.log('Error', error);
      });
    });
  });
  console.log('Finished boot script 11');
};
