'use strict';
var Promise = require('bluebird');

module.exports = function(app, cb) {
  console.log('Starting boot script 3');
  var ScheduleScrapper = app.dataSources.ScheduleScrapper;
  var Nfl = app.models.Nfl;
  let scheduleResults;
  ScheduleScrapper.current(0)
  .then(function(result) {
    scheduleResults = result;
    return Nfl.find();
  })
  .then(function(nflResults) {
    if (nflResults.length == 0) {
      // Create new model
      console.log('NFL model will be created');
      return Nfl.create({currentSeason: scheduleResults['season'],
                         currentWeek: scheduleResults['week']});
    } else {
      // Update current model
      var nfl = nflResults[0];
      console.log('NFL model will be updated');
      return Nfl.upsert({id: nfl.id, currentSeason: scheduleResults['season'],
                         currentWeek: scheduleResults['week']});
    }
  })
  .then(function(updatedNfl) {
    console.log('NFL model updated');
    console.log('Finished boot script 3');
    cb();
  })
  .catch(function(error) {
    console.log(error);
    console.log('Finished boot script 3');
    cb();
  });
};
