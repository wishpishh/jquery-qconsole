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
			autocomp: { 
				helptext: 'this command will receive some recursive autocomplete arguments'
			},
			updatestate: { helptext: 'Update a server state (push a text to an array). This command will autocomplete with a simple list of arguments.' },
			getstate: { helptext: 'print out the server state' }
		}
	});
});

app.get('/execute', function(req, res) {
	var command = req.query["command"],
	parts = command.split(' ');
	
	if (parts.length < 1) {
		return res.send({ result: "invalid input", success: false });
	}
	
	var operation = parts[0];
	
	switch(operation) {
		case 'updatestate':
			if (parts.length === 2) {
				state += parts[1];
			} else {
				state++;
			}
			
			return res.send({ result: "updated state", success: true });
		case 'getstate':
			return res.send({ result: "current state is: " + state, success: true });
		default:
			return res.send({ result: "unrecognized command", success: false });
	}
});

app.get('/autocomplete', function(req, res) {
	var command = req.query["command"],
	parts = command.split(' ');

	if (parts.length < 1) {
		return res.send("invalid input");
	}
	
	var operation = parts[0];
	
	if (operation === 'autocomp') {
		if (parts.length > 2) {
			return res.send([]);
		}
		return res.send(['arg1', 'arg2', 'arg3']);
	}
});

app.listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});