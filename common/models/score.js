'use strict';

module.exports = function(Score) {
  // Disable endpoints not needed
  Score.disableRemoteMethod('create', true);
  Score.disableRemoteMethod('upsert', true);
  Score.disableRemoteMethod('upsertWithWhere', true);
  Score.disableRemoteMethod('updateAll', true);
  Score.disableRemoteMethod('updateAttributes', false);
  Score.disableRemoteMethod('updateAttribute', false);
  Score.disableRemoteMethod('verify', false);
  Score.disableRemoteMethod('replaceOrCreate', true);
  Score.disableRemoteMethod('replaceById', true);
  Score.disableRemoteMethod('createChangeStream', true);
  Score.disableRemoteMethod('find', true);
  Score.disableRemoteMethod('findOne', true);
  Score.disableRemoteMethod('deleteById', true);
  Score.disableRemoteMethod('confirm', true);
  Score.disableRemoteMethod('count', true);
  Score.disableRemoteMethod('exists', true);
};
