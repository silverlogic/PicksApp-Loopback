'use strict';

module.exports = function enableAuthentication(server) {
  // enable authentication
  console.log('Starting boot script 1');
  server.enableAuth({datasource: 'db'});
  console.log('Finished boot script 1');
};
