var google = require("googleapis");

exports.getCalandarList = function(auth) {
	return new Promise(function (resolve, reject) {
		var calendar = google.calendar('v3');
		calendar.calendarList.list({
		    auth: auth
		  }, function(err, response) {
		    if (err) {
		      console.log('The API returned an error: ' + err);
		      reject(err);
		      return;
		    }
		    resolve(response.items);
		});
	});
};

exports.insertCalandar = function(auth, summary) {
	return new Promise(function (resolve, reject) {
		var calendar = google.calendar('v3');
		calendar.calendars.insert({
		    auth: auth,
		    resource: {summary : summary}
		  }, function(err, response) {
		    if (err) {
		      console.log('The API returned an error: ' + err);
		      reject(err);
		    }

		    resolve(response);
		});
	});
};

exports.insertEvent = function(auth, categoryId, event) {
	return new Promise(function (resolve, reject) {
		var calendar = google.calendar('v3');
		calendar.events.insert({
		    auth: auth,
		    calendarId : categoryId,
		    resource: event
		}, function(err, response) {
			if (err) {
		      console.log('The API returned an error: ' + err);
		      reject(err);
		    }

		    resolve(response);
		});
	});
};