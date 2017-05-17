'use strict';

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
};
