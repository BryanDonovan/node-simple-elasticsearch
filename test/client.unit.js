var assert = require('assert');
var support = require('./support');
var check_err = support.check_err;
var simple_es = require('../index');

var server_options = {
    host: 'localhost',
    port: 9200
};

var index_name = 'simple-elasticsearch-test';
var type = 'foo';

function create_doc() {
    return {name: support.random.string(), description: support.random.string()};
}

describe("client.js", function () {
    describe("instantiating", function () {
        it("doesn't blow up when no args passed in", function () {
            simple_es.client.create();
        });
    });

    describe("admin methods", function () {
        var client;

        before(function () {
            client = simple_es.client.create(server_options);
        });

        describe("indices", function () {
            describe("status()", function () {
                context("when 'index' arg passed in ", function () {
                    it("returns status for that index", function (done) {
                        client.indices.status({index: index_name}, function (err, result) {
                            check_err(err);
                            assert.strictEqual(result.ok, true);
                            assert.ok(result.indices[index_name]);

                            var expected_keys = ['translog', 'docs', 'merges', 'refresh', 'flush', 'shards'];
                            expected_keys.forEach(function (key) {
                                assert.ok(result.indices[index_name].hasOwnProperty(key));
                            });

                            done();
                        });
                    });
                });

                context("when no 'index' arg passed in", function () {
                    it.skip("returns all index statuses", function (done) {
                        client.indices.status(index_name, function (err, result) {
                            check_err(err);
                            assert.strictEqual(result.ok, true);
                            done();
                        });
                    });
                });
            });

            describe("del()", function () {
            });

            describe("create()", function () {
            });
        });
    });

    describe("main instance methods", function () {
        var client;

        before(function () {
            client = simple_es.client.create(server_options);
        });

        describe("index()", function () {
            context("when no doc passed in", function () {
                it("returns an error", function (done) {
                    client.index({index: index_name, type: type}, function (err) {
                        assert.ok(err.message.match(/requires.*doc/));
                        done();
                    });
                });
            });

            context("when no id passed in", function () {
                it("adds object to index", function (done) {
                    var doc = create_doc();
                    client.index({index: index_name, type: type, doc: doc}, function (err, result) {
                        check_err(err);
                        assert.strictEqual(result.ok, true);
                        done();
                    });
                });
            });

            context("when id is passed in", function () {
                it("adds object to index with specified id", function (done) {
                    var doc = create_doc();
                    var id = support.random.number();

                    client.index({index: index_name, type: type, doc: doc, id: id}, function (err, result) {
                        check_err(err);
                        assert.strictEqual(result.ok, true);
                        assert.strictEqual(result._id, id.toString());
                        done();
                    });
                });
            });
        });

        describe("get()", function () {
            var id;

            context("when no id passed in", function () {
                it("returns an error", function (done) {
                    client.get({index: index_name, type: type}, function (err) {
                        assert.ok(err.message.match(/requires.*id/));
                        done();
                    });
                });
            });

            context("when HTTP request returns an error", function () {
                it.skip("bubbles up that error", function (done) {
                    done();
                });
            });

            context("when id is passed in", function () {
                context("and id is not found", function () {
                    it("returns null result", function (done) {
                        var id = support.random.number();

                        client.get({index: index_name, type: type, id: id}, function (err, result, raw) {
                            raw = JSON.parse(raw);
                            assert.strictEqual(raw.exists, false);
                            assert.strictEqual(result, null);
                            check_err(err);
                            done();
                        });
                    });
                });

                context("and id is found", function () {
                    var doc;

                    beforeEach(function (done) {
                        id = support.random.number();
                        doc = create_doc();
                        client.index({index: index_name, type: type, doc: doc, id: id}, done);
                    });

                    it("returns the requested doc", function (done) {
                        client.get({index: index_name, type: type, id: id}, function (err, obj, raw) {
                            check_err(err);
                            raw = JSON.parse(raw);
                            assert.strictEqual(raw.exists, true);
                            assert.strictEqual(raw._id, id.toString());
                            assert.deepEqual(obj, doc);
                            done();
                        });
                    });
                });
            });
        });
    });
});
