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
        'div[class=new-score-box-wrapper]',
        _d: [{
          'date': 'div[class=new-score-box-heading] p span[class=date]',
          'gameStatus': 'div[class=new-score-box]\ ' +
          '.game-center-area p span[class=time-left]',
          'homeTeam': {
            'teamName': 'div[class=new-score-box]\ ' +
            '.team-wrapper div[class=home-team]\ ' +
            'div[class=team-data] div[class=team-info]\ ' +
            'p[class=team-name]',
            'record': 'div[class=new-score-box]\ ' +
            '.team-wrapper div[class=home-team]\ ' +
            'div[class=team-data] div[class=team-info]\ ' +
            'p[class=team-record] a',
            'score': 'div[class=new-score-box]\ ' +
            '.team-wrapper div[class=home-team]\ ' +
            'div[class=team-data] p[class=total-score]',
            'scoreByQuarter': {
              'Q1': 'div[class=new-score-box]\ ' +
              '.team-wrapper div[class=away-team]\ ' +
            'div[class=team-data]\ ' +
              'p[class=quarters-score] span[class=first-qt]',
              'Q2': 'div[class=new-score-box]\ ' +
              '.team-wrapper div[class=away-team]\ ' +
            'div[class=team-data]\ ' +
              'p[class=quarters-score] span[class=second-qt]',
              'Q3': 'div[class=new-score-box]\ ' +
              '.team-wrapper div[class=away-team]\ ' +
            'div[class=team-data] p[class=quarters-score] span[class=third-qt]',
              'Q4': 'div[class=new-score-box]\ ' +
              '.team-wrapper div[class=away-team]\ ' +
            'div[class=team-data] p[class=quarters-score]\ ' +
              'span[class=fourth-qt]',
              'OT': 'div[class=new-score-box]\ ' +
              '.team-wrapper div[class=away-team]\ ' +
            'div[class=team-data] p[class=quarters-score]\ ' +
              'span[class=ot-qt]',
            },
          },
          'awayTeam': {
            'teamName': 'div[class=new-score-box]\ ' +
            '.team-wrapper div[class=away-team]\ ' +
            'div[class=team-data] div[class=team-info]\ ' +
            'p[class=team-name]',
            'record': 'div[class=new-score-box]\ ' +
            '.team-wrapper div[class=away-team]\ ' +
            'div[class=team-data] div[class=team-info]\ ' +
            'p[class=team-record] a',
            'score': 'div[class=new-score-box]\ ' +
            '.team-wrapper div[class=away-team]\ ' +
            'div[class=team-data] p[class=total-score]',
            'scoreByQuarter': {
              'Q1': 'div[class=new-score-box]\ ' +
              '.team-wrapper div[class=away-team]\ ' +
            'div[class=team-data] p[class=quarters-score]\ ' +
              'span[class=first-qt]',
              'Q2': 'div[class=new-score-box]\ ' +
              '.team-wrapper div[class=away-team]\ ' +
            'div[class=team-data] p[class=quarters-score]\ ' +
              'span[class=second-qt]',
              'Q3': 'div[class=new-score-box]\ ' +
              '.team-wrapper div[class=away-team]\ ' +
            'div[class=team-data] p[class=quarters-score]\ ' +
              'span[class=third-qt]',
              'Q4': 'div[class=new-score-box]\ ' +
              '.team-wrapper div[class=away-team]\ ' +
            'div[class=team-data] p[class=quarters-score]\ ' +
              'span[class=fourth-qt]',
              'OT': 'div[class=new-score-box]\ ' +
              '.team-wrapper div[class=away-team]\ ' +
            'div[class=team-data] p[class=quarters-score]\ ' +
              'span[class=ot-qt]',
            },
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
          var homeRecord = schedule['homeTeam']['record'].match(/\d+/g);
          var awayRecord = schedule['awayTeam']['record'].match(/\d+/g);
          schedule['homeTeam']['record'] = {
            'losses': homeRecord[0],
            'ties': homeRecord[1],
            'wins': homeRecord[2],
          };
          schedule['awayTeam']['record'] = {
            'losses': awayRecord[0],
            'ties': awayRecord[1],
            'wins': awayRecord[2],
          };
          Schedule.upsertWithWhere(
            {
              season: year, week: week,
              homeTeamName: schedule['homeTeam']['teamName'],
            }, {
            year: year, week: week, gameStatus: schedule['gameStatus'],
            homeTeamName: schedule['homeTeam']['teamName'],
            homeTeam: schedule['homeTeam'],
            awayTeam: schedule['awayTeam'],
            date: schedule['date'],
          }).then(function(res) {
            console.log('saved schedule successful', res.id, res.week);
            if (
              schedule['homeTeam']['teamName'] ===
              result['schedules'][total - 1]['homeTeam']['teamName']
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
