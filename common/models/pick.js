'use strict';

module.exports = function(Pick) {
  // Disable endpoints not needed
  Pick.disableRemoteMethod('upsert', true);
  Pick.disableRemoteMethod('upsertWithWhere', true);
  Pick.disableRemoteMethod('updateAll', true);
  Pick.disableRemoteMethod('updateAttributes', false);
  Pick.disableRemoteMethod('updateAttribute', false);
  Pick.disableRemoteMethod('verify', false);
  Pick.disableRemoteMethod('replaceOrCreate', true);
  Pick.disableRemoteMethod('replaceById', true);
  Pick.disableRemoteMethod('createChangeStream', true);
  Pick.disableRemoteMethod('find', true);
  Pick.disableRemoteMethod('findOne', true);
  Pick.disableRemoteMethod('deleteById', true);
  Pick.disableRemoteMethod('confirm', true);
  Pick.disableRemoteMethod('count', true);
  Pick.disableRemoteMethod('exists', true);
};
