'use strict';

module.exports = function(Score) {
  // Disable endpoints not needed
  Score.disableRemoteMethodByName('create');
  Score.disableRemoteMethodByName('upsert');
  Score.disableRemoteMethodByName('upsertWithWhere');
  Score.disableRemoteMethodByName('updateAll');
  Score.disableRemoteMethodByName('prototype.updateAttributes');
  Score.disableRemoteMethodByName('prototype.updateAttribute');
  Score.disableRemoteMethodByName('prototype.verify');
  Score.disableRemoteMethodByName('replaceOrCreate');
  Score.disableRemoteMethodByName('replaceById');
  Score.disableRemoteMethodByName('createChangeStream');
  Score.disableRemoteMethodByName('find');
  Score.disableRemoteMethodByName('findOne');
  Score.disableRemoteMethodByName('deleteById');
  Score.disableRemoteMethodByName('confirm');
  Score.disableRemoteMethodByName('count');
  Score.disableRemoteMethodByName('exists');
};
