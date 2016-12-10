var express = require('express');
var google = require("googleapis");
var fs = require('fs');
var router = express.Router();

var OAuth2 = google.auth.OAuth2;


var oauth2Client;

// Load client secrets from a local file.
fs.readFile('config.json', function processClientSecrets(err, content) {
  var config = JSON.parse(content);
  oauth2Client = new OAuth2(config.client_id, config.client_secret, config.redirect_uri);
});


// generate a url that asks permissions for Google+ and Google Calendar scopes
var scopes = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/plus.login'
];


var getMe = function(resolve, reject) {
	return new Promise(function (resolve, reject) {
		var plus = google.plus('v1');
		plus.people.get({
		    auth: oauth2Client,
		    userId: 'me'
		  }, function(err, profile) {
		    if (err) {
		      console.log('The API returned an error: ' + err);
		      reject(err);
		      return;
		    }
		    resolve(profile);
		});
		
	});
};

var authorize = function(code, callback) {
	oauth2Client.getToken(code, function(err, tokens) {
	    if (err) {
	      console.log(err);
	      return;
	    }

	    oauth2Client.setCredentials(tokens);
	    callback(tokens);
  	});
};

router.get("/oauth2", function(req, res) {
	var url = oauth2Client.generateAuthUrl({
	  scope: scopes // If you only need one scope you can pass it as string
	});
	res.redirect(url);
});

router.get("/oauth2callback", function(req, res) {
  var code = req.query.code;
  var callback = function(tokens) {
  	res.cookie('googleToken', tokens);
  	res.redirect('/home');
  };
  authorize(code, callback);
});

router.getAuth = function() {
	return oauth2Client;
};


router.authentication = function(req, res, next) {

	if (req.url.match(/^\/oauth2|^\/oauth2callback/)) {
		next();
		return;
	}
	var tokens =  req.cookies.googleToken;
	if (tokens) {
		oauth2Client.setCredentials(tokens);

		if (!req.session.user) {
			getMe()
			.then(function(profile) {
				req.session.user = profile;
				next();
			}, function(err){
				res.redirect('/oauth2');
			});
		} else {
			next();
		}
	} else {
		res.redirect('/oauth2');
	}
};

module.exports = router;