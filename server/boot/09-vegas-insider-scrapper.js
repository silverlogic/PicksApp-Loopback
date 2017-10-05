'use strict';
var cron = require('node-cron');
var utils = require('../utils');
var scraperjs = require('scraperjs');
var cheerio = require('cheerio');
var jsonframe = require('jsonframe-cheerio');
var http = require('http');
var teamMap = [
  {
    'name': 'Cardinals',
    'location': {'lat': 33.527594, 'lon': -112.262586},
     'dome': true,
  },
  {
    'name': 'Rams',
    'location': {'lat': 34.014079, 'lon': -118.287854},
    'dome': false,
  },
  {
    'name': 'Raiders',
    'location': {'lat': 37.751841, 'lon': -122.200514},
    'dome': false,
  },
  {
    'name': 'Chargers',
    'location': {'lat': 33.864413, 'lon': -118.260907},
    'dome': false,
  },
  {
    'name': '49ers',
    'location': {'lat': 37.402317, 'lon': -121.968244},
    'dome': false,
  },
  {
    'name': 'Broncos',
    'location': {'lat': 39.743968, 'lon': -105.020178},
    'dome': false,
  },
  {
    'name': 'Jaguars',
    'location': {'lat': 30.323860, 'lon': -81.636937},
    'dome': false,
  },
  {
    'name': 'Dolphins',
    'location': {'lat': 25.958159, 'lon': -80.238850},
    'dome': false,
  },
  {
    'name': 'Buccaneers',
    'location': {'lat': 27.975964, 'lon': -82.502884},
    'dome': false,
  },
  {
    'name': 'Falcons',
    'location': {'lat': 33.755420, 'lon': -84.400820},
    'dome': true,
  },
  {
    'name': 'Bears',
    'location': {'lat': 41.862356, 'lon': -87.616590},
    'dome': false,
  },
  {
    'name': 'Colts',
    'location': {'lat': 39.760101, 'lon': -86.163373},
    'dome': true,
  },
  {
    'name': 'Saints',
    'location': {'lat': 29.951117, 'lon': -90.080676},
    'dome': true,
  },
  {
    'name': 'Ravens',
    'location': {'lat': 39.278012, 'lon': -76.622200},
    'dome': false,
  },
  {
    'name': 'Redskins',
    'location': {'lat': 38.907726, 'lon': -76.864278},
    'dome': false,
  },
  {
    'name': 'Patriots',
    'location': {'lat': 42.090978, 'lon': -71.263950},
    'dome': false,
  },
  {
    'name': 'Lions',
    'location': {'lat': 42.339991, 'lon': -83.045227},
    'dome': true,
  },
  {
    'name': 'Vikings',
    'location': {'lat': 44.973590, 'lon': -93.257136},
    'dome': true,
  },
  {
    'name': 'Chiefs',
    'location': {'lat': 39.048935, 'lon': -94.483322},
    'dome': false,
  },
  {
    'name': 'Giants',
    'location': {'lat': 40.812840, 'lon': -74.073952},
    'dome': false,
  },
  {
    'name': 'Jets',
    'location': {'lat': 40.812840, 'lon': -74.073952},
    'dome': false,
  },
  {
    'name': 'Bills',
    'location': {'lat': 42.773713, 'lon': -78.786598},
    'dome': false,
  },
  {
    'name': 'Panthers',
    'location': {'lat': 35.225147, 'lon': -80.851775},
    'dome': false,
  },
  {
    'name': 'Bengals',
    'location': {'lat': 39.095464, 'lon': -84.516371},
    'dome': false,
  },
  {
    'name': 'Browns',
    'location': {'lat': 41.505981, 'lon': -81.698904},
    'dome': false,
  },
  {
    'name': 'Eagles',
    'location': {'lat': 39.900841, 'lon': -75.166573},
    'dome': false,
  },
  {
    'name': 'Steelers',
    'location': {'lat': 40.446830, 'lon': -80.015578},
    'dome': false,
  },
  {
    'name': 'Titans',
    'location': {'lat': 36.166518, 'lon': -86.771048},
    'dome': false,
  },
  {
    'name': 'Cowboys',
    'location': {'lat': 32.747167, 'lon': -97.093754},
    'dome': true,
  },
  {
    'name': 'Texans',
    'location': {'lat': 29.684722, 'lon': -95.410150},
    'dome': true,
  },
  {
    'name': 'Seahawks',
    'location': {'lat': 47.595239, 'lon': -122.331350},
    'dome': false,
  },
  {
    'name': 'Packers',
    'location': {'lat': 44.501253, 'lon': -88.061656},
    'dome': false,
  },
];

module.exports = function(app) {
  console.log('Starting boot script 9');
  cron.schedule('1 * * * * *', function() {
    // Get current season and week in NFL
    console.log('Scraping NFL for schedules');
    //var $ = cheerio.load('http://www.nfl.com/schedules/2017/REG4');
    // // initializing the plugin
    //http://www.vegasinsider.com/nfl/odds/las-vegas/

    //console.log($('div[class=schedules-header-title]').text())
    var frame = {
            'schedules': {
              _s: "#score-boxes div div[class=scorebox-wrapper] div[class=new-score-box-wrapper] div[class=new-score-box]",
              _d: [{
                'status': '.game-center-area p span[class=time-left]',
                'homeTeam': {
                  'name': '.team-wrapper div[class=home-team] div[class=team-data] div[class=team-info] p[class=team-name]',
                  'record': '.team-wrapper div[class=home-team] div[class=team-data] div[class=team-info] p[class=team-record] a',
                  'score': '.team-wrapper div[class=home-team] div[class=team-data] p[class=total-score]',
                  'quartersScore': ['.team-wrapper div[class=home-team] div[class=team-data] p[class=quarters-score] span']
                },
                'awayTeam': {
                  'name': '.team-wrapper div[class=away-team] div[class=team-data] div[class=team-info] p[class=team-name]',
                  'record': '.team-wrapper div[class=away-team] div[class=team-data] div[class=team-info] p[class=team-record] a',
                  'score': '.team-wrapper div[class=away-team] div[class=team-data] p[class=total-score]',
                  'quartersScore': ['.team-wrapper div[class=away-team] div[class=team-data] p[class=quarters-score] span']
                },
              }]
            }
          };
    utils.scrape('www.nfl.com', '/scores/2017/REG1', frame).then(function(result) {
      console.log(result);
    });

  });
  console.log('Finished boot script 9');
};
