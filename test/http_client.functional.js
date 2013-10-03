var url = require('url');
var http = require('http');
var assert = require('assert');
var sinon = require('sinon');
var support = require('./support');
var check_err = support.check_err;
var http_client = require('../lib/http_client');
var logger = support.fake_logger;

var level = 'info';

function get_options() {
    return {
        host: 'localhost',
        port: 8080,
        protocol: 'http'
    };
}

function get_logging_options() {
    return {
        logger: logger,
        level: level,
        events: []
    };
}

var request_listener = function (req, res) {
    var pathname = url.parse(req.url).pathname;

    if (pathname === '/timeout') {
        setTimeout(function () {
            res.writeHead(200);
            res.end('Hello');
        }, 60);
    } else {
        res.writeHead(200);
        res.end('Hello');
    }
};

describe("http_client.js - functional tests", function () {
    var client;

    describe("request()", function () {
        var server;

        before(function () {
            var server_options = get_options();
            server = http.createServer(request_listener);
            server.listen(server_options.port);
        });

        after(function () {
            server.close();
        });

        describe("when a timeout is set", function () {
            it("returns an error after the timeout duration has passed", function (done) {
                var server_options = get_options();
                server_options.timeout = 50;
                client = http_client(server_options);

                client.request({path: '/timeout'}, function (err) {
                    assert.ok(err.message.match(/timed out.*50/));
                    done();
                });
            });
        });

        describe("when logger is available", function () {
            var options;
            var logging_options;

            beforeEach(function () {
                options = get_options();
                logging_options = get_logging_options();
                sinon.stub(logger, level);
            });

            afterEach(function () {
                logger[level].restore();
            });

            describe("and request logging is enabled", function () {
                beforeEach(function () {
                    logging_options.events = ['request'];
                    options.logging = logging_options;
                    client = http_client(options);
                });

                it("logs GET requests", function (done) {
                    client.request({method: 'GET', path: '/hello', params: {foo: 'bar'}}, function (err) {
                        check_err(err);
                        var expected_msg = "Elasticsearch request: GET http://localhost:8080/hello?foo=bar";
                        assert.ok(logger[level].calledWith(expected_msg));
                        done();
                    });
                });

                it("logs POST requests", function (done) {
                    var body = JSON.stringify({foo: 'bar', zoo: 'zip'});

                    client.request({method: 'POST', path: '/hello', body: body}, function (err) {
                        check_err(err);
                        var expected_msg = "Elasticsearch request: POST http://localhost:8080/hello body: " + body;
                        assert.ok(logger[level].calledWith(expected_msg));
                        done();
                    });
                });
            });

            describe("and request logging format is 'curl'", function () {
                var expected_auth_header;

                beforeEach(function () {
                    logging_options.events = ['request'];
                    logging_options.formatters = {request: 'curl'};
                    options.logging = logging_options;
                    options.auth = {username: 'foo', password: 'bar'};
                    client = http_client(options);
                    expected_auth_header = "Basic " + new Buffer(options.auth.username + ":" + options.auth.password).toString('base64');
                });

                it("logs GET requests in cURL format", function (done) {
                    client.request({method: 'GET', path: '/hello', params: {foo: 'bar'}}, function (err) {
                        check_err(err);
                        var expected_msg = '\n\ncurl -XGET "http://localhost:8080/hello?foo=bar" -H "authorization: ' + expected_auth_header + '"';
                        var msg = "\nExpected: " + JSON.stringify(expected_msg) + "\nGot: " + JSON.stringify(logger[level].args, false, 4);
                        assert.ok(logger[level].calledWith(expected_msg), msg);
                        done();
                    });
                });

                it("logs POST requests in cURL format", function (done) {
                    var body = JSON.stringify({foo: 'bar', zoo: 'zip'});

                    client.request({method: 'POST', path: '/hello', body: body}, function (err) {
                        check_err(err);
                        var expected_msg = '\n\ncurl -XPOST "http://localhost:8080/hello" -H "authorization: Basic Zm9vOmJhcg=="' +
                            ' -H "content-type: application/json" -H "content-length: 25" -d \'{"foo":"bar","zoo":"zip"}\'';
                        var msg = "\nExpected: " + JSON.stringify(expected_msg) + "\nGot: " + JSON.stringify(logger[level].args, false, 4);
                        assert.ok(logger[level].calledWith(expected_msg), msg);
                        done();
                    });
                });
            });

            describe("and response logging is enabled", function () {
                beforeEach(function () {
                    logging_options.events = ['response'];
                    options.logging = logging_options;
                    client = http_client(options);
                });

                it("logs GET responses", function (done) {
                    client.request({method: 'GET', path: '/hello', params: {foo: 'bar'}}, function (err, result) {
                        check_err(err);
                        assert.ok(result);
                        var expected_msg = "Elasticsearch response: 200 " +  result;
                        assert.ok(logger[level].calledWith(expected_msg));
                        done();
                    });
                });

                it("logs POST requests", function (done) {
                    var body = JSON.stringify({foo: 'bar', zoo: 'zip'});

                    client.request({method: 'POST', path: '/hello', body: body}, function (err, result) {
                        check_err(err);
                        assert.ok(result);
                        var expected_msg = "Elasticsearch response: 200 " +  result;
                        assert.ok(logger[level].calledWith(expected_msg));
                        done();
                    });
                });
            });
        });
    });
});
