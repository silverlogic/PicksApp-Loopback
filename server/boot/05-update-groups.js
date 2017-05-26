'use strict';
var async = require('async');

module.exports = function(app) {
  console.log('Groups already updated');
  return;
  var Group = app.models.Group;
  var Season = app.models.Season;
  var Week = app.models.Week;
  var Score = app.models.Score;
  var Nfl = app.models.Nfl;
  Nfl.find(function(error, results) {
    if (error) {
      console.log(error);
    } else {
      var nfl = results[0];
      // Get all groups
      Group.find(function(error, groups) {
        if (error) {
          console.log(error);
          console.log(error);
        } else {
          // Update each group with current season if it doesn't exist
          async.eachLimit(groups, 1, function(group, callback) {
            // Check if group has current season set
            if (group.currentSeason === null) {
              // Create season for group
              Season.create({season: nfl.currentSeason, group: group.id},
                            function(error, season) {
                if (error) {
                  console.log(error);
                  callback(group.name + ' error: ' + error.message);
                } else {
                  // Create week for season
                  Week.create({season: season.id, week: nfl.currentWeek},
                              function(error, week) {
                    if (error) {
                      console.log(error);
                      callback(group.name + ' error: ' + error.message);
                    } else {
                      // Create score for creator in group
                      Score.create({participant: group.creator,
                                    season: season.id},
                                   function(error, score) {
                        if (error) {
                          console.log(error);
                          callback(group.name + ' error: ' + error.message);
                        } else {
                          season.scores = [score.id];
                          // Create score for each participant in group
                          if (group.participants === null) {
                            // Update season created
                            season.week = week.id;
                            season.save(function(error, updatedSeason) {
                              if (error) {
                                console.log(error);
                                callback(group.name +
                                         ' error: ' + error.message);
                              } else {
                                // Update group with current season
                                group.currentSeason = updatedSeason.id;
                                group.save(function(error, updatedGroup) {
                                  if (error) {
                                    console.log(error);
                                    callback(group.name +
                                             ' error: ' + error.message);
                                  } else {
                                      callback();
                                  }
                                });
                              }
                            });
                          } else {
                            // Add score for each participant
                            async.eachLimit(group.participants, 1,
                                            function(id, scoreCallback) {
                              Score.create({participant: id, season: season.id},
                                           function(error, participantScore) {
                                if (error) {
                                  console.log(error);
                                  scoreCallback(error);
                                } else {
                                  season.scores.push(participantScore.id);
                                  scoreCallback();
                                }
                              });
                            }, function(error) {
                              if (error) {
                                console.log(error);
                                callback(group.name +
                                        ' error: ' + error.message);
                              } else {
                                // Update season created
                                season.week = week.id;
                                season.save(function(error, updatedSeason) {
                                  if (error) {
                                    console.log(error);
                                    callback(group.name +
                                             ' error: ' + error.message);
                                  } else {
                                    // Update group with current season
                                    group.currentSeason = updatedSeason.id;
                                    group.save(function(error, updatedGroup) {
                                      if (error) {
                                        console.log(error);
                                        callback(group.name +
                                                 ' error: ' + error.message);
                                      } else {
                                          callback();
                                      }
                                    });
                                  }
                                });
                              }
                            });
                          }
                        }
                      });
                    }
                  });
                }
              });
            } else {
              callback();
            }
          }, function(error) {
            if (error) {
              console.log(error);
            } else {
              console.log('Updating groups completed');
            }
          });
        }
      });
    }
  });
};
