'use strict';
var Promise = require('bluebird');

// Helper Methods

 /**
 * Generates an authorization token for the given user.
 * @param {object} picksUser The user to create an authorization token for.
 * @param {Function(Error, object)} callback
 */
function generateAuthorizationToken(picksUser, callback) {
  picksUser.createAccessToken({ttl: -1, userId: picksUser.id})
  .then(function(accessToken) {
    callback(null, accessToken);
  })
  .catch(function(error) {
    console.log(error);
    callback(error, null);
  });
}

// PicksUser Remote Methods
module.exports = function(PicksUser) {
  // Disable endpoints not needed
  PicksUser.disableRemoteMethod('create', true);
  PicksUser.disableRemoteMethod('upsert', true);
  PicksUser.disableRemoteMethod('upsertWithWhere', true);
  PicksUser.disableRemoteMethod('updateAll', true);
  PicksUser.disableRemoteMethod('updateAttributes', false);
  PicksUser.disableRemoteMethod('updateAttribute', false);
  PicksUser.disableRemoteMethod('verify', false);
  PicksUser.disableRemoteMethod('replaceOrCreate', true);
  PicksUser.disableRemoteMethod('replaceById', true);
  PicksUser.disableRemoteMethod('createChangeStream', true);
  PicksUser.disableRemoteMethod('find', true);
  PicksUser.disableRemoteMethod('findOne', true);
  PicksUser.disableRemoteMethod('deleteById', true);
  PicksUser.disableRemoteMethod('confirm', true);
  PicksUser.disableRemoteMethod('count', true);
  PicksUser.disableRemoteMethod('exists', true);
  PicksUser.disableRemoteMethod('resetPassword', true);
  PicksUser.disableRemoteMethod('changePassword', true);
  PicksUser.disableRemoteMethod('login', true);
  PicksUser.disableRemoteMethod('__count__accessTokens', false);
  PicksUser.disableRemoteMethod('__create__accessTokens', false);
  PicksUser.disableRemoteMethod('__delete__accessTokens', false);
  PicksUser.disableRemoteMethod('__destroyById__accessTokens', false);
  PicksUser.disableRemoteMethod('__findById__accessTokens', false);
  PicksUser.disableRemoteMethod('__get__accessTokens', false);
  PicksUser.disableRemoteMethod('__updateById__accessTokens', false);

  // Remote Methods

  /**
   * Logins in a user that logged in using the Facebook SDK.
   * @param {string} facebook_access_token An access token given from the
                                           Facebook SDK for interacting with
                                           Facebook's Graph API.
   * @param {Function(Error, string)} callback
   */
  PicksUser.loginWithFacebook = function(facebookAccessToken, callback) {
    // Locate the user in the database based on their Facebook access token
    PicksUser.find({where: {facebookAccessToken: facebookAccessToken}})
    .then(function(picksUsers) {
      if (picksUsers.length == 0 || picksUsers.length > 1) {
        var userAlreadyExistsError = new Error();
        userAlreadyExistsError.status = 404;
        userAlreadyExistsError.message = 'Facebook user does not exist';
        userAlreadyExistsError.code = 'NOT_FOUND';
        return Promise.reject(userAlreadyExistsError);
      }
      var picksUser = picksUsers[0];
      // Reset and generate access token for user
      generateAuthorizationToken(picksUser, function(error, accessToken) {
        if (error) {
          return Promise.reject(error);
        } else {
          var json = {'id': accessToken.id};
          callback(null, json);
        }
      });
    })
    .catch(function(error) {
      callback(error, null);
    });
  };

  /**
   * Signs up a user with a Facebook account.
   * @param {string} facebookAccessToken An access token given from the
                                         Facebook SDK for interacting with
                                         Facebook's Graph API.
   * @param {string} firstName The first name of the user.
   * @param {string} lastName The last name of the user.
   * @param {string} email The email of the user used for Facebook.
   * @param {string} avatarUrl The url to the user's avatar used in Facebook.
   * @param {Function(Error, object)} callback
   */
   PicksUser.signupWithFacebook = function(facebookAccessToken, firstName,
                                           lastName, email, avatarUrl,
                                           callback) {
     // First check if the database already has a user with the given email
     PicksUser.find({where: {email: email}})
     .then(function(picksUsers) {
       if (picksUsers.length == 1) {
         // Check if email has already a Facebook access token.
         // This could mean the access token of that user expired.
         var picksUser = picksUsers[0];
         if (picksUser.facebookAccessToken === null) {
           var emailError = new Error();
           emailError.status = 400;
           emailError.message = 'email_already_in_use';
           emailError.code = 'BAD_REQUEST';
           return Promise.reject(emailError);
         } else {
           // Only need to update the Facebook access token with the new one.
           picksUser.facebookAccessToken = facebookAccessToken;
           // Update the user
           return picksUser.save();
         }
       } else {
         // Create new Facebook user
         return PicksUser.create({facebookAccessToken: facebookAccessToken,
                                  firstName: firstName, lastName: lastName,
                                  email: email, avatarUrl: avatarUrl});
       }
     })
     .then(function(user) {
       // Generate new access token
       generateAuthorizationToken(user, function(error, accessToken) {
         if (error) {
           return Promise.reject(error);
         } else {
           var json = {'id': accessToken.id};
           callback(null, json);
         }
       });
     })
     .catch(function(error) {
       console.log(error);
       callback(error, null);
     });
   };

   /**
    * Gets the current user with an authorization token.
    * @param {Function(Error, object)} callback
    */
   PicksUser.currentUser = function(req, callback) {
     // Get from query parameter when testing with explorer
     var accessToken = req.accessToken.id;
     var AccessToken = PicksUser.app.models.AccessToken;
     // Get the access token instance from the database to get the userId
     AccessToken.findById(accessToken)
     .then(function(retrivedAccessToken) {
       // Use the userId to get the current userId
       return PicksUser.findById(retrivedAccessToken.userId);
     })
     .then(function(picksUser) {
       callback(null, picksUser);
     })
     .catch(function(error) {
       console.log(error);
       callback(error, null);
     });
   };
};
