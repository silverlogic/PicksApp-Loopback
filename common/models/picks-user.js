'use strict';

// Helper Methods

/**
 * Logs location where error was thrown.
 * @param {string} methodName The name of the method where the error was thrown
 */
function logLocationOfError(methodName) {
  console.log('Error thrown in ', methodName);
}

 /**
 * Generates an authorization token for the given user.
 * @param {object} picksUser The user to create an authorization token for.
 * @param {Function(Error, object)} callback
 */
function generateAuthorizationToken(picksUser, callback) {
  console.log(picksUser);
  picksUser.createAccessToken({ttl: -1, userId: picksUser.id},
                              function(error, accessToken) {
    if (error) {
      console.log('Error creating AccessToken object');
      logLocationOfError('generateAuthorizationToken');
      callback(error, null);
    } else {
      console.log('AccessToken object created');
      console.log(accessToken);
      callback(null, accessToken);
    }
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
  PicksUser.disableRemoteMethod('findById', true);
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

  /**
   * Logins in a user that logged in using the Facebook SDK.
   * @param {string} facebook_access_token An access token given from the
                                           Facebook SDK for interacting with
                                           Facebook's Graph API.
   * @param {Function(Error, string)} callback
   */
  PicksUser.loginWithFacebook = function(facebookAccessToken, callback) {
    // Locate the user in the database based on their Facebook access token
    PicksUser.find({where: {facebookAccessToken: facebookAccessToken}},
                   function(error, picksUsers) {
      if (error) {
        console.log('Error locating user in database.');
        logLocationOfError('loginWithFacebook');
        callback(error, null);
      } else {
        if (picksUsers.length == 0 || picksUsers.length > 1) {
          var userAlreadyExistsError = new Error();
          userAlreadyExistsError.status = 404;
          userAlreadyExistsError.message = 'Facebook user does not exist';
          userAlreadyExistsError.code = 'NOT_FOUND';
          callback(userAlreadyExistsError, null);
          return;
        }
        var picksUser = picksUsers[0];
        console.log('User found');
        console.log(picksUser);
        // Reset and generate access token for user
        generateAuthorizationToken(picksUser, function(error, accessToken) {
          if (error) {
            console.log('Error getting access tokens for user');
            logLocationOfError('loginWithFacebook');
            callback(error, null);
          } else {
            var json = {'id': accessToken.id};
            callback(null, json);
          }
        });
      }
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
     PicksUser.find({where: {email: email}}, function(error, picksUsers) {
       if (error) {
         console.log('Error checking database');
         logLocationOfError('signupWithFacebook');
         callback(error, null);
       } else if (picksUsers.length == 1) {
         // Check if email has already a Facebook access token.
         // This could mean the access token of that user expired.
         var picksUser = picksUsers[0];
         if (picksUser.facebookAccessToken === null) {
           // Client needs to provide a different email
           var emailError = new Error();
           emailError.status = 400;
           emailError.message = 'email_already_in_use';
           emailError.code = 'BAD_REQUEST';
           callback(emailError, null);
         } else {
           // Only need to update the Facebook access token with the new one.
           console.log(facebookAccessToken);
           picksUser.facebookAccessToken = facebookAccessToken;
           // Update the user
           picksUser.save(function(error, updatedPicksUser) {
             if (error) {
               console.log('Error updating user');
               logLocationOfError('signupWithFacebook');
               callback(error, null);
             } else {
               // Generate new access token
               generateAuthorizationToken(picksUser,
                                          function(error, accessToken) {
                 if (error) {
                   console.log('Error getting access tokens for user');
                   logLocationOfError('signupWithFacebook');
                   callback(error, null);
                 } else {
                   var json = {'id': accessToken.id};
                   callback(null, json);
                 }
               });
             }
           });
         }
       } else {
         // Create new Facebook user
         PicksUser.create({facebookAccessToken: facebookAccessToken,
                           firstName: firstName, lastName: lastName,
                           email: email, avatarUrl: avatarUrl},
                           function(error, newPicksUser) {
           if (error) {
             console.log('Error creating new user');
             logLocationOfError('signupWithFacebook');
             callback(error, null);
           } else {
             // Generate new access token
             generateAuthorizationToken(
               newPicksUser, function(error, accessToken) {
               if (error) {
                 console.log('Error getting access tokens for user');
                 logLocationOfError('signupWithFacebook');
                 callback(error, null);
               } else {
                 var json = {'id': accessToken.id};
                 callback(null, json);
               }
             });
           }
         });
       }
     });
   };

   /**
    * Gets the current user with an authorization token.
    * @param {Function(Error, object)} callback
    */
   PicksUser.currentUser = function(req, callback) {
     // Get from query parameter when testing with explorer
     var accessToken = req.query.access_token;
     if (accessToken === null) {
       accessToken = req.get('Authorization');
     }
     // Get the access token instance from the database to get the userId
     PicksUser.app.models.AccessToken.findById(accessToken,
                                          function(error, retrivedAccessToken) {
       if (error) {
         console.log('Error checking access token in database');
         logLocationOfError('currentUser');
         callback(error, null);
       } else {
         // Use the userId to get the current userId
         PicksUser.findById(retrivedAccessToken.userId,
                            function(error, picksUser) {
           if (error) {
             console.log('Error retriving user');
             logLocationOfError('currentUser');
             callback(error, null);
           } else {
             callback(null, picksUser);
           }
         });
       }
     });
   };
};
