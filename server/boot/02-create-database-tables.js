'use strict';
var async = require('async');

module.exports = function(app, cb) {
  console.log('Starting boot script 2');
  var dataSource = app.dataSources.db;
  var tables = [
    'User',
    'AccessToken',
    'ACL',
    'RoleMapping',
    'Role',
    'PicksUser',
    'Group',
    'Season',
    'Score',
    'Week',
    'Pick',
    'Nfl',
  ];
  console.log('Performing table creation/update');
  dataSource.autoupdate(tables, function(error, result) {
    if (error) {
      console.log('Error creating/updating tables');
      throw error;
    }
    console.log('Tables created/updated');
    console.log('Perfoming model relation migrations');
    // Set up relationships
    var groupSql = 'ALTER TABLE \"Group\" ADD CONSTRAINT fk_picksUser FOREIGN ';
    groupSql += 'KEY (\"creator\") REFERENCES \"PicksUser\" (\"id\");';
    var seasonSql = 'ALTER TABLE \"Season\" ADD CONSTRAINT fk_group FOREIGN ';
    seasonSql += 'KEY (\"group\") REFERENCES \"Group\" (\"id\");';
    var scoreSql = 'ALTER TABLE \"Score\" ADD CONSTRAINT fk_season FOREIGN KEY';
    scoreSql += ' (\"season\") REFERENCES \"Season\" (\"id\");';
    scoreSql += ' ALTER TABLE \"Score\" ADD CONSTRAINT fk_picksUser FOREIGN';
    scoreSql += ' KEY (\"participant\") REFERENCES \"PicksUser\" (\"id\");';
    var weekSql = 'ALTER TABLE \"Week\" ADD CONSTRAINT fk_season FOREIGN KEY';
    weekSql += ' (\"season\") REFERENCES \"Season\" (\"id\");';
    var pickSql = 'AlTER TABLE \"Pick\" ADD CONSTRAINT fk_picksUser FOREIGN';
    pickSql += ' KEY (\"participant\") REFERENCES \"PicksUser\" (\"id\");';
    pickSql += ' ALTER TABLE \"Pick\" ADD CONSTRAINT fk_week FOREIGN KEY';
    pickSql += ' (\"week\") REFERENCES \"Week\" (\"id\")';
    async.series([
      function(callback) {
        dataSource.connector.query(groupSql, function(error) {
          if (error) {
            callback(null, error.message);
          } else {
            callback(null, 'Relationship created for creator/PicksUser' +
            'in Group');
          }
        });
      },
      function(callback) {
        dataSource.connector.query(seasonSql, function(error) {
          if (error) {
            callback(null, error.message);
          } else {
            callback(null, 'Relationship created for group/Group in Season');
          }
        });
      },
      function(callback) {
        dataSource.connector.query(scoreSql, function(error) {
          if (error) {
            callback(null, error.message);
          } else {
            var status = 'Relationship created for season/Season in Score\n';
            status += 'Relationship created for participant/PicksUser in Score';
            callback(null, status);
          }
        });
      },
      function(callback) {
        dataSource.connector.query(weekSql, function(error) {
          if (error) {
            callback(null, error.message);
          } else {
            callback(null, 'Relationship created for season/Season in Week');
          }
        });
      },
      function(callback) {
        dataSource.connector.query(pickSql, function(error) {
          if (error) {
            callback(null, error.message);
          } else {
            var status = 'Relationship created for participant/PicksUser' +
            'in Pick\n';
            status += 'Relationship created for week/Week in Pick';
            callback(null, status);
          }
        });
      },
    ], function(error, results) {
      for (var i = 0; i < results.length; i++) {
        console.log(results[i]);
      }
      console.log('Finished boot script 2');
      cb();
    });
  });
};
