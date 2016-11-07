var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8000;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || 'localhost';

var tokenizer = require('./tokenizer.js');
var treebuilder = require('./treebuilder.js');
var equiv = require('./equiv.js');

app.use('/', express.static('./app'));
app.use(bodyParser.json());

var server = app.listen(server_port, server_ip_address, () => {
   var port = server.address().port;
   var address = server.address().address;
   console.log(`Listening at address ${address} and port ${port}`);
});

app.get('/parse', (req, res) => {
	res.send(tokenizer.parse(JSON.parse(decodeURIComponent(req.query.data))));
});

app.get('/build', (req, res) => {
	res.send(treebuilder.build(JSON.parse(decodeURIComponent(req.query.data))));
});

app.get('/equiv', (req, res) => {
	res.send(equiv.openBrackets(JSON.parse(decodeURIComponent(req.query.data))));
});
