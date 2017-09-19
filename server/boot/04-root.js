'use strict';

module.exports = function(server) {
  // Install a `/` route that returns server status
  console.log('Starting boot script 4');
  var router = server.loopback.Router();
  router.get('/', server.loopback.status());
  server.use(router);
  console.log('Finished boot script 4');
};
