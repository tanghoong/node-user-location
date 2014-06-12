var port      = 8080;
var express   = require("express");
var app       = express();
var server    = require("http").createServer(app);
var io        = require("socket.io").listen(server);
var geoip     = require("geoip-lite");
var countries = require("country-data").countries;
var sqlite3   = require("sqlite3").verbose();

server.listen(port);
console.log("Listening on port " + port);

// For static contents
app.use(express.static(__dirname + "/static"));
// GET request
app.get("/", function (req, res) {
	res.sendfile(__dirname + "/map.html");
});
app.get("/new_user", function (req, res) {
	var data = {};
	data.user = "Unknown User";
	data.type = "";
	data.cc   = "Unknown Location";
	// Sqlite3 user table lookup
	var db = new sqlite3.Database(__dirname + "/db/user.sq3", sqlite3.OPEN_READONLY);
	db.serialize(function() {
		db.each("SELECT users.firstname, roles.name, roles.is_internal FROM users,roles WHERE users.id = '" + req.query.user + "' AND roles.id = users.role_id", function(err, row) {
			data.user     = row.firstname;
			data.type     = row.name;
			data.internal = row.is_internal;
		}, function() {
			if(req.query.ip != null) {
				// Geo lookup
				ip  = req.query.ip;
				geo = geoip.lookup(ip);
				if(geo.ll != null) {
					data.lat = geo.ll[0];
					data.lon = geo.ll[1];
					if(geo.country != null) {
						eval("data.cc = countries." + geo.country + ".name;");
					}
					io.sockets.emit("updateMap", data);
				}
			}
		});
	});
	db.close();
	// HTTP Response
	res.sendfile(__dirname + "/1x1.html");
});
// Socket.io
io.sockets.on("connection", function (socket) {
	// When the user disconnects
	socket.on("disconnect", function() {});
});