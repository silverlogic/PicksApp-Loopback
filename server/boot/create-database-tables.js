'use strict';

module.exports = function(app) {
  var dataSource = app.dataSources.ComposePostgreSQL;
  var tables = [
    'User',
    'AccessToken',
    'ACL',
    'RoleMapping',
    'Role',
    'PicksUser',
    'Group',
  ];
  console.log('Performing table creation/update');
  dataSource.autoupdate(tables, function(error, result) {
    if (error) {
      console.log('Error creating/updating tables');
      throw error;
    }
    console.log('Tables created/updated');
    console.log('Perfoming model relation migrations');
    var groupSql = 'ALTER TABLE \"Group\" ADD CONSTRAINT fk_picksUser FOREIGN ';
    groupSql += 'KEY (creator) REFERENCES \"PicksUser\" (id);';
    dataSource.connector.query(groupSql, function(error) {
      if (error) {
        console.log('Relationship already exists for creator in Group');
      } else {
        console.log('Relationships created');
      }
    });
  });
};
