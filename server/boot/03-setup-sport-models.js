'use strict';
var utils = require('../utils');

module.exports = function(app, cb) {
  console.log('Starting boot script 3');
  var Nfl = app.models.Nfl;
  var frame = {
    'activeWeek': '.reg-season-games li[class=active-week] a',
  };

  utils.scrape('www.nfl.com', '/scores', frame).then(function(result) {
    var currentYear = (new Date()).getFullYear();
    console.log('current week result', result, currentYear);
    Nfl.upsertWithWhere(
      {currentSeason: currentYear, currentWeek: result['activeWeek']},
      {currentSeason: currentYear, currentWeek: result['activeWeek']}
    ).then(function(nfl) {
      console.log('nfl model updated ', nfl);
      cb();
    }).catch(function(error) {
      console.log('error occurred updating nfl model', error);
      cb();
    });
  });
};
