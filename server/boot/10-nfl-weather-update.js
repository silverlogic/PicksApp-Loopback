'use strict';
var cron = require('node-cron');
var request = require('superagent');
var utils = require('../utils');

function getTeamLocation(name) {
  for (var i = 0; i < utils.teamMap.length; i++) {
    if (utils.teamMap[i].name === name){
      return utils.teamMap[i];
    }
  }
}

module.exports = function(app) {
  console.log('Starting boot script 10');
  var Weather = app.models.Weather;
  var Schedule = app.models.Schedule;
  var apiKey = process.env.WEATHER_API_KEY;
  var year = 2001;
  var week = 2;

  cron.schedule('0 0 * * * *', function () {
    // Get current season and week in NFL
    console.log('Fetching weather data');
    if (year < 2018 && week < 18) {
      Schedule.find({where: {season: year, week: week}}).then(function (schedules) {
      schedules.forEach(function (schedule) {
        var teamLocation = getTeamLocation(schedule.homeTeamName);
        request.get('http://api.openweathermap.org/data/2.5/weather')
          .query({lat: teamLocation.location.lat, lon: teamLocation.location.lon, appid: apiKey}) // query string
          .end(function (err, res) {
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
            console.log('weather response for ', teamLocation.name);
            var todayDate = new Date().toJSON().slice(0, 10).replace(/-/g, '-');

            Weather.upsertWithWhere(
              {team: teamLocation.name, createdDate: todayDate},
              {
                team: teamLocation.name, location: teamLocation.location, dome: teamLocation.dome,
                condition: condition, lastModified: new Date(),
                createdDate: todayDate,
              }
            )
              .then(function (weather) {
                schedule.weather = weather;
                schedule.save();
                console.log('added weather details successfully');
                if (week < 18){
                  week++;
                } else if (week > 17) {
                  week = 1;
                  year++;
                }
              })
              .catch(function (error) {
                console.log('Error creating weather', error);
              });
          });
      });
    }).catch(function(error) {
        console.log('schedule find error', error);
      });
    } else {
      console.log('week and year out of bound', week, year);
    }
    console.log('Finished boot script 10');
  });
}
