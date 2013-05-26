var assert = require('assert');
var sinon = require('sinon');
var support = require('./support');
var check_err = support.check_err;
var simple_es = require('../index');
var http_client = require('../lib/http_client');

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
            describe("create()", function () {
                context("when no args passed in", function () {
                    it("returns an error", function (done) {
                        client.indices.create(null, function (err) {
                            assert.ok(err.message.match(/args required/));
                            done();
                        });
                    });
                });

                context("when no index passed in", function () {
                    it("returns an error", function (done) {
                        client.indices.create({}, function (err) {
                            assert.ok(err.message.match(/missing arg: index/));
                            done();
                        });
                    });
                });

                context("when index does not yet exist", function () {
                    var new_index_name;

                    beforeEach(function () {
                        new_index_name = index_name + support.random.string();
                    });

                    afterEach(function (done) {
                        client.indices.del({index: new_index_name}, done);
                    });

                    it("returns success response", function (done) {
                        client.indices.create({index: new_index_name}, function (err, result) {
                            check_err(err);
                            assert.strictEqual(result.ok, true);
                            assert.strictEqual(result.acknowledged, true);
                            done();
                        });
                    });

                    it("creates the new index", function (done) {
                        client.indices.create({index: new_index_name}, function (err) {
                            check_err(err);

                            client.indices.status({index: new_index_name}, function (err, result) {
                                check_err(err);
                                assert.ok(result.indices[new_index_name]);
                                done();
                            });
                        });
                    });

                    it("passes options hash to http request as JSON string", function (done) {
                        sinon.spy(http_client, 'put');

                        var options = {
                            settings: {
                                number_of_shards: 1
                            }
                        };

                        var expected_url = client.url + new_index_name;
                        var expected_json = JSON.stringify(options);

                        client.indices.create({index: new_index_name, options: options}, function (err) {
                            check_err(err);

                            assert.ok(http_client.put.calledWithMatch({url: expected_url, method: 'PUT', body: expected_json}));
                            http_client.put.restore();
                            done();
                        });
                    });
                });
            });

            describe("status()", function () {
                context("when 'index' arg passed in ", function () {
                    context("and index exists", function () {
                        var new_index_name;

                        beforeEach(function (done) {
                            new_index_name = index_name + support.random.string();
                            client.indices.create({index: new_index_name}, done);
                        });

                        afterEach(function (done) {
                            client.indices.del({index: new_index_name}, done);
                        });

                        it("returns status for that index", function (done) {
                            client.indices.status({index: new_index_name}, function (err, result) {
                                check_err(err);
                                assert.strictEqual(result.ok, true);
                                assert.ok(result.indices[new_index_name]);

                                var expected_keys = ['translog', 'docs', 'merges', 'refresh', 'flush', 'shards'];
                                expected_keys.forEach(function (key) {
                                    assert.ok(result.indices[new_index_name].hasOwnProperty(key));
                                });

                                done();
                            });
                        });
                    });

                    context("and index does not exist", function () {
                        it("returns result with IndexMissingException and status 404", function (done) {
                            var non_existent_index = index_name + support.random.string(20);
                            client.indices.status({index: non_existent_index}, function (err, result) {
                                check_err(err);
                                assert.ok(result.error.match(/IndexMissingException/));
                                assert.strictEqual(result.status, 404);
                                done();
                            });
                        });
                    });
                });

                context("when no args passed in", function () {
                    it("returns all index statuses", function (done) {
                        client.indices.status(function (err, result) {
                            check_err(err);
                            assert.strictEqual(result.ok, true);
                            done();
                        });
                    });
                });
            });

            describe("del()", function () {
                context("when no args passed in", function () {
                    it("returns an error", function (done) {
                        client.indices.del(null, function (err) {
                            assert.ok(err.message.match(/args required/));
                            done();
                        });
                    });
                });

                context("when no index passed in", function () {
                    it("returns an error", function (done) {
                        client.indices.del({}, function (err) {
                            assert.ok(err.message.match(/missing arg: index/));
                            done();
                        });
                    });
                });

                context("when index does not exist", function () {
                    it("returns result with IndexMissingException and status 404", function (done) {
                        var non_existent_index = index_name + support.random.string(20);
                        client.indices.del({index: non_existent_index}, function (err, result) {
                            assert.ok(result.error.match(/IndexMissingException/));
                            assert.strictEqual(result.status, 404);
                            done();
                        });
                    });
                });

                context("when index does exist", function () {
                    var new_index_name;

                    beforeEach(function (done) {
                        new_index_name = index_name + support.random.string();
                        client.indices.create({index: new_index_name}, done);
                    });

                    afterEach(function (done) {
                        client.indices.del({index: new_index_name}, done);
                    });

                    it("returns success response", function (done) {
                        client.indices.del({index: new_index_name}, function (err, result) {
                            check_err(err);
                            assert.strictEqual(result.ok, true);
                            assert.strictEqual(result.acknowledged, true);
                            done();
                        });
                    });

                    it("deletes the index", function (done) {
                        client.indices.del({index: new_index_name}, function (err) {
                            check_err(err);

                            client.indices.del({index: new_index_name}, function (err, result) {
                                assert.ok(result.error.match(/IndexMissingException/));
                                assert.strictEqual(result.status, 404);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    describe("main instance methods", function () {
        var client;

        before(function () {
            client = simple_es.client.create(server_options);
        });

        describe("index()", function () {
            context("when no args passed in", function () {
                it("returns an error", function (done) {
                    client.index(null, function (err) {
                        assert.ok(err.message.match(/args required/));
                        done();
                    });
                });
            });

            context("when no doc passed in", function () {
                it("returns an error", function (done) {
                    client.index({index: index_name, type: type}, function (err) {
                        assert.ok(err.message.match(/missing arg: doc/));
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

            context("when no args passed in", function () {
                it("returns an error", function (done) {
                    client.get(null, function (err) {
                        assert.ok(err.message.match(/args required/));
                        done();
                    });
                });
            });

            context("when no id passed in", function () {
                it("returns an error", function (done) {
                    client.get({index: index_name, type: type}, function (err) {
                        assert.ok(err.message.match(/missing arg: id/));
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
