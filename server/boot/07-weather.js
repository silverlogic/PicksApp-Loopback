'use strict';
var cron = require('node-cron');
var request = require('superagent');

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
  console.log('Starting boot script 7');
  var Weather = app.models.Weather;
  var apiKey = process.env.WEATHER_API_KEY;
  Weather.destroyAll();
  cron.schedule('0 0 * * * *', function() {
    // Get current season and week in NFL
    console.log('Fetching weather data');
    teamMap.forEach(function(team) {
      console.log('processing weather for ', team.name);
      request.get('http://api.openweathermap.org/data/2.5/weather')
      .query({lat: team.location.lat, lon: team.location.lon, appid: apiKey}) // query string
      .end(function(err, res) {
        if (!res) {
          console.log('No response from weather api');
          return;
        }
        var condition = {
          id: res.body.weather[0].id,
          temp: res.body.main.temp ? res.body.main.temp - 273.15 : 0,
          name: res.body.name,
          description: res.body.weather[0].description,
          icon: res.body.weather[0].icon,
          iconUrl: 'http://openweathermap.org/img/w/' + res.body.weather[0].icon + '.png',
        };
        console.log('weather response for ', team.name);
        var todayDate = new Date().toJSON().slice(0, 10).replace(/-/g, '-');

        Weather.upsertWithWhere(
          {team: team.name, createdDate: todayDate},
          {
            team: team.name, location: team.location, dome: team.dome,
            condition: condition, lastModified: new Date(),
            createdDate: todayDate,
          }
        )
        .then(function(weather) {
          console.log('added weather details successfully');
        })
        .catch(function(error) {
          console.log('Error creating weather', error);
        });
      });
    });
  });
  console.log('Finished boot script 7');
};
