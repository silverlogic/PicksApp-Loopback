'use strict';
var cron = require('node-cron');
var moment = require('moment');
var Promise = require('bluebird');
var async = require('async');

module.exports = function(app) {
  console.log('Starting boot script 6');
  var Nfl = app.models.Nfl;
  var Group = app.models.Group;
  var Season = app.models.Season;
  var Week = app.models.Week;
  var Score = app.models.Score;

  // Setup scheduler for updating picks every hour
  cron.schedule('0 0 * * * *', function() {
    // Get current season and week in NFL

    Nfl.findOne()
    .then(function(nfl) {
      console.log('found nfl', nfl);
      Group.find().then(function(groups) {
        console.log('available groups', groups);
        async.eachLimit(groups, 1, function(group, cb) {
          console.log('process group', group);
          var newScores = [];
          Season.upsertWithWhere({season: nfl.currentSeason, group: group.id},
            {season: nfl.currentSeason, group: group.id})
          .then(function(createdSeason) {
            console.log('season upsert ', createdSeason);
            group.currentSeason = createdSeason.id;
            group.save();
            // Create new week for season
            Week.upsertWithWhere(
              {season: createdSeason.id, week: nfl.currentWeek},
              {season: createdSeason.id, week: nfl.currentWeek}
            ).then(function(week) {
              console.log('week upsert ', week);
              Score.upsertWithWhere(
                {participant: group.creator, season: createdSeason.id},
                {participant: group.creator, season: createdSeason.id}
              )
              .then(function(score) {
                newScores.push(score.id);
                console.log('score upsert for creator ', week);
                console.log('participants available ', group.participants);
                // Create scores for participants
                async.eachLimit(group.participants, 1, function(id, cb2) {
                  Score.upsertWithWhere(
                    {participant: id, season: createdSeason.id},
                    {participant: id, season: createdSeason.id}
                  )
                  .then(function(createdScoreForParticipant) {
                    console.log(
                      'score upsert for participant', createdScoreForParticipant
                    );
                    newScores.push(createdScoreForParticipant.id);
                    cb2();
                  });
                }, function(error) {
                  if (error) {
                    return Promise.reject(error);
                  } else {
                    // Update created season
                    createdSeason.scores = newScores;
                    createdSeason.week = week.id;
                    createdSeason.save();
                    console.log('update season with scores', createdSeason);
                    cb();
                  }
                });
              });
            });
          });
      }, function(error) {
          console.log('done with group iteration', error);
        });
      });
    })
    .catch(function(error) {
      console.log('Unable to find nfl ', error);
    });
  });
  console.log('Finished boot script 6');
};
