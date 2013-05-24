var assert = require('assert');
//var support = require('./support');

describe("MySuite", function () {
    before(function () {
        // before all tests run
    });

    after(function () {
        // after all tests run
    });

    beforeEach(function () {
        // before each test runs, after before()
    });

    afterEach(function () {
        // after each test runs, before after()
    });

    describe("my_sync_function()", function () {
        it("does stuff", function () {
            assert.ok(true);
        });
    });

    describe("my_async_function()", function () {
        it("does stuff", function (done) {
            assert.ok(true);
            done();
        });
    });
});
