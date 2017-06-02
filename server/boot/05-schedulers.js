'use strict';
var cron = require('node-cron');
var Promise = require('bluebird');
var async = require('async');
var async2 = require('async');

module.exports = function(app) {
  console.log('Setting up schedulers');
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
  cron.schedule('0 0 * * * *', function() {
    // Get current season and week in NFL
    Nfl.find()
    .then(function(results) {
      nfl = results[0];
      currentSeason = nfl.currentSeason;
      // Get live schedule for current season and week
      return ScheduleScrapper.live(0, nfl.currentSeason, nfl.currentWeek);
    })
    .then(function(schedule) {
      // Need to check if all games for the current week have completed;
      var completedGames = schedule.filter(function(game) {
        return game['gameStatus'] == 'FINAL ' ||
               game['gameStatus'] == 'FINAL OT';
      });
      if (completedGames.length == schedule.length) {
        // All games have finished
        // Calculate winners
        winners = completedGames.map(function(game) {
          if (game['homeTeamScore'] > game['awayTeamScore']) {
            return game['homeTeamName'];
          } else {
            return game['awayTeamName'];
          }
        });
        // Get all seasons currently being used
        return Season.find({where: {season: nfl.currentSeason}});
      } else {
        // Not all games have finished
        var currentDate = new Date();
        console.log('Not all games are complete at ' + currentDate);
      }
    })
    .then(function(seasons) {
      loadedSeasons = seasons;
      // Go through each season
      async.eachLimit(loadedSeasons, 1, function(season, cb) {
        // Get the current week for the season
        Week.findById(season.week)
        .then(function(week) {
          // Get the picks for the week
          return Pick.find({where: {week: week.id}});
        })
        .then(function(picks) {
          // Go through each pick and determine if participant picked correctly
          // or not
          async2.eachLimit(picks, 1, function(pick, cb2) {
            // Get score for participant in season
            Score.find({where: {season: season.id,
                        participant: pick.participant}})
            .then(function(scores) {
              var score = scores[0];
              if (winners.indexOf(pick.selectedWinner) >= 0) {
                // Participant earns selected points
                score += pick.selectedPoints;
              } else {
                // Participant loses selected points
                score -= pick.selectedPoints;
              }
              return score.save();
            })
            .then(function(updatedScore) {
              cb2();
            })
            .catch(function(error) {
              cb2(error);
            });
          }, function(error) {
            if (error) {
              cb(error);
            } else {
              cb();
            }
          });
        })
        .catch(function(error) {
          cb(error);
        });
      }, function(error) {
        if (error) {
          return Promise.reject(error);
        } else {
          // Update NFL model with new week and new season if at the end
          if (nfl.currentWeek == 16) {
            // Update season and week
            nfl.currentSeason += 1;
            nfl.currentWeek = 1;
          } else {
            // Update week
            nfl.currentWeek += 1;
          }
          return nfl.save();
        }
      });
    })
    .then(function(updatedNfl) {
      nfl = updatedNfl;
      // Check if new seasons need to be created or not
      if (currentSeason == nfl.currentSeason) {
        // Only need to update current week for each season
        async.eachLimit(loadedSeasons, 1, function(season, cb) {
          Week.create({season: season.id, week: nfl.currentWeek})
          .then(function(newWeek) {
            cb();
          })
          .catch(function(error) {
            cb(error);
          });
        }, function(error) {
          if (error) {
            return Promise.reject(error);
          } else {
            console.log('All current seasons have been updated with new week');
          }
        });
      } else {
        // Need to update groups with new season, week and scores
        return Group.find();
      }
    })
    .then(function(groups) {
      async.eachLimit(groups, 1, function(group, cb) {
        let newSeason, newWeek;
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
          async2.eachLimit(group.participants, 1, function(id, cb2) {
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
          return group.save();
        })
        .then(function(updatedGroup) {
          cb();
        })
        .catch(function(error) {
          cb(error);
        });
      }, function(error) {
        if (error) {
          return Promise.reject(error);
        } else {
          console.log('All groups have been updating with new season');
        }
      });
    })
    .catch(function(error) {
      console.log(error);
    });
  });
};
