'use strict';

var Promise = require('bluebird');

module.exports = function(Week) {
  // Disable endpoints not needed
  Week.disableRemoteMethod('create', true);
  Week.disableRemoteMethod('upsert', true);
  Week.disableRemoteMethod('upsertWithWhere', true);
  Week.disableRemoteMethod('updateAll', true);
  Week.disableRemoteMethod('updateAttributes', false);
  Week.disableRemoteMethod('updateAttribute', false);
  Week.disableRemoteMethod('verify', false);
  Week.disableRemoteMethod('replaceOrCreate', true);
  Week.disableRemoteMethod('replaceById', true);
  Week.disableRemoteMethod('createChangeStream', true);
  Week.disableRemoteMethod('find', true);
  Week.disableRemoteMethod('findOne', true);
  Week.disableRemoteMethod('deleteById', true);
  Week.disableRemoteMethod('confirm', true);
  Week.disableRemoteMethod('count', true);
  Week.disableRemoteMethod('exists', true);

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
