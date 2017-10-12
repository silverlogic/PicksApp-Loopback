'use strict';
var cron = require('node-cron');
var utils = require('../utils');
var cheerio = require('cheerio');
var jsonframe = require('jsonframe-cheerio');

module.exports = function(app) {
  console.log('Starting boot script 11');
  var Schedule = app.models.Schedule;
   var week = 1;
   var year = 2001;

  cron.schedule('0 0 * * * *', function() {
    // Get current season and week in NFL
    console.log('Scraping NFL Rush yard for schedules');

     var frame = {
      'schedules': {
        _s: '.game_summaries .game_summary',
        _d: [{
          'date': '.teams tbody tr[class=date] td',
          'gameStatus': '.teams tbody tr:nth-child(2) td:nth-child(3)',
          'awayTeam': {
            'name': '.teams tbody tr:nth-child(2) td a',
            'score': '.teams tbody tr:nth-child(2) td:nth-child(2)',
          },
          'homeTeam': {
            'name': '.teams tbody tr:nth-child(3) td a',
            'score': '.teams tbody tr:nth-child(3) td:nth-child(2)',
          },
          'passYards': '.stats tbody tr:nth-child(1) td:nth-child(3)',
          'rushYards': '.stats tbody tr:nth-child(2) td:nth-child(3)',
          'recYards': '.stats tbody tr:nth-child(3) td:nth-child(3)',
        }],
      }};

    if (week < 18 && year < 2018) {
      utils.scrapeHttps(
        'www.pro-football-reference.com', '/years/' +
        year + '/week_' + week + '.htm', frame
      ).then(function(result) {
        var schedules = result['schedules'];
        var total = schedules.length;
        var lastHomeTeam = schedules[total - 1]['homeTeam']['name'].split(' ');
        var lastHomeTeamName = lastHomeTeam[lastHomeTeam.length - 1];
        var homeTeamName = '';
;        schedules.forEach(function(schedule) {
          var homeTeam = schedule['homeTeam']['name'].split(' ');
          homeTeamName = homeTeam[homeTeam.length - 1];
          console.log('team name', homeTeamName);
          Schedule.findOne({where: {
            season: year, week: week,
            homeTeamName: homeTeamName,
          }}).then(function(instance) {
            console.log('instance', instance);
            if (instance) {
              instance.rushYards = schedule['rushYards'];
              instance.passYards = schedule['passYards'];
              instance.recYards = schedule['recYards'];
              instance.save().then(function(res) {
                console.log('updated schedule successful', res.id, res.week);
                if (homeTeamName === lastHomeTeamName) {
                  console.log('processed week year', week, year);
                  if (week === 17) {
                    week = 1;
                    year++;
                  } else {
                    week++;
                  }
                }
              });
            } else {
              console.log('schedule not found', week, year, homeTeamName);
            }
          });
        });
      });
    } else {
      console.log('week and year out of bound', week, year);
    }
  });
  console.log('Finished boot script 11');
};
