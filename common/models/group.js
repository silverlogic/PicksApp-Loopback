'use strict';
var async = require('async');

/**
* Adds a participant to a group.
* @param {Model} Group Model used for staic operations.
* @param {object} group Model instance representing the group.
* @param {number} userId Model id of the user to join.
* @param {Function(Error)} callback
*/
function addParticipant(Group, group, userId, callback) {
  var Score = Group.app.models.Score;
  // Create score for user
  Score.create({participant: userId,
                season: group.currentSeason},
               function(error, createdScore) {
    // Update current season
    var Season = Group.app.models.Season;
    Season.findById(group.currentSeason, function(error, season) {
      season.scores.push(createdScore.id);
      season.save(function(error) {
        if (error) {
          console.log('Error updating current season in group');
          callback(error);
        } else {
          // Add participant to group
          group.participants.push(userId);
          group.save(function(error, updatedGroup) {
            if (error) {
              console.log('Error adding participant');
              callback(error);
            } else {
              callback(null);
            }
          });
        }
      });
    });
  });
}

module.exports = function(Group) {
  // Disable endpoints not needed
  Group.disableRemoteMethod('upsert', true);
  Group.disableRemoteMethod('upsertWithWhere', true);
  Group.disableRemoteMethod('updateAll', true);
  Group.disableRemoteMethod('updateAttributes', false);
  Group.disableRemoteMethod('updateAttribute', false);
  Group.disableRemoteMethod('verify', false);
  Group.disableRemoteMethod('replaceOrCreate', true);
  Group.disableRemoteMethod('replaceById', true);
  Group.disableRemoteMethod('createChangeStream', true);
  Group.disableRemoteMethod('find', true);
  Group.disableRemoteMethod('findOne', true);
  Group.disableRemoteMethod('deleteById', true);
  Group.disableRemoteMethod('confirm', true);
  Group.disableRemoteMethod('count', true);
  Group.disableRemoteMethod('exists', true);

  // Remote Methods

  /**
  * Gets a list of users that are part of the group.
  * @param {Function(Error, array)} callback
  */
  Group.prototype.participantsInGroup = function(req, callback) {
    var groupId = req.params['id'];
    Group.findById(groupId, function(error, group) {
      if (error) {
        callback(error, null);
      } else {
        if (group.participants) {
          var PicksUser = Group.app.models.PicksUser;
          var participants = [];
          async.eachLimit(group.participants, 1, function(id, cb) {
            PicksUser.findById(id, function(error, user) {
              if (error) {
                cb(error);
              } else {
                participants.push(user);
                cb();
              }
            });
          }, function(error) {
            if (error) {
              callback(error, null);
            } else {
              callback(null, participants);
            }
          });
        } else {
          callback(null, []);
        }
      }
    });
  };

  /**
  * Allows an user to join a public group.
  * @param {number} userId Model id of the user that wants to join the group.
  * @param {Function(Error)} callback
  */
  Group.prototype.join = function(userId, req, callback) {
    var groupId = req.params['id'];
    // Get the group from the database
    Group.findById(groupId, function(error, group) {
      if (error) {
        console.log('Error finding group');
        callback(error);
      } else {
        // First check if the user is already participanting
        if (group.creator == userId) {
          // The creator is technically already in the group
          console.log('Creator is already in group');
          var creatorInGroupError = new Error();
          creatorInGroupError.status = 400;
          creatorInGroupError.message = 'Creator is already in group.';
          creatorInGroupError.code = 'BAD_REQUEST';
          callback(creatorInGroupError);
        } else if (group.participants === null) {
          // Create the first participant
          console.log('Adding first user');
          var participants = [];
          group.participants = participants;
          addParticipant(Group, group, userId, function(error) {
            if (error) {
              callback(error);
            } else {
              callback(null);
            }
          });
        } else if (group.participants.includes(userId)) {
          // User is already in group
          console.log('User is alrady in group');
          var userInGroupError = new Error();
          userInGroupError.status = 400;
          userInGroupError.message = 'User is already in group.';
          userInGroupError.code = 'BAD_REQUEST';
          callback(userInGroupError);
        } else {
          // Add a new participant
          console.log('Add additional user');
          addParticipant(Group, group, userId, function(error) {
            if (error) {
              callback(error);
            } else {
              callback(null);
            }
          });
        }
      }
    });
  };

  /**
  * Finds all instances of the model based on a participant.
  * @param {number} participantId Model id of the user that is part of a group.
  * @param {boolean} isPrivate Boolean value that determines if a group is
                               public or private.
  * @param {Function(Error, array)} callback
  */
  Group.groupsForParticipants = function(participantId, isPrivate, callback) {
    // Build filter object
    var filterObject = {};
    if (isPrivate) {
      filterObject['isprivate'] = isPrivate;
    }
    // Find groups based on filter object
    Group.find({where: filterObject}, function(error, results) {
      if (error) {
        console.log('Error getting objects');
        callback(error, null);
      } else {
        if (participantId) {
          results = results.filter(function(group) {
            if (group.participants) {
              return group.participants.includes(participantId);
            } else {
              return false;
            }
          });
          callback(null, results);
        } else {
          callback(null, results);
        }
      }
    });
  };

  /**
  * Finds all instances of the model based on a creator.
  * @param {number} creatorId Model id of the user that created a group.
  * @param {boolean} isPrivate Boolean value that determines if a group is
                               public or private.
  * @param {Function(Error, array)} callback
  */
  Group.groupsForCreator = function(creatorId, isPrivate, callback) {
    // Build filter object
    var filterObject = {};
    if (creatorId) {
      filterObject['creator'] = creatorId;
    }
    if (isPrivate) {
      filterObject['isprivate'] = isPrivate;
    }
    // Find groups based on filter object
    Group.find({where: filterObject}, function(error, results) {
      if (error) {
        console.log('Error getting objects');
        callback(error, null);
      } else {
        callback(null, results);
      }
    });
  };

  // Remote hooks

  /**
  * Creates a season for the newly created group. The season will default to
  * the current one.
  * @param {string} methodName Name of the method to fire the hook after
                               completion.
  * @param {Function(object, object, Function())} callback
  */
  Group.afterRemote('create', function(ctx, modelInstance, next) {
    // Get the current season and week of the NFL
    var Nfl = Group.app.models.Nfl;
    Nfl.find(function(error, results) {
      if (error) {
        // Need to come up with way to handle error
        console.log(error);
        next();
      } else {
        // Create season for group
        var nfl = results[0];
        var Season = Group.app.models.Season;
        Season.create({season: nfl.currentSeason, group: modelInstance.id},
                      function(error, createdSeason) {
          if (error) {
            console.log(error);
            next();
          } else {
            // Create week for season
            var Week = Group.app.models.Week;
            Week.create({season: createdSeason.id, week: nfl.currentWeek},
                        function(error, createdWeek) {
              if (error) {
                console.log(error);
                next();
              } else {
                // Create score for created season of the group creator
                var Score = Group.app.models.Score;
                Score.create({participant: modelInstance.creator,
                              season: createdSeason.id},
                             function(error, createdScore) {
                  if (error) {
                    console.log(error);
                    next();
                  } else {
                    // Update created season
                    createdSeason.scores = [createdScore.id];
                    createdSeason.week = createdWeek.id;
                    createdSeason.save(function(error, updatedSeason) {
                      if (error) {
                        console.log(error);
                        next();
                      } else {
                        // Update created group
                        modelInstance.currentSeason = updatedSeason.id;
                        modelInstance.save(function(error, updatedGroup) {
                          if (error) {
                            console.log(error);
                            next();
                          } else {
                            next();
                          }
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  });
};
