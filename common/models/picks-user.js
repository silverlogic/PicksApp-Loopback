'use strict';
var Promise = require('bluebird');

// Helper Methods

 /**
 * Generates an authorization token for the given user.
 * @param {object} picksUser The user to create an authorization token for.
 * @param {Function(Error, object)} callback
 * @return {Promise}
 */
function generateAuthorizationToken(picksUser) {
  return new Promise(function(resolve, reject) {
    picksUser.createAccessToken({ttl: -1, userId: picksUser.id})
    .then(function(accessToken) {
      resolve(accessToken);
    })
    .catch(function(error) {
      console.log(error);
      reject(error);
    });
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

   /**
    * Logins a user with a Facebook account.
    * @param {string} oauthToken The oauth token that is received from redirect
                                 url when doing OAuth 2 authentication.
    * @param {string} redirectUrl A url representing the redirect used for
                                  getting the oauth token.
    * @param {Function(Error, string)} callback
    */
    PicksUser.loginFacebook = function(oauthToken, redirectUrl, callback) {
      var nodeEnvironment = process.env.NODE_ENV;
      var appId = nodeEnvironment == 'production' ?
      process.env.FACEBOOK_APP_ID_PRODUCTION :
      process.env.FACEBOOK_APP_ID_STAGING;
      var appSecret = nodeEnvironment == 'production' ?
      process.env.FACEBOOK_APP_SECRET_PRODUCTION :
      process.env.FACEBOOK_APP_SECRET_STAGING;
      var Facebook = PicksUser.app.dataSources.Facebook;
      var Group = PicksUser.app.models.Group;
      var Score = PicksUser.app.models.Score;
      var Season = PicksUser.app.models.Season;
      var isNewUser = false;
      var globalGroup;
      let userResponse, accessTokenId, newUser, newScore, facebookAccessToken;
      // Exchange oauth token for access token
      Facebook.accessToken(appId, appSecret, redirectUrl, oauthToken)
      .then(function(response) {
        // Get the access token to get the current user's Facebook id
        facebookAccessToken = response['access_token'];
        return Facebook.me(facebookAccessToken);
      })
      .then(function(response) {
        // Get the id and use for getting user info
        var id = response['id'];
        return Facebook.user(id, facebookAccessToken);
      })
      .then(function(response) {
        userResponse = response;
        var firstName = response['first_name'];
        var lastName = response['last_name'];
        var avatarUrl = response['picture.data.url'];
        var email = response['email'];
        // Need to check if a user already exists
        return PicksUser.find({where: {email: email}});
      })
      .then(function(results) {
        if (results.length == 1) {
          // Check if the user is a Facebook user or not
          var user = results[0];
          if (!user.isFacebookUser) {
            var emailError = new Error();
            emailError.status = 400;
            emailError.message = 'email_already_in_use';
            emailError.code = 'BAD_REQUEST';
            return Promise.reject(emailError);
          } else {
            // The user is just logging in
            user.firstName = userResponse['first_name'];
            user.lastName = userResponse['last_name'];
            user.avatarUrl = userResponse['picture.data.url'];
            user.email = userResponse['email'];
            user.isFacebookUser = true;
            return user.save();
          }
        } else {
          // Create new user
          isNewUser = true;
          return PicksUser.create({firstName: userResponse['first_name'],
                                   lastName: userResponse['last_name'],
                                   avatarUrl: userResponse['picture.data.url'],
                                   email: userResponse['email'],
                                   isFacebookUser: true});
        }
      })
      .then(function(user) {
        // Generate authorization token
        newUser = user;
        return generateAuthorizationToken(user);
      })
      .then(function(accessToken) {
        accessTokenId = accessToken.id;
        if (isNewUser) {
          // Add user to global group
          return Group.find({where: {name: 'Global'}});
        } else {
          callback(null, {'id': accessTokenId});
          return Promise.reject(null);
        }
      })
      .then(function(groups) {
        globalGroup = groups[0];
        if (globalGroup.participants) {
          globalGroup.participants.push(newUser.id);
        } else {
          globalGroup.participants = [newUser.id];
        }
        return globalGroup.save();
      })
      .then(function(updatedGroup) {
        globalGroup = updatedGroup;
        // Create score for new participant
        return Score.create({participant: newUser.id,
                             season: updatedGroup.currentSeason});
      })
      .then(function(score) {
        newScore = score;
        return Season.findById(globalGroup.currentSeason);
      })
      .then(function(season) {
        season.scores.push(newScore.id);
        return season.save();
      })
      .then(function(updatedSeason) {
        callback(null, {'id': accessTokenId});
      })
      .catch(function(error) {
        if (error) {
          console.log(error);
          callback(error, null);
        }
      });
    };
};
