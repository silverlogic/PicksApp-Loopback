'use strict';
var async = require('async');
var Promise = require('bluebird');

/**
 * Checks that an array of picks posted contains all neccessary data needed.
 * @param {array} picks An array of picks submitted.
 * @param {boolean} confidenceEnabled Used to determine if confidence points
 *                                    should be used.
 * @return {object}
 */
 function validateSubmittedPicks(picks, confidenceEnabled) {
  console.log('picks received', picks);
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
   //   'selectedWinner': 'SomeTeam',
   //   'participant': <Model id of a picks user object>,
   //   'selectedPoints': 1,
   //   'week': <Model id of a week object>,
   //   'selectedLoser': 'SomeTeam'
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
     if (!confidenceEnabled) {
       if (picksDictionary['selectedPoints'] != 1) {
         var incorrectPointsError = new Error();
         incorrectPointsError.status = 400;
         var errorMessage = 'Confidence for this group is disabled.' +
                            ' Selected points for picks should be 1.';
         incorrectPointsError.message = errorMessage;
         incorrectPointsError.code = 'BAD_REQUEST';
         return incorrectPointsError;
       }
     }
   }
   return null;
 }

module.exports = function(Pick) {
  // Disable endpoints not needed
  Pick.disableRemoteMethodByName('create');
  Pick.disableRemoteMethodByName('upsert');
  Pick.disableRemoteMethodByName('upsertWithWhere');
  Pick.disableRemoteMethodByName('updateAll');
  Pick.disableRemoteMethodByName('prototype.updateAttributes');
  Pick.disableRemoteMethodByName('prototype.updateAttribute');
  Pick.disableRemoteMethodByName('prototype.verify');
  Pick.disableRemoteMethodByName('replaceOrCreate');
  Pick.disableRemoteMethodByName('replaceById');
  Pick.disableRemoteMethodByName('createChangeStream');
  Pick.disableRemoteMethodByName('find');
  Pick.disableRemoteMethodByName('findOne');
  Pick.disableRemoteMethodByName('deleteById');
  Pick.disableRemoteMethodByName('confirm');
  Pick.disableRemoteMethodByName('count');
  Pick.disableRemoteMethodByName('exists');

  // Remote Methods

  /**
  * Submits a list of picks for a week in a season.
  * @param {array} picks An array of picks for a given participant.
                         For each pick, if the user is updating it, provide the
                         model id of the object. Otherwise, it will be a new
                         pick for the participant.
  * @param {number} week Model id of the week that the picks will be associated
                         with.
  * @param {number} group Model id of the group that the picks are associated
                          with. This is for validating that the correct type of
                          confidence points are being sent.
  * @param {Function(Error, array)} callback
  */
  Pick.submitPicks = function(picks, week, group, callback) {
    var Week = Pick.app.models.Week;
    var Group = Pick.app.models.Group;
    var createdPicks = [];
    let confidenceEnabled;
    // Get the group that the picks are for.
    Group.findById(group)
    .then(function(groupInstance) {
      confidenceEnabled = groupInstance.confidenceEnabled;
      // Check if the model id of the week exists
      return Week.exists(week);
    })
    .then(function(exists) {
      if (exists) {
        // Check that the picks sent is valid
        var validationError = validateSubmittedPicks(picks, confidenceEnabled);
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
