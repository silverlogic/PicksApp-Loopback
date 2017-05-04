'use strict';

module.exports = function(app) {
  var dataSource = app.dataSources.ComposePostgreSQL;
  var tables = ['User', 'AccessToken', 'ACL', 'RoleMapping',
                'Role', 'PicksUser'];
  // var tables = Object.keys(server.models).filter(function (model) {
  //   return server.models[model].autoAttach == "ComposePostgreSQL";
  // });
  console.log('Performing table creation/update');
  dataSource.autoupdate(tables, function(error, result) {
    if (error) {
      console.log('Error creating/updating tables');
      throw error;
    }
    console.log('Tables created/updated');
  });
};
