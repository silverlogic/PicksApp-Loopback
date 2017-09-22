'use strict';
var cron = require('node-cron');
var moment = require('moment');
var Promise = require('bluebird');
var async = require('async');
var async2 = require('async');

function showError(message, status, code) {
  var missingValuesError = new Error();
  missingValuesError.status = status ? status : 400;
  missingValuesError.message = message;
  missingValuesError.code = code ? code : 'BAD_REQUEST';
  return missingValuesError;
}

module.exports = function(app) {
  console.log('Starting boot script 6');
  console.log('Setting up schedulers');
  var nodeEnvironment = process.env.NODE_ENV;
  var Nfl = app.models.Nfl;
  var Group = app.models.Group;
  var Season = app.models.Season;
  var Week = app.models.Week;
  var Score = app.models.Score;
  var Pick = app.models.Pick;
  var ScheduleScrapper = app.dataSources.ScheduleScrapper;
  var nfl, winners;
  let currentSeason, loadedSeasons;
  // Setup scheduler for updating picks every hour
  cron.schedule('1 * * * * *', function() {
    // Get current season and week in NFL
    Nfl.find()
    .then(function(results) {
      nfl = results[0];
      console.log('found nfl', results);
      currentSeason = nfl.currentSeason;
      if (nodeEnvironment == 'production') {
        // Get live schedule for current season and week
        return ScheduleScrapper.live(0, nfl.currentSeason, nfl.currentWeek);
      } else {
        return ScheduleScrapper.mock(0, 2);
        // Use mock-schedule for testing purposes
        // Determine which one to use based on server time
        // The hour will be in 24-hour format
        var currentHour = moment().hour();
        if (currentHour == 19) {
          // Current hour is 8:00pm
          // Retrieve mock schedule for all games completed
          return ScheduleScrapper.mock(0, 2);
        } else if (currentHour >= 13 && currentHour <= 18) {
          // Current hour is between 1:00pm and 7:00pm
          // Retrieve mock schedule for some games completed
          return ScheduleScrapper.mock(0, 1);
        } else {
          // Current hour is between 9:00pm and 12:00pm
          // Retrieve mock schedule for no games completed
          return ScheduleScrapper.mock(0, 0);
        }
      }
    })

    .then(function(schedule) {
      // Need to check if all games for the current week have completed;
      var completedGames = schedule.filter(function(game) {
        return game['gameStatus'] == 'FINAL ' ||
               game['gameStatus'] == 'FINAL OT';
      });
      console.log('completed games', completedGames);
      if (completedGames.length == schedule.length) {
        // All games have finished
        // Calculate winners
        winners = completedGames.map(function(game) {
          var awayTeam = game['awayTeam'];
          var homeTeam = game['homeTeam'];
          var awayTeamScore = awayTeam['score'];
          var homeTeamScore = homeTeam['score'];
          if (homeTeamScore > awayTeamScore) {
            return homeTeam['teamName'];
          } else {
            return awayTeam['teamName'];
          }
        });
        // Get all seasons currently being used
        console.log('Retrieving current seasons');
        return Season.find({where: {season: nfl.currentSeason}});
      } else {
        // Not all games have finished
        var currentDate = new Date();
        return Promise.reject(
          showError('Not all games are complete at ' + currentDate)
        );
      }
    })

    .then(function(seasons) {
      console.log('Going through current seasons', seasons);
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
            console.log('picks found', picks);
            // Go through each pick and determine if participant picked correctly
            // or not
            async.eachLimit(picks, 1, function(pick, callback) {
              console.log('Processing pick ', pick);
              // Get score for participant in season
              Score.find({where: {season: season.id,
                          participant: pick.participant}})
              .then(function(scores) {
                console.log('Processing score ', scores);
                var score = scores[0];
                if (winners.indexOf(pick.selectedWinner) >= 0) {
                  // Participant earns selected points
                  score.score += pick.selectedPoints;
                } else {
                  // Participant loses selected points
                  score.score -= pick.selectedPoints;
                }
                score.save();
                console.log('Score Saved and called back');
              }).catch(function(error) {
                console.log('Score find failed', error);
              });
              callback();
            }, function(error) {
              console.log('async2 for picks done', error);
            });
          });
        }).catch(function(error) {
          console.log('Week find by id failed', error);
          cb(error);
        });
      }, function(err) {
        if (err) {
          return Promise.reject(showError(err));
        } else {
          if (loadedSeasons) {
            console.log('Updating NFL model after score completion');
            // Update NFL model with new week and new season if at the end
            if (nfl.currentWeek == 16) {
              // Update season and week
              nfl.currentSeason += 1;
              nfl.currentWeek = 1;
            } else {
              // Update week
              nfl.currentWeek += 1;
            }
            nfl.save();
          }
        }
      });
    })

    .then(function() {
      // Check if new seasons need to be created or not
      if (currentSeason == nfl.currentSeason) {
        console.log('Updating seasons with new week');
        // Only need to update current week for each season
        async.eachLimit(loadedSeasons, 1, function(season, cb) {
          Week.create({season: season.id, week: nfl.currentWeek})
          .then(function() {
            cb();
          })
          .catch(function(error) {
            cb(error);
          });
        }, function(error) {
          if (error) {
            return Promise.reject(showError(error));
          } else {
            return Promise.reject(
              showError('All current seasons have been updated')
            );
          }
        });
      } else {
        // Need to update groups with new season, week and scores
        console.log('Updating all groups');
        return Group.find();
      }
    })

    .then(function(groups) {
      async.eachLimit(groups, 1, function(group, cb) {
        var newSeason, newWeek;
        var newScores = [];
        // Create new season for group
        Season.create({season: nfl.currentSeason, group: group.id})
        .then(function(createdSeason) {
          newSeason = createdSeason;
          // Create new week for season
          return Week.create({season: newSeason.id, week: nfl.currentWeek});
        })
        .then(function(createdWeek) {
          newWeek = createdWeek;
          // Create score for creator
          return Score.create({participant: group.creator,
                               season: newSeason.id});
        })
        .then(function(createdScoreForCreator) {
          newScores.push(createdScoreForCreator.id);
          // Create scores for participants
          async.eachLimit(group.participants, 1, function(id, cb2) {
            Score.create({participant: id, season: newSeason.id})
            .then(function(createdScoreForParticipant) {
              newScores.push(createdScoreForParticipant.id);
              cb2();
            })
            .catch(function(error) {
              cb2(error);
            });
          }, function(error) {
            if (error) {
              return Promise.reject(error);
            } else {
              // Update created season
              newSeason.scores = newScores;
              newSeason.week = newWeek.id;
              return newSeason.save();
            }
          });
        })
        .then(function(updatedSeason) {
          // Update group with current season
          newSeason = updatedSeason;
          group.currentSeason = newSeason.id;
          group.save().then(function() {
            cb();
          });
        })
        .catch(function(error) {
          cb(error);
        });
      }, function(error) {
        if (error) {
          return Promise.reject(error);
        } else {
          console.log('All groups have been updated with new season');
        }
      });
    })

    .catch(function(error) {
      console.log('Unable to find nfl ', error);
    });
  });
  console.log('Finished boot script 6');
};
