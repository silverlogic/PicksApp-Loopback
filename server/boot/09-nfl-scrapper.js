'use strict';
var cron = require('node-cron');
var utils = require('../utils');
var cheerio = require('cheerio');
var jsonframe = require('jsonframe-cheerio');
var http = require('http');

module.exports = function(app) {
  console.log('Starting boot script 9');
  var Schedule = app.models.Schedule;
   var week = 1;
   var year = 2001;
  cron.schedule('1 * * * * *', function() {
    // Get current season and week in NFL
    console.log('Scraping NFL for schedules');

    var frame = {
      'schedules': {
        _s: '#score-boxes div div[class=scorebox-wrapper]\ ' +
        'div[class=new-score-box-wrapper] div[class=new-score-box]',
        _d: [{
          'status': '.game-center-area p span[class=time-left]',
          'homeTeam': {
            'name': '.team-wrapper div[class=home-team]\ ' +
            'div[class=team-data] div[class=team-info] p[class=team-name]',
            'record': '.team-wrapper div[class=home-team]\ ' +
            'div[class=team-data] div[class=team-info] p[class=team-record] a',
            'score': '.team-wrapper div[class=home-team]\ ' +
            'div[class=team-data] p[class=total-score]',
            'quartersScore': ['.team-wrapper\ ' +
            'div[class=home-team] div[class=team-data]\ ' +
            'p[class=quarters-score] span'],
          },
          'awayTeam': {
            'name': '.team-wrapper div[class=away-team]\ ' +
            'div[class=team-data] div[class=team-info] p[class=team-name]',
            'record': '.team-wrapper div[class=away-team]\ ' +
            'div[class=team-data] div[class=team-info] p[class=team-record] a',
            'score': '.team-wrapper div[class=away-team]\ ' +
            'div[class=team-data] p[class=total-score]',
            'quartersScore': ['.team-wrapper div[class=away-team]\ ' +
            'div[class=team-data] p[class=quarters-score] span'],
          },
        }],
      },
    };

    if (week < 18 && year < 2018) {
      utils.scrape(
        'www.nfl.com', '/scores/' + year + '/REG' + week, frame
      ).then(function(result) {
        var total = result['schedules'].length;
        result['schedules'].forEach(function(schedule) {
          Schedule.upsertWithWhere(
            {
              year: year, week: week,
              homeTeamName: schedule['homeTeam']['name'],
            }, {
            year: year, week: week, timeLeft: schedule['status'],
            homeTeamName: schedule['homeTeam']['name'],
            homeTeam: schedule['homeTeam'],
            awayTeam: schedule['awayTeam'],
          }).then(function(res) {
            console.log('saved schedule successful', res.id, res.week);
            if (
              schedule['homeTeam']['name'] ===
              result['schedules'][total - 1]['homeTeam']['name']
            ) {
              console.log('processed week', week);
              if (week === 17) {
                week = 1;
                year++;
              } else {
                week++;
              }
            }
          }).catch(function(error) {
            console.log('error creating schedule', error);
          });
        });
      });
    } else {
      console.log('week and year out of bound', week, year);
    }
  });
  console.log('Finished boot script 9');
};
