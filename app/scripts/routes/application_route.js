Aapsmallapp.DonationsRoute = Ember.Route.extend({
	setupController: function(controller){
		this.getData(controller);
		$.ionSound({
		    sounds: [                       // set needed sounds names
		        "job-done",
		    ],
		    path: "assets/",                // set path to sounds
		    multiPlay: false,               // playing only 1 sound at once
		});
	},
	getData: function(controller){
		var socket = io.connect('http://aapsock.discusspolitics.in');
		socket.on('donation', function (data) {
			controller.set("totalDonation", data.totalDonation);
			controller.set("totalDonors", data.totalDonors);
		});
		socket.on('latestdonor', function (data) {
			controller.set("totalDonation", parseInt(controller.get("totalDonation"))+parseInt(data.amount) );
			controller.set("totalDonors", parseInt(controller.get("totalDonors"))+1 );
			if(data.state!="&nbsp;"){
				$place = data.state+"("+data.country+")";
			}else{
				$place = data.country;
			}
			noty({text: "<b>"+data.donorName+"</b> from "+$place+" has just donated <b>₹ "+data.amount+"</b>", layout: "topRight", timeout: 5000});
			$.ionSound.play("job-done");
		});
		
	}

});
Ember.Handlebars.helper('currency', function(value) {
  var escaped = Handlebars.Utils.escapeExpression(value);
  	return new Handlebars.SafeString(accounting.formatMoney(escaped, "₹ "));
});