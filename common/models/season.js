'use strict';
var Promise = require('bluebird');

module.exports = function(Season) {
  // Disable endpoints not needed
  Season.disableRemoteMethod('create', true);
  Season.disableRemoteMethod('upsert', true);
  Season.disableRemoteMethod('upsertWithWhere', true);
  Season.disableRemoteMethod('updateAll', true);
  Season.disableRemoteMethod('updateAttributes', false);
  Season.disableRemoteMethod('updateAttribute', false);
  Season.disableRemoteMethod('verify', false);
  Season.disableRemoteMethod('replaceOrCreate', true);
  Season.disableRemoteMethod('replaceById', true);
  Season.disableRemoteMethod('createChangeStream', true);
  Season.disableRemoteMethod('find', true);
  Season.disableRemoteMethod('findOne', true);
  Season.disableRemoteMethod('deleteById', true);
  Season.disableRemoteMethod('confirm', true);
  Season.disableRemoteMethod('count', true);
  Season.disableRemoteMethod('exists', true);

  // Remote Methods

  /**
  * Gets a list of scores for the season.
  * @param {Function(Error, array)} callback
  */
  Season.prototype.scoresForSeason = function(req, callback) {
    var seasonId = req.params['id'];
    var Score = Season.app.models.Score;
    Score.find({where: {season: seasonId}})
    .then(function(scores) {
      callback(null, scores);
    })
    .catch(function(error) {
      console.log(error);
      callback(error, null);
    });
  };
};
