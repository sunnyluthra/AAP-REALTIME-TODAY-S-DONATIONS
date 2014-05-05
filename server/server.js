var io = require('socket.io').listen(4300);
var mongoose = require('mongoose');
var moment = require("moment");
var request = require('request');
var cheerio = require('cheerio');

var url = 'https://donate.aamaadmiparty.org/Report/Donation_List.aspx';

mongoose.connect('mongodb://localhost/aaptrends');
db = mongoose.connection;
db.on('error', console.error);

var donationSchema = new mongoose.Schema({
	donorName: String,
	country: String,
	state: String,
	transactionId: {
		type: String,
		unique: true,
		index: true
	},
	amount: Number,
	date: Date
});
Donations = mongoose.model('Donations', donationSchema);

var global_socket;
var isInited = false;
io.sockets.on('connection', function(socket) {
	global_socket = socket;
	todayDonation();
	if (!isInited) {
		getData(url);
		isInited = true;
	}


});

function todayDonation() {
	$date = moment().format('D');
	$month = moment().format('M');
	$year = moment().format('YYYY');
	console.log($date, $month, $year);
	var match = {
		$match: {
			year: parseInt($year),
			month: parseInt($month),
			day: parseInt($date)
		}
	};


	var project = {
		$project: {
			year: {
				$year: "$date"
			},
			month: {
				$month: "$date"
			},
			day: {
				$dayOfMonth: "$date"
			},
			date: "$date",
			amount: "$amount"
		}
	};

	var group = {
		$group: {
			_id: {
				year: {
					$year: "$date"
				},
				month: {
					$month: "$date"
				},
				day: {
					$dayOfMonth: "$date"
				}
			},
			totalDonation: {
				$sum: "$amount"
			},
			totalDonors: {
				$sum: 1
			}
		}
	};

	var sort = {
		$sort: {
			_id: -1
		}
	};

	var limit = {
		$limit: 31
	}


	Donations.aggregate(project, match, group, sort, limit, function(err, data) {
		if (err) {
			result = {
				"totalDonation": 0,
				"totalDonors": 0
			};

		} else {
			totalDonation = totalDonors = 0;
			if (typeof data[0] !== 'undefined') {
				totalDonation = data[0].totalDonation;
				totalDonors = data[0].totalDonors;
			}
			result = {
				"totalDonation": totalDonation,
				"totalDonors": totalDonors
			};

		}
		console.log(result);
		global_socket.emit('donation', result);
	});
}

loop = 1;
$record = 0;
$record_exists = 0;

function getData(req) {
	console.log(loop);
	request(req, function(error, response, html) {
		if (!error && response.statusCode == 200) {
			var $ = cheerio.load(html);
			var row = $('.mGrid tr');

			var count = row.length;
			row.each(function(i) {
				if (i > 0) {
					var data = {
						"donorName": "",
						"country": "",
						"state": "",
						"transactionId": "",
						"amount": "",
						"date": ""
					};
					$record++;
					console.log("Record Number: " + $record);
					$this = $(this).find('td');

					data.donorName = $this.eq(0).html();
					data.country = $this.eq(1).html();
					data.state = $this.eq(2).html();
					data.transactionId = $this.eq(3).html();
					data.amount = $this.eq(4).html();
					data.date = $this.eq(5).html();
					data.date = data.date.replace('PM', ' PM');
					data.date = data.date.replace('AM', ' AM');
					data.date = new Date(Date.parse(data.date)).toISOString();



					var donation = new Donations(data);

					donation.save(function(err, donation) {
						if (err) {
							$record_exists++;
							console.error(err);
						} else {
							io.sockets.emit('latestdonor', donation);
							$record_exists = 0;
						}


					});

				}
				console.log(count);
				if (!--count) {
					var $form = $('form[name="aspnetForm"]');
					var $next = $('#ctl00_MainContent_lnkNext').attr('href');
					$evtrg = "";
					if (loop !== 1) {
						$evtrg = "ctl00$MainContent$lnkNext";
					}
					var form_data = {
						"__EVENTTARGET": $evtrg,
						"__EVENTARGUMENT": "",
						"__VIEWSTATE": $('#__VIEWSTATE').val(),
						"__EVENTVALIDATION": $('#__EVENTVALIDATION').val()
					}
					req = {
						"url": url,
						"method": "POST",
						"form": form_data
					};
					loop++;

					if ($record_exists > 10) {
						setTimeout(function() {
							getData(url);

						}, 5000)
					} else {
						getData(req);
					}

				}


			});

		} else {
			console.log(response);
		}
	});
}