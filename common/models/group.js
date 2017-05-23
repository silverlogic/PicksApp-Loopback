'use strict';
var async = require('async');

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
  Group.disableRemoteMethod('findById', true);
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
          var participants = [userId];
          group.participants = participants;
          group.save(function(error, updatedGroup) {
            if (error) {
              console.log('Error adding first participant');
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
    console.log(modelInstance);
    next();
  });
};
