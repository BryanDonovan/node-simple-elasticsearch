//var url = require('url');
var http = require('http');
var assert = require('assert');
//var support = require('./support');
var http_client = require('../lib/http_client');

function get_options() {
    return {
        host: 'localhost',
        port: 8080,
        protocol: 'http'
    };
}

var request_listener = function (req, res) {
    //var pathname = url.parse(req.url).pathname;
    //console.log("pathname: " + pathname);
    setTimeout(function () {
        res.writeHead(200);
        res.end('Hello');
    }, 60);
};

describe("http_client.js - functional tests", function () {
    var client;

    describe("when a timeout is set", function () {
        var server;

        before(function () {
            var server_options = get_options();
            server = http.createServer(request_listener);
            server.listen(server_options.port);
        });

        after(function () {
            server.close();
        });

        it("returns an error after the timeout duration has passed", function (done) {
            var server_options = get_options();
            server_options.timeout = 50;
            client = http_client(server_options);

            client.request({path: '/'}, function (err) {
                assert.ok(err.message.match(/timed out.*50/));
                done();
            });
        });
    });
});
