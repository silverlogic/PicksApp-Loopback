'use strict';
var async = require('async');

module.exports = function(app) {
  var Nfl = app.models.Nfl;
  async.series([
    function(callback) {
      Nfl.find(function(error, results) {
        if (error) {
          callback(null, error.message);
        } else {
          if (results.length == 0) {
            // Create new model
            callback(null, 'Need to create new model');
          } else {
            // Update current model
            callback(null, 'Need to update current model');
          }
        }
      });
    },
  ], function(error, results) {
    for (var i = 0; i < results.length; i++) {
      console.log(results[i]);
    }
  });
};
