// Utility functions for handling multiplayer games, with several players.
// You must call "init" to initialize the required roles in this game.



//
// Data relevant to a group of games - GameServer class:
// 

/**
 * Initialize a game-server.
 * @param requiredRolesArray the required roles, e.g. ['Emp-loyer', 'Can-didate'], or ['Alex', 'Deniz']
 * @param additionalData any data that is specific to this type of game, for example: max length in seconds, data files, etc. 
 *        Not used by the multiplayer server.  
 */ 
exports.GameServer = function(requiredRolesArray, additionalData) {
  this.data = additionalData;
  this.requiredRolesArray = requiredRolesArray;
  this.games = [];
  this.totalNumberOfStartingPlayers = 0;   // The total number of players that started the process (including questionnaires etc.) since the server started.

  this.requiredRoles = {};
  for (var i=0; i<requiredRolesArray.length; ++i)
    this.requiredRoles[requiredRolesArray[i]] = true;
};

exports.GameServer.prototype.getRequiredRoles = function() { return this.requiredRoles; };

exports.GameServer.prototype.isRoleRequired = function(role) { return !!this.requiredRoles[role]; };

exports.GameServer.prototype.getGames = function() { return this.games; };


/**
 * Get the next role for this game, by cycling through the required roles.
 * 
 * Call this function when a new player starts his way to the game (before he fills the questionnaires).
 * @return the role.
 */
exports.GameServer.prototype.nextRole = function() {
  var newPlayerRole = this.requiredRolesArray[this.totalNumberOfStartingPlayers % this.requiredRolesArray.length];
  this.totalNumberOfStartingPlayers++;
  return newPlayerRole;
};


/**
 * @return a game that is waiting for the given role (if exists), or a new game.
 */ 
exports.GameServer.prototype.gameWaitingForRole = function(role) {
  if (!role)
    return null;

  // A. Find a game with this role missing:
  for (var gameindex in this.games) {
    if (!this.games[gameindex].isRoleInGame(role) && !this.games[gameindex].startTime)
      return this.games[gameindex];
  }

  // B. ... or create a fresh new game:
  var gameWithRoleMissing = new Game(this.gametype, this.requiredRoles, this.data.hasTranslator);
  this.games.push(gameWithRoleMissing);
  return gameWithRoleMissing;
};

/**
 * @return a game with the given user in the given role, or null.
 */ 
exports.GameServer.prototype.gameWithUser = function(userid, role) {
  if (!userid || !role)
    return null;

  // A. Find a game with this userid:
  for (var gameindex in this.games) {
    if (this.games[gameindex].isRolePlayedByUser(role, userid))
      return this.games[gameindex];
  }
  return null;
};

exports.GameServer.prototype.gameById = function(gameid) {
  if (!gameid) return null;
  for (var gameindex in this.games) {
    if (this.games[gameindex].gameid==gameid)
      return this.games[gameindex];
  }
  return null;
};




//
// Data relevant to a single game - Game class:
// 

/**
 * Creates a new game, but doesn't start it yet.
 */
Game = function(gametype, requiredRoles, hasTranslator) {
    this.gametype = gametype;
    this.requiredRoles = requiredRoles;
    this.gameid = new Date().toISOString();  // create a unique id for the game
    this.startTime = null;
    this.endTime = null;
    this.unverified=true; // For the log: the game is considered "unverified" until the experiment manager removes the 'unverified' setting
    this.mapRoleToUserid = {}; // roles that finished all questionnaires, and are inside the game room.
    this.calculateMissingRoles();
    this.mapRoleToMapIssueToValue = {}; // for each role, we keep an issue=>value map.
    this.mapRoleToFinalResult = {};
    this.actionNum = 0;
    this.hasTranslator = hasTranslator;
    this.endedIn;
};

Game.prototype.isRoleInGame = function (role) {
    return !!this.mapRoleToUserid[role];
};

Game.prototype.isRolePlayedByUser = function (role,  userid) {
    return this.mapRoleToUserid[role] == userid;
};

Game.prototype.calculateMissingRoles = function() {
    this.missingRolesArray = [];
    for (var requiredRole in this.requiredRoles) {
      if (!this.mapRoleToUserid.hasOwnProperty(requiredRole)) {
          this.missingRolesArray.push(requiredRole);
      }
    }
};

/**
 * Register a new player to this game.
 * Also updates the list of missing roles.
 * If there are no more missing roles - also starts the game.
 */ 
Game.prototype.playerEntersGame = function(userid, role) {
    if (this.mapRoleToUserid[role] && this.mapRoleToUserid[role]==userid)
      return;   // player is already in this game - no need to re-enter
    this.mapRoleToUserid[role] = userid;
    this.mapRoleToMapIssueToValue[role] = {}; // initialize an empty map
    this.calculateMissingRoles();

    // Check if we can start the game:
    if (!this.missingRolesArray.length) {
        this.startTime = new Date();
    }
};

/**
 * The player with the given role changes the given issue to the given value.
 * @return true if changed, false if not.
 */
Game.prototype.playerChangesValue = function(role, issue, value) {
    var map = this.mapRoleToMapIssueToValue[role];

    if (!map[issue] && !value)
      return false;

    if (map[issue] === value)
      return false;
   
    map[issue] = value;

    return true;
}

Game.prototype.valuesOfPlayer = function(role) {
    return this.mapRoleToMapIssueToValue[role];
}

/**
 * @return true iff ALL required players have a value for this issue, and ALL values are equal.
 */
Game.prototype.arePlayerValuesEqual = function(issue) {
    var value = undefined;
    for (var role in this.requiredRoles) {
        if (!this.mapRoleToMapIssueToValue[role])
            return false;
        if (!(issue in this.mapRoleToMapIssueToValue[role]))
            return false;
        var currentRoleValue = this.mapRoleToMapIssueToValue[role][issue];
        if (!currentRoleValue)
            return false;
        if (value==undefined)
            value = currentRoleValue;
        else if (value != currentRoleValue)
            return false;
    }
    return true;
}

/**
 * @return true iff ALL required players have a value for ALL issues, and ALL values are equal.
 */
Game.prototype.arePlayerValuesToAllIssuesEqual = function(issues) {
    for (i in issues) {
      var issue = issues[i].name;
      //console.log("issue "+issue);
      if (!this.arePlayerValuesEqual(issue))
          return false;
      //console.log(" -- equal");
    }
    return true;
}

/**
 * Unregister a player from this game.
 */
Game.prototype.playerLeavesGame = function(userid, role) {
    if (this.mapRoleToUserid[role]==userid) {
      if (!this.startTime) { // don't delete a player if the game was already started (to allow re-connection in case of interruptions)
        delete this.mapRoleToUserid[role];
        this.calculateMissingRoles();
      }
    } else {
     // throw "user '"+userid+"' is not in game "+this.gameid;
     // This is not an error - for example, a Watcher is not registered as a player in the game, but may disconnect.
    }
};

Game.prototype.endGame = function() {
    this.endTime = new Date();
}


//
// UNITEST
//

if (process.argv[1] === __filename) {
  console.log("multiplayer.js unitest start");
  var gameServer = new exports.GameServer(['Alex', 'Deniz']);

  for (var userid=1; userid<=5; ++userid) {
    var role = gameServer.nextRole();
    console.log("user "+userid+" starts with "+JSON.stringify(role));
    
    var game = gameServer.gameWaitingForRole(role);
    game.playerEntersGame(userid, role);
    console.log("game = "+JSON.stringify(game));

    console.log("salary equal before change="+game.arePlayerValuesEqual("Salary"));
    game.playerChangesValue(role, "Salary", "20000");
    console.log("salary equal after change="+game.arePlayerValuesEqual("Salary"));
    
    console.log("-");
  }
  

  function testView() {  
	  var jade = require('jade')
	    , path = require('path')
	    , fs = require('fs')
	    ;
	
	  var pathToJade = path.join(__dirname,"views","MultiplayerGames.jade");
	  var fn = jade.compile(fs.readFileSync(pathToJade), {pretty:true, filename:pathToJade});
	  console.log(fn({games: gameServer.getGames(), title: 'Unit test', show_unverified_games:true, AMTStatus: '-', /*sprintf: require('sprintf').sprintf,*/ format:"%1.0f"}));
	  
	  console.log("multiplayer.js unitest end");
  }
  //testView();
}
