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

    describe("request()", function () {
        var client;

        beforeEach(function () {
            client = simple_es.client.create(server_options);
        });

        it("returns error when no args passed in", function (done) {
            client.request(null, function (err) {
                assert.ok(err.message.match(/args required/));
                done();
            });
        });

        it("allows performing arbitrary HTTP GET requests", function (done) {
            sinon.spy(http_client, 'get');

            var args = {
                path: '_cluster/health',
                qs: {pretty: true}
            };

            client.request(args, function (err) {
                check_err(err);

                var expected_args = {
                    url: client.url + args.path,
                    qs: args.qs
                };

                assert.ok(http_client.get.calledWithMatch(expected_args));
                http_client.get.restore();
                done();
            });
        });

        it("allows performing arbitrary HTTP POST requests", function (done) {
            sinon.spy(http_client, 'post');

            var args = {
                method: 'POST',
                path: '_search',
                body: {
                    query: {
                        term: {user: 'foo'}
                    }
                }
            };

            client.request(args, function (err) {
                check_err(err);

                var expected_args = {
                    url: client.url + args.path,
                    body: JSON.stringify(args.body)
                };

                assert.ok(http_client.post.calledWithMatch(expected_args));
                http_client.post.restore();
                done();
            });
        });
    });

    describe("admin instance methods", function () {
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

                context("when array of indices passed in", function () {
                    var new_index_name1;
                    var new_index_name2;

                    beforeEach(function (done) {
                        new_index_name1 = index_name + support.random.string();
                        new_index_name2 = index_name + support.random.string();

                        client.indices.create({index: new_index_name1, options: {number_of_shards: 1}}, function (err) {
                            check_err(err);
                            client.indices.create({index: new_index_name2, options: {number_of_shards: 1}}, done);
                        });
                    });

                    afterEach(function (done) {
                        client.indices.del({index: new_index_name1}, function (err) {
                            check_err(err);
                            client.indices.del({index: new_index_name2}, done);
                        });
                    });

                    it("returns status for all supplied indices", function (done) {
                        client.indices.status({indices: [new_index_name1, new_index_name2]}, function (err, result) {
                            check_err(err);
                            assert.strictEqual(result.ok, true);
                            var expected_indices = [new_index_name1, new_index_name2].sort;
                            var actual_indices = Object.keys(result.indices).sort;
                            assert.deepEqual(actual_indices, expected_indices);
                            done();
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

                context("when null args passed in", function () {
                    it("returns all index statuses", function (done) {
                        client.indices.status(null, function (err, result) {
                            check_err(err);
                            assert.strictEqual(result.ok, true);
                            done();
                        });
                    });
                });
            });

            describe("del()", function () {
                context("when null args passed in", function () {
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

                context("when index exists", function () {
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

            describe("refresh()", function () {
                context("when index passed in", function () {
                    context("and index does not exist", function () {
                        it("returns result with IndexMissingException and status 404", function (done) {
                            var non_existent_index = index_name + support.random.string(20);
                            client.indices.refresh({index: non_existent_index}, function (err, result) {
                                assert.ok(result.error.match(/IndexMissingException/));
                                assert.strictEqual(result.status, 404);
                                done();
                            });
                        });
                    });

                    context("and index exists", function () {
                        var new_index_name;

                        beforeEach(function (done) {
                            new_index_name = index_name + support.random.string();
                            client.indices.create({index: new_index_name, options: {number_of_shards: 1}}, done);
                        });

                        afterEach(function (done) {
                            client.indices.del({index: new_index_name}, done);
                        });

                        it("refreshes the index", function (done) {
                            client.indices.status({index: new_index_name}, function (err, result) {
                                check_err(err);
                                var initial_refresh_count = result.indices[new_index_name].refresh.total;
                                assert.ok(initial_refresh_count >= 0);

                                client.indices.refresh({index: new_index_name}, function (err, result) {
                                    check_err(err);
                                    assert.strictEqual(result.ok, true);

                                    client.indices.status({index: new_index_name}, function (err, result) {
                                        check_err(err);
                                        var final_refresh_count = result.indices[new_index_name].refresh.total;
                                        assert.ok(final_refresh_count >= initial_refresh_count + 1);
                                        assert.ok(final_refresh_count <= initial_refresh_count + 2);
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });

                context("when array of indexes passed in", function () {
                    var new_index_name1;
                    var new_index_name2;

                    beforeEach(function (done) {
                        new_index_name1 = index_name + support.random.string();
                        new_index_name2 = index_name + support.random.string();

                        client.indices.create({index: new_index_name1, options: {number_of_shards: 1}}, function (err) {
                            check_err(err);
                            client.indices.create({index: new_index_name2, options: {number_of_shards: 1}}, done);
                        });
                    });

                    afterEach(function (done) {
                        client.indices.del({index: new_index_name1}, function (err) {
                            check_err(err);
                            client.indices.del({index: new_index_name2}, done);
                        });
                    });

                    it("passes correct args to http client", function (done) {
                        sinon.spy(http_client, 'post');

                        client.indices.refresh({indices: [new_index_name1, new_index_name2]}, function (err) {
                            check_err(err);
                            var expected_url = client.url + new_index_name1 + ',' + new_index_name2 + '/_refresh';
                            assert.ok(http_client.post.calledWithMatch({url: expected_url, method: 'POST'}));
                            http_client.post.restore();
                            done();
                        });
                    });

                    it("refreshes the indices", function (done) {
                        client.indices.status({indices: [new_index_name1, new_index_name2]}, function (err, result) {
                            check_err(err);
                            var initial_refresh_count1 = result.indices[new_index_name1].refresh.total;
                            var initial_refresh_count2 = result.indices[new_index_name2].refresh.total;
                            assert.ok(initial_refresh_count1 >= 0);
                            assert.ok(initial_refresh_count2 >= 0);

                            client.indices.refresh({indices: [new_index_name1, new_index_name2]}, function (err, result) {
                                check_err(err);
                                assert.strictEqual(result.ok, true);

                                client.indices.status({indices: [new_index_name1, new_index_name2]}, function (err, result) {
                                    check_err(err);
                                    var final_refresh_count1 = result.indices[new_index_name1].refresh.total;
                                    var final_refresh_count2 = result.indices[new_index_name2].refresh.total;

                                    assert.ok(final_refresh_count1 >= initial_refresh_count1 + 1, [final_refresh_count1, initial_refresh_count1]);
                                    assert.ok(final_refresh_count1 <= initial_refresh_count1 + 2, [final_refresh_count1, initial_refresh_count1]);
                                    assert.ok(final_refresh_count2 >= initial_refresh_count2 + 1, [final_refresh_count2, initial_refresh_count2]);
                                    assert.ok(final_refresh_count2 <= initial_refresh_count2 + 2, [final_refresh_count2, initial_refresh_count2]);

                                    done();
                                });
                            });
                        });
                    });
                });

                context("when no args passed in", function () {
                    function get_refresh_total(indices) {
                        var total = 0;

                        Object.keys(indices).forEach(function (key) {
                            total += indices[key].refresh.total;
                        });

                        return total;
                    }

                    it("calls refresh api with no index", function (done) {
                        sinon.spy(http_client, 'post');

                        client.indices.refresh(function (err) {
                            check_err(err);
                            var expected_url = client.url + '_refresh';

                            assert.ok(http_client.post.calledWithMatch({url: expected_url}));

                            http_client.post.restore();
                            done();
                        });
                    });

                    it("refreshes all indexes", function (done) {
                        client.indices.status(function (err, result) {
                            check_err(err);
                            var initial_refresh_count = get_refresh_total(result.indices);
                            assert.ok(initial_refresh_count);

                            client.indices.refresh(function (err, result) {
                                check_err(err);
                                assert.strictEqual(result.ok, true);

                                client.indices.status(function (err, result) {
                                    check_err(err);
                                    var final_refresh_count = get_refresh_total(result.indices);
                                    var min_diff = Object.keys(result.indices).length; // at least one refresh per index.
                                    assert.ok(final_refresh_count >= initial_refresh_count + min_diff);
                                    done();
                                });
                            });
                        });
                    });
                });

                context("when null args passed in", function () {
                    it("calls refresh api with no index", function (done) {
                        sinon.spy(http_client, 'post');

                        client.indices.refresh(null, function (err) {
                            check_err(err);
                            var expected_url = client.url + '_refresh';

                            assert.ok(http_client.post.calledWithMatch({url: expected_url}));

                            http_client.post.restore();
                            done();
                        });
                    });
                });
            });
        });
    });

    describe("core instance methods", function () {
        var client;

        before(function () {
            client = simple_es.client.create(server_options);
        });

        describe("index()", function () {
            context("when no args passed in", function () {
                it("returns an error", function (done) {
                    client.core.index(null, function (err) {
                        assert.ok(err.message.match(/args required/));
                        done();
                    });
                });
            });

            context("when no doc passed in", function () {
                it("returns an error", function (done) {
                    client.core.index({index: index_name, type: type}, function (err) {
                        assert.ok(err.message.match(/missing arg: doc/));
                        done();
                    });
                });
            });

            context("when no id passed in", function () {
                it("adds object to index", function (done) {
                    var doc = create_doc();
                    client.core.index({index: index_name, type: type, doc: doc}, function (err, result) {
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

                    client.core.index({index: index_name, type: type, doc: doc, id: id}, function (err, result) {
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
                    client.core.get(null, function (err) {
                        assert.ok(err.message.match(/args required/));
                        done();
                    });
                });
            });

            context("when no id passed in", function () {
                it("returns an error", function (done) {
                    client.core.get({index: index_name, type: type}, function (err) {
                        assert.ok(err.message.match(/missing arg: id/));
                        done();
                    });
                });
            });

            context("when no index passed in", function () {
                it("returns an error", function (done) {
                    client.core.get({type: type, id: support.random.number()}, function (err) {
                        assert.ok(err.message.match(/missing arg: index/));
                        done();
                    });
                });
            });

            context("when no type passed in", function () {
                it("returns an error", function (done) {
                    client.core.get({index: index_name, id: support.random.number()}, function (err) {
                        assert.ok(err.message.match(/missing arg: type/));
                        done();
                    });
                });
            });

            context("when HTTP request returns an error", function () {
                it("bubbles up that error", function (done) {
                    var fake_err = support.fake_error();
                    sinon.stub(http_client, 'get', function (args, cb) {
                        cb(fake_err);
                    });

                    client.core.get({index: index_name, type: type, id: support.random.number()}, function (err) {
                        assert.equal(err, fake_err);
                        http_client.get.restore();
                        done();
                    });
                });
            });

            context("when id is passed in", function () {
                context("and id is not found", function () {
                    it("returns null result", function (done) {
                        var id = support.random.number();

                        client.core.get({index: index_name, type: type, id: id}, function (err, result, raw) {
                            raw = JSON.parse(raw);
                            assert.strictEqual(raw.exists, false, JSON.stringify(raw));
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
                        client.core.index({index: index_name, type: type, doc: doc, id: id}, done);
                    });

                    it("returns the requested doc", function (done) {
                        client.core.get({index: index_name, type: type, id: id}, function (err, obj, raw) {
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

        describe("search()", function () {
            var id;
            var doc;
            var search_args;

            before(function (done) {
                client.indices.create({index: index_name, options: {number_of_shards: 1}}, function (err) {
                    check_err(err);

                    id = support.random.number();
                    doc = create_doc();

                    client.core.index({index: index_name, type: type, doc: doc, id: id}, function (err) {
                        check_err(err);

                        client.indices.refresh({index: index_name}, done);
                    });
                });
            });

            after(function (done) {
                client.indices.del({index: index_name}, done);
            });

            beforeEach(function () {
                search_args = {
                    index: index_name,
                    query: {
                        query: {
                            term: {name: doc.name}
                        }
                    }
                };
            });

            context("when null args passed in", function () {
                it("returns an error", function (done) {
                    client.core.search(null, function (err) {
                        assert.ok(err.message.match(/args required/));
                        done();
                    });
                });

                context("when no index passed in", function () {
                    it("searches against all indexes", function (done) {
                        sinon.spy(http_client, 'post');
                        delete search_args.index;

                        client.core.search(search_args, function (err) {
                            check_err(err);
                            var expected_url = client.url + '_search';
                            assert.ok(http_client.post.calledWithMatch({url: expected_url}));
                            http_client.post.restore();
                            done();
                        });
                    });

                    it("returns correct results", function (done) {
                        delete search_args.index;

                        client.core.search(search_args, function (err, result) {
                            check_err(err);
                            assert.ok(result);
                            assert.strictEqual(result.hits.total, 1);
                            done();
                        });
                    });
                });

                context("when index passed in", function () {
                    it("searches against that index", function (done) {
                        sinon.spy(http_client, 'post');

                        client.core.search(search_args, function (err) {
                            check_err(err);
                            var expected_url = client.url + index_name + '/_search';
                            assert.ok(http_client.post.calledWithMatch({url: expected_url}));
                            http_client.post.restore();
                            done();
                        });
                    });

                    it("returns correct results", function (done) {
                        client.core.search(search_args, function (err, result) {
                            check_err(err);
                            assert.ok(result);
                            assert.strictEqual(result.hits.total, 1);
                            done();
                        });
                    });
                });

                context("when index and type passed in", function () {
                    it("searches against that index and type", function (done) {
                        search_args.type = type;
                        sinon.spy(http_client, 'post');

                        client.core.search(search_args, function (err) {
                            check_err(err);
                            var expected_url = client.url + index_name + '/' + type + '/_search';
                            assert.ok(http_client.post.calledWithMatch({url: expected_url}));
                            http_client.post.restore();
                            done();
                        });
                    });

                    it("returns correct results", function (done) {
                        search_args.type = type;
                        client.core.search(search_args, function (err, result) {
                            check_err(err);
                            assert.ok(result);
                            assert.strictEqual(result.hits.total, 1);
                            done();
                        });
                    });
                });
            });
        });
    });
});
