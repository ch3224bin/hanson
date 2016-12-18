var express = require('express');
var google = require("googleapis");
var router = express.Router();

var OAuth2 = google.auth.OAuth2;

// generate a url that asks permissions for Google+ and Google Calendar scopes
var scopes = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/plus.login'
];


var getOauth2Client = function() {
	return new OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.REDIRECT_URI);
};

var getMe = function(auth) {
	return new Promise(function (resolve, reject) {
		var plus = google.plus('v1');
		plus.people.get({
		    auth: auth,
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

var getAuth = function(req) {
	var oauth2Client = getOauth2Client();
	var tokens =  req.cookies.googleToken;
	oauth2Client.setCredentials(tokens);
	return oauth2Client;
};

var getTokens = function(code) {
	return new Promise(function(resolve, reject) {
		getOauth2Client().getToken(code, function(err, tokens) {
		    if (err) {
		      console.log(err);
		      reject(err);
		      return;
		    }

		    resolve(tokens);
		});
	});
};

router.getAuth = function(req) {
	return getAuth(req);
};

/* filter : 구글 인증이 있는지 확인
 * google+ 정보를 받아와 session에 넣는다.
 */
router.authentication = function(req, res, next) {

	if (req.url.match(/^\/oauth2|^\/oauth2callback/)) {
		next();
		return;
	}

	var tokens =  req.cookies.googleToken;
	if (tokens) {
		if (!req.session.user) {
			getMe(getAuth(req))
			.catch(function() {
				var code = tokens.refresh_token;
				getTokens(code)
				.then(tokens => {
					res.cookie('googleToken', tokens, {maxAge: 2592000000});
  					res.redirect('/home');
				});
			})
			.then(function(profile) {
				req.session.user = profile;
				next();
			});
		} else {
			next();
		}
	} else {
		res.redirect('/oauth2');
	}
};

/* google api 권한 승인 페이지로 이동 */
router.get("/oauth2", function(req, res) {
	var url = getOauth2Client().generateAuthUrl({
	  access_type: 'offline',
	  scope: scopes,
	  approval_prompt: 'force'
	});
	res.redirect(url);
});

/* 권한 승인 후 code callback 
 * code로 token을 받아서 쿠키에 넣는다.
 */
router.get("/oauth2callback", function(req, res) {
  var code = req.query.code;
  getTokens(code)
  .then(tokens => {
  	res.cookie('googleToken', tokens, {maxAge: 2592000000});
  	res.redirect('/home');
  });
});

module.exports = router;