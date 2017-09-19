'use strict';

var Promise = require('bluebird');

module.exports = function(Week) {
  // Disable endpoints not needed
  Week.disableRemoteMethodByName('create');
  Week.disableRemoteMethodByName('upsert');
  Week.disableRemoteMethodByName('upsertWithWhere');
  Week.disableRemoteMethodByName('updateAll');
  Week.disableRemoteMethodByName('prototype.updateAttributes');
  Week.disableRemoteMethodByName('prototype.updateAttribute');
  Week.disableRemoteMethodByName('prototype.verify');
  Week.disableRemoteMethodByName('replaceOrCreate');
  Week.disableRemoteMethodByName('replaceById');
  Week.disableRemoteMethodByName('createChangeStream');
  Week.disableRemoteMethodByName('find');
  Week.disableRemoteMethodByName('findOne');
  Week.disableRemoteMethodByName('deleteById');
  Week.disableRemoteMethodByName('confirm');
  Week.disableRemoteMethodByName('count');
  Week.disableRemoteMethodByName('exists');

  // Remote Methods

  /**
  * Gets a list of picks for a given week.
  * @param {number} user Model id of an user. This will retrieve picks for a given user.
  * @param {Function(Error, array)} callback
  */
  Week.prototype.picksForWeek = function(req, userId, callback) {
    var weekId = req.params['id'];
    var Pick = Week.app.models.Pick;
    Pick.find({where: {week: weekId}})
    .then(function(picks) {
      if (userId) {
        var picksForUser = picks.filter(function(pick) {
          return pick.participant == userId;
        });
        callback(null, picksForUser);
      } else {
        callback(null, picks);
      }
    })
    .catch(function(error) {
      console.log(error);
      callback(error, null);
    });
  };
};
