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
		execute: req.protocol + '://' + req.host + ':' + app.get('port') + '/execute',
		commands: {
			autocomp: { 
				helptext: 'this command will receive some autocomplete options',
				autocomplete: { arg1: {}, arg2: { autocomplete: { arg3: {} } } }
			},
			updatestate: { helptext: 'update a server state (push a text to an array)' },
			getstate: { helptext: 'print out the server state' }
		}
	});
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