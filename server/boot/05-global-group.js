'use strict';
var Promise = require('bluebird');
var async = require('async');

module.exports = function(app, cb) {
  console.log('Starting boot script 5');
  let adminUser;
  var globalGroup;
  var Group = app.models.Group;
  var Season = app.models.Season;
  var Score = app.models.Score;
  var PicksUser = app.models.PicksUser;
  Group.find({where: {name: 'Global'}})
  .then(function(groups) {
    if (groups.length == 0) {
      // Create admin user
      return PicksUser.create({email: 'dev@tsl.io', firstName: 'John',
                               lastName: 'Doe'});
    } else {
      return Promise.reject('Global group already exists');
    }
  })
  .then(function(user) {
    adminUser = user;
    // Create global group for all existing participants
    return Group.create({name: 'Global', isPrivate: false,
                         creator: user.id});
  })
  .then(function(group) {
    globalGroup = group;
    // Setup default season for global group
    return Group.setupCurrentSeason(globalGroup);
  })
  .then(function(updatedGroup) {
    globalGroup = updatedGroup;
    // Add all existing participants to global group
    return PicksUser.find();
  })
  .then(function(users) {
    // Remove group creator from results
    var participants = users.filter(function(user) {
      return user.id != adminUser.id;
    });
    var participantIds = participants.map(function(user) {
      return user.id;
    });
    if (participantIds.length == 0) {
      return Promise.reject('Global group created but no participants exist');
    }
    globalGroup.participants = participantIds;
    return globalGroup.save();
  })
  .then(function(updatedGlobalGroup) {
    globalGroup = updatedGlobalGroup;
    // Get season that was created
    return Season.findById(globalGroup.currentSeason);
  })
  .then(function(season) {
    // Create scores for participants in group
    var scores = [];
    async.eachLimit(globalGroup.participants, 1, function(id, cb) {
      Score.create({participant: id, season: season.id})
      .then(function(score) {
        season.scores.push(score.id);
        cb();
      })
      .catch(function(error) {
        cb(error);
      });
    }, function(error) {
      if (error) {
        return Promise.reject(error);
      } else {
        return season.save();
      }
    });
  })
  .then(function(updatedSeason) {
    console.log('Global group has been created');
    console.log('Finished boot script 5');
    cb();
  })
  .catch(function(error) {
    console.log(error);
    console.log('Finished boot script 5');
    cb();
  });
};
