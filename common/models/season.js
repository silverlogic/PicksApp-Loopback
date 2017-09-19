'use strict';
var Promise = require('bluebird');

module.exports = function(Season) {
  // Disable endpoints not needed
  Season.disableRemoteMethodByName('create');
  Season.disableRemoteMethodByName('upsert');
  Season.disableRemoteMethodByName('upsertWithWhere');
  Season.disableRemoteMethodByName('updateAll');
  Season.disableRemoteMethodByName('prototype.updateAttributes');
  Season.disableRemoteMethodByName('prototype.updateAttribute');
  Season.disableRemoteMethodByName('prototype.verify');
  Season.disableRemoteMethodByName('replaceOrCreate');
  Season.disableRemoteMethodByName('replaceById');
  Season.disableRemoteMethodByName('createChangeStream');
  Season.disableRemoteMethodByName('find');
  Season.disableRemoteMethodByName('findOne');
  Season.disableRemoteMethodByName('deleteById');
  Season.disableRemoteMethodByName('confirm');
  Season.disableRemoteMethodByName('count');
  Season.disableRemoteMethodByName('exists');

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
