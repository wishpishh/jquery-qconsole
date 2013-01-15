var express = require('express')
	, path = require('path');

var app = express();

app.configure(function() {
	app.set('port', process.env.PORT || 3000);
	app.use(express.static(path.join(__dirname, 'public')));
});

app.get('/description', function(req, res) {
	res.send({
		autocomplete: req.headers.host + '/autocomplete',
		execute: req.headers.host + '/execute',
		commands: {
			noautocomp: 'this command does not have any autocomplete options',
			autocomp: 'this command will receive some autocomplete options',
			updatestate: 'update a server state (push a text to an array)',
			getstate: 'print out the server state'
		}
	});
});

app.get('/autocomplete', function(req, res) {
	console.log("autocomp");
});

app.get('execute', function(req, res) {
	console.log('execute');
});

app.listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});