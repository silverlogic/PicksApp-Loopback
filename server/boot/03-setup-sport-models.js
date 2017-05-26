'use strict';
var async = require('async');

module.exports = function(app) {
  var ScheduleScrapper = app.dataSources.ScheduleScrapper;
  ScheduleScrapper.current(0, function(error, result) {
    if (error) {
      console.log(error);
    } else {
      var Nfl = app.models.Nfl;
      async.series([
        function(callback) {
          Nfl.find(function(error, results) {
            if (error) {
              callback(null, error.message);
            } else {
              if (results.length == 0) {
                // Create new model
                Nfl.create({currentSeason: result['season'],
                            currentWeek: result['week']},
                           function(error, createdNfl) {
                  if (error) {
                    callback(error, null);
                  } else {
                    callback(null, 'NFL model created');
                  }
                });
              } else {
                // Update current model
                var nfl = results[0];
                nfl.currentSeason = result['season'];
                nfl.currentWeek = result['week'];
                nfl.save(function(error, updatedNfl) {
                  if (error) {
                    callback(error, null);
                  } else {
                    callback(error, 'NFL model updated');
                  }
                });
              }
            }
          });
        },
      ], function(error, results) {
        for (var i = 0; i < results.length; i++) {
          console.log(results[i]);
        }
      });
    }
  });
};
