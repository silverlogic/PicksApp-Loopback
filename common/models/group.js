'use strict';
var async = require('async');
var Promise = require('bluebird');

/**
* Filters an array of groups by the given search query and sorts it in
* alphabetical order.
* @param {string} q The search query. This will filter groups by the name
                    containg the given query.
* @param {array} groups The group to perform the operations on.
* @return {Promise}
*/
function filterGroupsBySearch(q, groups) {
  return new Promise(function(resolve, reject) {
    var newResults = groups.filter(function(group) {
      return group.name.toLowerCase().includes(q.toLowerCase());
    });
    newResults.sort(function(a, b) {
      return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0;
    });
    resolve(newResults);
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
    var PicksUser = Group.app.models.PicksUser;
    var participants = [];
    Group.findById(groupId)
    .then(function(group) {
      if (group.participants) {
        async.eachLimit(group.participants, 1, function(id, cb) {
          PicksUser.findById(id)
          .then(function(user) {
            participants.push(user);
            cb();
          })
          .catch(function(error) {
            cb(error);
          });
        }, function(error) {
          if (error) {
            return Promise.reject(error);
          } else {
            callback(null, participants);
          }
        });
      } else {
        callback(null, []);
      }
    })
    .catch(function(error) {
      callback(error, null);
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
    Group.findById(groupId)
    .then(function(group) {
      // First check if the user is already participanting
      if (group.creator == userId) {
        // The creator is technically already in the group
        console.log('Creator is already in group');
        var creatorInGroupError = new Error();
        creatorInGroupError.status = 400;
        creatorInGroupError.message = 'Creator is already in group.';
        creatorInGroupError.code = 'BAD_REQUEST';
        return Promise.reject(creatorInGroupError);
      } else if (group.participants === null) {
        // Create the first participant
        console.log('Adding first user');
        var participants = [];
        group.participants = participants;
        return Group.addParticipant(group, userId);
      } else if (group.participants.includes(userId)) {
        // User is already in group
        console.log('User is alrady in group');
        var userInGroupError = new Error();
        userInGroupError.status = 400;
        userInGroupError.message = 'User is already in group.';
        userInGroupError.code = 'BAD_REQUEST';
        return Promise.reject(userInGroupError);
      } else {
        // Add a new participant
        console.log('Add additional user');
        return Group.addParticipant(group, userId);
      }
    })
    .then(function() {
      callback(null);
    })
    .catch(function(error) {
      console.log(error);
      callback(error);
    });
  };

  /**
  * Retrieves all groups that a user has created or is participating in.
  * @param {number} userId Model id of the user that created or is
                    participanting in a group.
  * @param {string} q A search query. This will filter groups by the name
                      containg the given query.
  * @param {Function(Error, array)} callback
  */
  Group.groupsForUser = function(userId, q, callback) {
    Group.find()
    .then(function(groups) {
      // Filter groups by userId in creator field
      var creatorGroups = groups.filter(function(group) {
        return group.creator == userId;
      });
      // Filter groups by userId in participants field
      var participantGroups = groups.filter(function(group) {
        if (group.participants) {
          return group.participants.includes(userId);
        } else {
          return false;
        }
      });
      var userGroups = creatorGroups.concat(participantGroups);
      if (q) {
        // Filter groups by search query
        return filterGroupsBySearch(q, userGroups);
      } else {
        return Promise.resolve(userGroups);
      }
    })
    .then(function(results) {
      callback(null, results);
    })
    .catch(function(error) {
      console.log(error);
      callback(error, null);
    });
  };

  /**
  * Retrieves all public groups.
  * @param {string} q A search query. This will filter groups by the name
                      containg the given query.
  * @param {Function(Error, array)} callback
  */
  Group.publicGroups = function(q, callback) {
    Group.find({where: {isPrivate: false}})
    .then(function(groups) {
      if (q) {
        // Filter groups by search query
        return filterGroupsBySearch(q, groups);
      } else {
        return Promise.resolve(groups);
      }
    })
    .then(function(results) {
      callback(null, results);
    })
    .catch(function(error) {
      console.log(error);
      callback(error, null);
    });
  };

  // Remote hooks

  /**
  * Remote hook for checking if a provided group name is already
  * being used.
  * @param {string} methodName Name of the method to fire the hook after
                               completion.
  * @param {Function(object, object, Function())} callback
  */
  Group.beforeRemote('create', function(ctx, modelInstance, next) {
    Group.find({where: {name: modelInstance.name}})
    .then(function(groups) {
      if (groups.length > 0) {
        var groupNameError = new Error();
        groupNameError.status = 400;
        groupNameError.message = 'Group name already in use.';
        groupNameError.code = 'BAD_REQUEST';
        next(groupNameError);
      } else {
        next();
      }
    })
    .catch(function(error) {
      console.log('Error checking if group name already exists');
      next(error);
    });
  });

  /**
  * Remote hook for handling when a group is created through the web
  * context.
  * @param {string} methodName Name of the method to fire the hook after
                               completion.
  * @param {Function(object, object, Function())} callback
  */
  Group.afterRemote('create', function(ctx, modelInstance, next) {
    Group.setupCurrentSeason(modelInstance)
    .then(function(updatedGroup) {
      next();
    })
    .catch(function(error) {
      console.log(error);
      next();
    });
  });

  // Static Methods

  /**
  * Creates a season for the newly created group. The season will default to
  * the current one.
  * @param {object} group The group that was just created.
  * @return {Promise}
  */
  Group.setupCurrentSeason = function(group) {
    return new Promise(function(resolve, reject) {
      // Get the current season and week of the NFL
      var Nfl = Group.app.models.Nfl;
      var Season = Group.app.models.Season;
      var Week = Group.app.models.Week;
      var Score = Group.app.models.Score;
      let nfl, newSeason, newWeek;
      Nfl.find()
      .then(function(results) {
        nfl = results[0];
        // Create season for group
        return Season.create({season: nfl.currentSeason,
                              group: group.id});
      })
      .then(function(season) {
        newSeason = season;
        // Create week for season
        return Week.create({season: newSeason.id, week: nfl.currentWeek});
      })
      .then(function(week) {
        newWeek = week;
        // Create score for created season of the group creator
        return Score.create({participant: group.creator,
                            season: newSeason.id});
      })
      .then(function(score) {
        // Update created season
        newSeason.scores = [score.id];
        newSeason.week = newWeek.id;
        return newSeason.save();
      })
      .then(function(updatedSeason) {
        newSeason = updatedSeason;
        // Update created group
        group.currentSeason = newSeason.id;
        return group.save();
      })
      .then(function(updatedGroup) {
        resolve(updatedGroup);
      })
      .catch(function(error) {
        reject(error);
      });
    });
  };

  /**
  * Adds a participant to a group.
  * @param {object} group Model instance representing the group.
  * @param {number} userId Model id of the user to join.
  * @return {Promise}
  */
  Group.addParticipant = function(group, userId) {
    return new Promise(function(resolve, reject) {
      var Score = Group.app.models.Score;
      var Season = Group.app.models.Season;
      let newScore;
      group.participants.push(userId);
      group.save()
      .then(function(updatedGroup) {
        // Create score for user
        return Score.create({participant: userId, season: group.currentSeason});
      })
      .then(function(createdScore) {
        newScore = createdScore;
        // Update current season
        return Season.findById(group.currentSeason);
      })
      .then(function(season) {
        season.scores.push(newScore.id);
        return season.save();
      })
      .then(function(updatedSeason) {
        resolve();
      })
      .catch(function(error) {
        console.log('Error adding participant');
        reject(error);
      });
    });
  };
};
