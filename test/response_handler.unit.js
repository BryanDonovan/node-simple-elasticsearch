var assert = require('assert');
var support = require('./support');
var check_err = support.check_err;
var response_handler = require('../lib/response_handler');

describe("elasticsearch/response_handler.js", function () {
    describe("handle()", function () {
        context("when error passed in", function () {
            it("calls back with that error", function (done) {
                var fake_err = new Error(support.random.string());
                response_handler.handle(fake_err, {}, function (err) {
                    assert.equal(err, fake_err);
                    done();
                });
            });
        });

        context("when no error is passed in", function () {
            context("and response is valid JSON", function () {
                it("calls back with the parsed JSON", function (done) {
                    response_handler.handle(null, '{"foo": "bar"}', function (err, result) {
                        check_err(err);
                        assert.deepEqual(result, {foo: 'bar'});
                        done();
                    });
                });
            });

            context("and response is not valid JSON", function () {
                it("calls back with an Error", function (done) {
                    response_handler.handle(null, '{invalid}', function (err) {
                        assert.ok(err.message.match(/parsing.*response/));
                        done();
                    });
                });
            });
        });
    });
});
