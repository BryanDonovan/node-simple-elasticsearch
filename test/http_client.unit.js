var EventEmitter = require('events').EventEmitter;
var util = require('util');
var http = require('http');
var assert = require('assert');
var sinon = require('sinon');
var support = require('./support');
var check_err = support.check_err;
var http_client = require('../lib/http_client');

function get_options() {
    return {
        host: 'localhost',
        port: '8080',
        protocol: 'http'
    };
}

function FakeReq() {}
util.inherits(FakeReq, EventEmitter);
FakeReq.prototype.setHeader = function () {};

function FakeRes() {}
util.inherits(FakeRes, EventEmitter);

describe("http_client.js", function () {
    var client;

    describe("instantiating", function () {
        context("when no args passed in", function () {
            beforeEach(function () {
                client = http_client();
            });

            it("sets host to 'localhost'", function () {
                assert.equal(client.host, 'localhost');
            });

            it("sets port to 80", function () {
                assert.strictEqual(client.port, 80);
            });

            it("sets protocol to http", function () {
                assert.strictEqual(client.protocol, 'http');
            });
        });

        it("lets us set the http protocol", function () {
            var client = http_client({protocol: 'https'});
            assert.equal(client.protocol, 'https');
        });

        it("lets us set the port", function () {
            var client = http_client({port: 59482});
            assert.equal(client.port, 59482);
        });

        it("lets us set the host", function () {
            var client = http_client({host: 'foo'});
            assert.equal(client.host, 'foo');
        });
    });

    describe("request()", function () {
        var req_args;

        beforeEach(function () {
            client = http_client(get_options());
            req_args = {path: 'foo'};
        });

        it("calls back with error when no args passed in", function (done) {
            client.request(null, function (err) {
                assert.ok(err.message.match(/args required/));
                done();
            });
        });

        describe("normal processing", function () {
            var fake_req;

            beforeEach(function () {
                var fake_res = new FakeRes();

                FakeReq.prototype.end = function () {
                    this.emit('response', fake_res);
                    fake_res.emit('end');
                };

                fake_req = new FakeReq();

                sinon.spy(fake_req, 'end');
                sinon.stub(http, 'request').returns(fake_req);
            });

            afterEach(function () {
                http.request.restore();
                fake_req.end.restore();
            });

            it("appends params to path as querystring", function (done) {
                client.request({path: 'mypath', params: {foo: 'bar', blah: 'buzz'}}, function (err) {
                    check_err(err);
                    assert.ok(http.request.calledWithMatch({path: '/mypath?foo=bar&blah=buzz'}));

                    client.request({path: 'mypath?zip=zoot', params: {foo: 'bar', blah: 'buzz'}}, function (err) {
                        check_err(err);
                        assert.ok(http.request.calledWithMatch({path: '/mypath?zip=zoot&foo=bar&blah=buzz'}));
                        done();
                    });
                });
            });

            describe("when body is passed in as a string", function () {
                it("uses that string as the body without passing it to JSON.stringify()", function (done) {
                    sinon.spy(JSON, 'stringify');

                    client.request({method: 'POST', body: 'foo'}, function (err) {
                        check_err(err);
                        assert.ok(fake_req.end.calledWith('foo'));
                        assert.ok(JSON.stringify.notCalled);
                        JSON.stringify.restore();
                        done();
                    });
                });
            });

            describe("when body is passed in as an object", function () {
                it("it stringifies the object", function (done) {
                    sinon.spy(JSON, 'stringify');

                    client.request({method: 'POST', body: {foo: 'bar'}}, function (err) {
                        check_err(err);
                        assert.ok(fake_req.end.calledWith('{"foo":"bar"}'));
                        assert.ok(JSON.stringify.called);
                        JSON.stringify.restore();
                        done();
                    });
                });
            });

            var methods = ['POST', 'PUT', 'DELETE'];

            methods.forEach(function (method) {
                describe("when no body is passed in during " + method, function () {
                    it("sets a content-length of 0", function (done) {
                        sinon.spy(fake_req, 'setHeader');

                        client.request({method: method, path: '/foo'}, function (err) {
                            check_err(err);
                            assert.ok(fake_req.setHeader.calledWith('Content-Length', 0));
                            fake_req.setHeader.restore();
                            done();
                        });
                    });
                });
            });

            it("does not set a content-length in GET requests", function (done) {
                sinon.spy(fake_req, 'setHeader');

                client.request({method: 'GET', path: '/foo'}, function (err) {
                    check_err(err);
                    assert.ok(fake_req.setHeader.neverCalledWith('Content-Length'));
                    fake_req.setHeader.restore();
                    done();
                });
            });

            describe("when auth params are passed in", function () {
                it("adds the HTTP Authorization Basic header ", function (done) {
                    var options = get_options();
                    options.auth = {username: 'foo', password: 'bar'};
                    client = http_client(options);

                    sinon.spy(fake_req, 'setHeader');

                    client.request({method: 'GET', path: '/foo'}, function (err) {
                        check_err(err);
                        var expected_auth_header = "Basic " + new Buffer(options.auth.username + ":" + options.auth.password).toString('base64');
                        assert.ok(fake_req.setHeader.calledWith('Authorization', expected_auth_header));
                        fake_req.setHeader.restore();
                        done();
                    });
                });
            });
        });

        describe("error handling", function () {
            var fake_err;

            context("when request emits an error", function () {
                beforeEach(function () {
                    fake_err = support.fake_error();
                    FakeReq.prototype.end = function () {
                        this.emit('error', fake_err);
                    };

                    var fake_req = new FakeReq();
                    sinon.stub(http, 'request').returns(fake_req);
                });

                afterEach(function () {
                    http.request.restore();
                });

                it("calls back with that error", function (done) {
                    client.request(req_args, function (err) {
                        assert.ok(http.request.called);
                        assert.equal(err, fake_err);
                        done();
                    });
                });

                it("does not call back twice", function (done) {
                    client.request(req_args, function () {
                        done();
                    });
                });
            });

            context("when response emits an error", function () {
                beforeEach(function () {
                    fake_err = support.fake_error();
                    var fake_res = new FakeRes();

                    FakeReq.prototype.end = function () {
                        this.emit('response', fake_res);
                        fake_res.emit('error', fake_err);
                    };

                    var fake_req = new FakeReq();
                    sinon.stub(http, 'request').returns(fake_req);
                });

                afterEach(function () {
                    http.request.restore();
                });

                it("calls back with that error", function (done) {
                    client.request(req_args, function (err) {
                        assert.equal(err, fake_err);
                        done();
                    });
                });

                it("does not call back twice", function (done) {
                    client.request(req_args, function () {
                        done();
                    });
                });
            });

            context("when response emits an error after emitting 'end'", function () {
                var fake_data;

                beforeEach(function () {
                    fake_err = support.fake_error();
                    fake_data = support.random.string();

                    var fake_res = new FakeRes();

                    FakeReq.prototype.end = function () {
                        this.emit('response', fake_res);
                        fake_res.emit('data', fake_data);
                        fake_res.emit('end');
                        fake_res.emit('error', fake_err);
                    };

                    var fake_req = new FakeReq();
                    sinon.stub(http, 'request').returns(fake_req);
                });

                afterEach(function () {
                    http.request.restore();
                });

                it("calls back with data and not the error", function (done) {
                    client.request(req_args, function (err, result) {
                        check_err(err);
                        assert.equal(result, fake_data);
                        done();
                    });
                });

                it("does not call back twice", function (done) {
                    client.request(req_args, function () {
                        done();
                    });
                });
            });

            context("when response emits an error before emitting 'end'", function () {
                var fake_data;

                beforeEach(function () {
                    fake_err = support.fake_error();
                    fake_data = support.random.string();

                    var fake_res = new FakeRes();

                    FakeReq.prototype.end = function () {
                        this.emit('response', fake_res);
                        fake_res.emit('data', fake_data);
                        fake_res.emit('error', fake_err);
                        fake_res.emit('end');
                    };

                    var fake_req = new FakeReq();
                    sinon.stub(http, 'request').returns(fake_req);
                });

                afterEach(function () {
                    http.request.restore();
                });

                it("calls back with the error", function (done) {
                    client.request(req_args, function (err) {
                        assert.equal(err, fake_err);
                        done();
                    });
                });

                it("does not call back twice", function (done) {
                    client.request(req_args, function () {
                        done();
                    });
                });
            });

            context("when request emits an error after response emits 'end'", function () {
                var fake_data;

                beforeEach(function () {
                    fake_err = support.fake_error();
                    fake_data = support.random.string();

                    var fake_res = new FakeRes();

                    FakeReq.prototype.end = function () {
                        this.emit('response', fake_res);
                        fake_res.emit('data', fake_data);
                        fake_res.emit('end');
                        fake_req.emit('error', fake_err);
                    };

                    var fake_req = new FakeReq();
                    sinon.stub(http, 'request').returns(fake_req);
                });

                afterEach(function () {
                    http.request.restore();
                });

                it("calls back with data an not the error", function (done) {
                    client.request(req_args, function (err, result) {
                        check_err(err);
                        assert.equal(result, fake_data);
                        done();
                    });
                });

                it("does not call back twice", function (done) {
                    client.request(req_args, function () {
                        done();
                    });
                });
            });
        });
    });
});
