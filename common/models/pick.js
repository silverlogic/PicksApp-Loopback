'use strict';
var async = require('async');
var Promise = require('bluebird');

/**
 * Checks that an array of picks posted contains all neccessary data needed.
 * @param {array} picks An array of picks submitted.
 * @return {object}
 */
 function validateSubmittedPicks(picks) {
   if (!Array.isArray(picks)) {
     var invalidObjectError = new Error();
     invalidObjectError.status = 400;
     invalidObjectError.message = 'Invalid object sent for picks';
     invalidObjectError.code = 'BAD_REQUEST';
     return invalidObjectError;
   }
   // Check that the picks array contains all neccesary data needed
   // The array given should look like this:
   // [
   //  {
   //   "selectedWinner": "SomeTeam",
   //   "participant": <Model id of a picks user object>,
   //   "selectedPoints": 1,
   //   "week": <Model id of a week object>,
   //   "selectedLoser": "SomeTeam"
   //  }
   // ]
   for (var i = 0; i < picks.length; i++) {
     var picksDictionary = picks[i];
     if (!picksDictionary['selectedWinner'] ||
         !picksDictionary['participant'] ||
         !picksDictionary['selectedPoints'] ||
         !picksDictionary['week'] ||
         !picksDictionary['selectedLoser']) {
       var missingValuesError = new Error();
       missingValuesError.status = 400;
       missingValuesError.message = 'Values missing for submitted pick';
       missingValuesError.code = 'BAD_REQUEST';
       return missingValuesError;
     }
   }
   return null;
 }

module.exports = function(Pick) {
  // Disable endpoints not needed
  Pick.disableRemoteMethod('create', true);
  Pick.disableRemoteMethod('upsert', true);
  Pick.disableRemoteMethod('upsertWithWhere', true);
  Pick.disableRemoteMethod('updateAll', true);
  Pick.disableRemoteMethod('updateAttributes', false);
  Pick.disableRemoteMethod('updateAttribute', false);
  Pick.disableRemoteMethod('verify', false);
  Pick.disableRemoteMethod('replaceOrCreate', true);
  Pick.disableRemoteMethod('replaceById', true);
  Pick.disableRemoteMethod('createChangeStream', true);
  Pick.disableRemoteMethod('find', true);
  Pick.disableRemoteMethod('findOne', true);
  Pick.disableRemoteMethod('deleteById', true);
  Pick.disableRemoteMethod('confirm', true);
  Pick.disableRemoteMethod('count', true);
  Pick.disableRemoteMethod('exists', true);

  // Remote Methods

  /**
  * Submits a list of picks for a week in a season.
  * @param {array} picks An array of picks for a given participant.
                         For each pick, if the user is updating it, provide the
                         model id of the object. Otherwise, it will be a new
                         pick for the participant.
  * @param {number} week Model id of the week that the picks will be associated
                         with.
  * @param {Function(Error, array)} callback
  */
  Pick.submitPicks = function(picks, week, callback) {
    var Week = Pick.app.models.Week;
    var createdPicks = [];
    // Check if the model id of the week exists
    Week.exists(week)
    .then(function(exists) {
      if (exists) {
        // Check that the picks sent is valid
        var validationError = validateSubmittedPicks(picks);
        if (validationError) {
          return Promise.reject(validationError);
        } else {
          // Create picks for participant
          async.eachLimit(picks, 1, function(pickDictionary, cb) {
            Pick.upsert({id: pickDictionary['id'],
                         selectedWinner: pickDictionary['selectedWinner'],
                         participant: pickDictionary['participant'],
                         selectedPoints: pickDictionary['selectedPoints'],
                         week: pickDictionary['week'],
                         selectedLoser: pickDictionary['selectedLoser']})
            .then(function(pick) {
              createdPicks.push(pick);
              cb();
            })
            .catch(function(error) {
              cb(error);
            });
          }, function(error) {
            if (error) {
              return Promise.reject(error);
            } else {
              callback(null, createdPicks);
            }
          });
        }
      } else {
        var weekDoesNotExistError = new Error();
        weekDoesNotExistError.status = 404;
        weekDoesNotExistError.message = 'Week given does not exist';
        weekDoesNotExistError.code = 'NOT_FOUND';
        return Promise.reject(weekDoesNotExistError);
      }
    })
    .catch(function(error) {
      console.log(error);
      callback(error, null);
    });
  };
};
