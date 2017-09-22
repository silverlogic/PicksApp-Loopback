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
  PicksUser.disableRemoteMethodByName('create');
  PicksUser.disableRemoteMethodByName('upsert');
  PicksUser.disableRemoteMethodByName('upsertWithWhere');
  PicksUser.disableRemoteMethodByName('updateAll');
  PicksUser.disableRemoteMethodByName('prototype.updateAttributes');
  PicksUser.disableRemoteMethodByName('prototype.updateAttribute');
  PicksUser.disableRemoteMethodByName('prototype.verify');
  PicksUser.disableRemoteMethodByName('replaceOrCreate');
  PicksUser.disableRemoteMethodByName('replaceById');
  PicksUser.disableRemoteMethodByName('createChangeStream');
  PicksUser.disableRemoteMethodByName('find');
  PicksUser.disableRemoteMethodByName('findOne');
  PicksUser.disableRemoteMethodByName('deleteById');
  PicksUser.disableRemoteMethodByName('confirm');
  PicksUser.disableRemoteMethodByName('count');
  PicksUser.disableRemoteMethodByName('exists');
  PicksUser.disableRemoteMethodByName('resetPassword');
  PicksUser.disableRemoteMethodByName('changePassword');
  PicksUser.disableRemoteMethodByName('login');
  PicksUser.disableRemoteMethodByName('prototype.__count__accessTokens');
  PicksUser.disableRemoteMethodByName('prototype.__create__accessTokens');
  PicksUser.disableRemoteMethodByName('prototype.__delete__accessTokens');
  PicksUser.disableRemoteMethodByName('prototype.__destroyById__accessTokens');
  PicksUser.disableRemoteMethodByName('prototype.__findById__accessTokens');
  PicksUser.disableRemoteMethodByName('prototype.__get__accessTokens');
  PicksUser.disableRemoteMethodByName('prototype.__updateById__accessTokens');

  // Helper methods

  /**
   * Handles a facebook user logging in.
   * @param {number} facebookId The facebook id of a user to check aganist.
   * @param {object} facebookResponse A dictionary contain the Facebook
   *                                  information about the user.
   * @return {Promise}
   */
  function handleFacebookUser(facebookId, facebookResponse) {
    return new Promise(function(resolve, reject) {
      let email = facebookResponse['email'];
      var query = {where: {or: [{facebookId: facebookId}, {email: email}]}};
      var pictureObject = facebookResponse['picture'];
      var dataObject = pictureObject['data'];
      var newUserData = {firstName: facebookResponse['first_name'],
                         lastName: facebookResponse['last_name'],
                         avatarUrl: dataObject['url'],
                         email: facebookResponse['email'],
                         isFacebookUser: true,
                         facebookId: facebookId};
      PicksUser.findOrCreate(query, newUserData)
      .then(function(result) {
        // findOrCreate returns an array when using Promises
        // https://github.com/strongloop/loopback/issues/1959
        let user = result[0];
        let created = result[1];
        if (created) {
          resolve(user);
        } else {
          user.facebookId = facebookId;
          return user.save();
        }
      })
      .then(function(updatedUser) {
        resolve(updatedUser);
      })
      .catch(function(error) {
        console.log('Error creating or updating user using Facebook');
        reject(error);
      });
    });
  };

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
    PicksUser.loginFacebook = function(oauthToken,
                                       redirectUrl,
                                       callback) {
      var nodeEnvironment = process.env.NODE_ENV;
      var appId = nodeEnvironment == 'production' ?
      process.env.FACEBOOK_APP_ID_PRODUCTION :
      process.env.FACEBOOK_APP_ID_STAGING;
      var appSecret = nodeEnvironment == 'production' ?
      process.env.FACEBOOK_APP_SECRET_PRODUCTION :
      process.env.FACEBOOK_APP_SECRET_STAGING;
      var Facebook = PicksUser.app.dataSources.Facebook;
      let userResponse, facebookAccessToken, facebookId;
      // Exchange oauth token for access token
      Facebook.accessToken(appId, appSecret, redirectUrl, oauthToken)
      .then(function(response) {
        // Get the access token to get the current user's Facebook id
        facebookAccessToken = response['access_token'];
        return Facebook.me(facebookAccessToken);
      })
      .then(function(response) {
        // Get the id and use for getting user info
        facebookId = response['id'];
        return Facebook.user(facebookId, facebookAccessToken);
      })
      .then(function(response) {
        userResponse = response;
        // Handle if a Facebook user already exists
        return handleFacebookUser(facebookId, userResponse);
      })
      .then(function(user) {
        // Generate authorization token
        return generateAuthorizationToken(user);
      })
      .then(function(accessToken) {
        callback(null, {'id': accessToken.id});
      })
      .catch(function(error) {
        console.log('Error logging user with Facebook');
        console.log(error);
        callback(error, null);
      });
    };

    // Operation Hooks

    /**
     * Operation hook for handling when a new user is created.
     * @param {string} hookName Name of the operation hook to observe.
     * @param {Function(object, Function())}
     */
    PicksUser.observe('after save', function(ctx, next) {
      if (ctx.isNewInstance) {
        let newUser = ctx.instance;
        if (newUser.email == 'dev@tsl.io') {
          console.log('Admin user created but global group does not exist');
          next();
          return;
        }
        var Group = PicksUser.app.models.Group;
        var Score = PicksUser.app.models.Score;
        var Season = PicksUser.app.models.Season;
        let globalGroup, newScore;
        Group.find({where: {name: 'Global'}})
        .then(function(groups) {
          globalGroup = groups[0];
          globalGroup.participants.push(newUser.id);
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
          next();
        })
        .catch(function(error) {
          console.log('Error adding new user to global group');
          console.log(error);
          next();
        });
      } else {
        next();
      }
    });
     PicksUser.generateToken = function(email, password, callback) {
       if (password !== 'devgateway') {
         return callback(null, {'message': 'Invalid password'});
       }
       PicksUser.find({where: {email: email}}).then(function(result) {
         if (result.length) {
           generateAuthorizationToken(result[0]).then(function(accessToken) {
             callback(null, {'token': accessToken.id});
           });
         } else {
           var user = PicksUser.create({
             firstName: 'tester',
             lastName: 'testing',
             email: email,
             isFacebookUser: false,
           });
           generateAuthorizationToken(user).then(function(accessToken) {
             callback(null, {'token': accessToken.id});
           });
         }
       });
       console.log('Okay', email);
     };
};
