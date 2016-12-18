var express = require('express');
var google = require("googleapis");
var level = require("level");
var moment = require("moment");
var auth = require('./auth');
var googleService = require('./googleService');
var router = express.Router();
var db = level((process.env.ABSOLUTE_PATH||'./') + process.env.LEVEL_DB_PATH, { valueEncoding: 'json' })


router.get('/home', function(req, res, next) {
	res.render('home', {});
});

router.get('/main', function(req, res, next) {

	googleService.getCalandarList(auth.getAuth(req))
	.then(function(calendarList) {
		res.render('main', {"calendarList" : calendarList});
	});
	
});

router.get('/daily', function(req, res, next) {

	res.render('daily', {});
});

router.get('/category', function(req, res, next) {
	
	res.render('category', {});
});


router.get('/categoryList', function(req, res, next) {
	
	googleService.getCalandarList(auth.getAuth(req))
	.then(function(calendarList) {
		var categoryKey = req.session.user.id + '_category';
		db.createReadStream({
			gt : categoryKey,
			lt : categoryKey + '\xFF'
		})
		.on('data', function(result) {
			var calendarId = result.key.replace(req.session.user.id + '_category' + '_', '');
			for (var i = 0, n = calendarList.length; i < n; i++) {
				if (calendarId == calendarList[i].id && result.value.checked === true) {
					calendarList[i].checked = true;
					break;
				}
			}
		})
		.on('end', function() {
			res.send(calendarList);
		});
	});
});

router.get('/checkedCategoryList', function(req, res, next) {
	var resultList = [];
	googleService.getCalandarList(auth.getAuth(req))
	.then(function(calendarList) {
		var categoryKey = req.session.user.id + '_category';
		db.createReadStream({
			gt : categoryKey,
			lt : categoryKey + '\xFF'
		})
		.on('data', function(result) {
			var calendarId = result.key.replace(req.session.user.id + '_category' + '_', '');
			for (var i = 0, n = calendarList.length; i < n; i++) {
				if (calendarId == calendarList[i].id && result.value.checked === true) {
					resultList.push(calendarList[i]);
					break;
				}
			}
		})
		.on('end', function() {
			res.send(resultList);
		});
	});
});

router.post('/saveCategory', function(req, res, next) {
	var categoryKey = req.session.user.id + '_category' + '_' + req.body.name;
	db.put(categoryKey, {checked : req.body.value});
	res.send(req.body.name);
});

router.post('/addCategory', function(req, res, next) {
	if (!req.body.name) {
		res.send('empty category name.');
		return;
	}

	googleService.insertCalandar(auth.getAuth(req), req.body.name)
	.catch(err => res.send(err))
	.then(result => res.send('success'));
});

router.post('/saveCurrent', function(req, res, next) {
	var savedCurrentDataKey = req.session.user.id + '_saved_current_data';
	var currentData = {
		categoryId : req.body.categoryId,
		summary : req.body.summary,
		description : req.body.description,
		startTime : new Date()
	};

	db.get(savedCurrentDataKey, function(err, value) {
		var saved = value != undefined;

		// 이미 저장된 데이터가 있다면 캘린더 이벤트 등록.
		if (saved) {
			var event = value;
			event.start = {dateTime : moment(event.startTime).toISOString()};
			event.end = {dateTime : moment().toISOString()};

			db.del(savedCurrentDataKey, function(err) {
				googleService.insertEvent(auth.getAuth(req), currentData.categoryId, event)
				.catch(err => res.send(err))
				.then(result => res.send('sent'));
			});
		} else {
			db.put(savedCurrentDataKey, currentData)
			res.send('saved');
		}
	
	});
});


router.get('/getCurrent', function(req, res, next) {
	var savedCurrentDataKey = req.session.user.id + '_saved_current_data';
	db.get(savedCurrentDataKey, function(err, value){
		if (err) console.log(err + '\nvalue = ' + value);
		res.json(value ? value : {});
	});
});


module.exports = router;