'use strict';

module.exports = function(Season) {
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
};
