var express = require('express')
	, path = require('path');

var app = express();

app.configure(function() {
	app.set('port', process.env.PORT || 3000);
	app.use(express.static(path.join(__dirname, 'public')));
});

var state = 0;

app.get('/description', function(req, res) {
	res.send({
		autocomplete: req.protocol + '://' + req.host + ':' + app.get('port') + '/autocomplete',
		execute: req.protocol + '://' + req.host + ':' + app.get('port') + '/execute',
		commands: {
			noautocomp: 'this command does not have any autocomplete options',
			autocomp: 'this command will receive some autocomplete options',
			updatestate: 'update a server state (push a text to an array)',
			getstate: 'print out the server state'
		}
	});
});

app.get('/autocomplete', function(req, res) {
	res.send({ result: "this would autocomplete", success: true });
});

app.get('/execute', function(req, res) {
	var command = req.query["command"];
	
	switch(command) {
		case 'updatestate':
			state++;
			return res.send({ result: "updated state", success: true });
		case 'getstate':
			return res.send({ result: "current state is: " + state, success: true });
		default:
			return res.send({ result: "unrecognized command", success: false });
	}
});

app.listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});