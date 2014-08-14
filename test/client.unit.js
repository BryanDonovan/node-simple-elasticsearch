var assert = require('assert');
var sinon = require('sinon');
var support = require('./support');
var check_err = support.check_err;
var simple_es = require('../index');
var validator = require('../lib/validator');

var server_options = {
    host: 'localhost',
    port: 9200
};

var index_name = 'simple-elasticsearch-test';
var type = 'foo';

function create_doc(args) {
    args = args || {};
    return {
        name: args.name || support.random.string(),
        description: args.description || support.random.string()
    };
}

describe("client.js", function () {
    var client;

    before(function (done) {
        client = simple_es.client.create(server_options);
        client.indices.del({index: index_name}, done);
    });

    describe("instantiating", function () {
        context("when no args passed in", function () {
            beforeEach(function () {
                client = simple_es.client.create();
            });

            it("sets default port '9200'", function () {
                assert.strictEqual(client.port, 9200);
            });

            it("sets default host 'localhost'", function () {
                assert.equal(client.host, 'localhost');
            });

            it("sets default protocol 'http'", function () {
                assert.equal(client.protocol, 'http');
            });
        });

        it("lets us set the http protocol", function () {
            var client = simple_es.client.create({protocol: 'https'});
            assert.equal(client.protocol, 'https');
        });

        it("lets us set the port", function () {
            var client = simple_es.client.create({port: 59482});
            assert.equal(client.port, 59482);
        });

        it("lets us set the host", function () {
            var client = simple_es.client.create({host: 'foo'});
            assert.equal(client.host, 'foo');
        });

        it("lets us pass in logging options", function () {
            var logging_options = {
                logger: support.fake_logger,
                level: 'info',
                log_requests: true,
                log_responses: true
            };

            var client = simple_es.client.create({logging: logging_options});
            assert.deepEqual(client.logging, logging_options);
        });

        it("sets http_client.values", function () {
            var client = simple_es.client.create({protocol: 'https', host: 'foo', port: 99999, logging: {foo: 'bar'}});
            assert.equal(client.http_client.protocol, 'https');
            assert.equal(client.http_client.host, 'foo');
            assert.equal(client.http_client.port, 99999);
            assert.ok(client.http_client.logging.foo, 'bar');
        });
    });

    describe("request()", function () {
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
            sinon.spy(client.http_client, 'get');

            var args = {
                path: '_cluster/health',
                params: {pretty: true}
            };

            client.request(args, function (err) {
                check_err(err);

                var expected_args = {
                    path: args.path,
                    params: args.params
                };

                assert.ok(client.http_client.get.calledWithMatch(expected_args));
                client.http_client.get.restore();
                done();
            });
        });

        it("allows performing arbitrary HTTP POST requests", function (done) {
            sinon.spy(client.http_client, 'post');

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
                    path: args.path,
                    body: JSON.stringify(args.body)
                };

                assert.ok(client.http_client.post.calledWithMatch(expected_args));
                client.http_client.post.restore();
                done();
            });
        });

        it("allows making HTTP requests with basic auth", function (done) {
            var options = support.shallow_clone(server_options);
            options.auth = {
                username: 'foo',
                password: 'bar'
            };

            client = simple_es.client.create(options);

            sinon.spy(client.http_client, 'get');

            var args = {
                path: '_cluster/health',
                params: {pretty: true}
            };

            client.request(args, function () {
                var expected_args = {
                    path: args.path,
                    params: args.params,
                    auth: options.auth
                };

                assert.ok(client.http_client.get.calledWithMatch(expected_args));

                client.http_client.get.restore();
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
                        sinon.spy(client.http_client, 'put');

                        var options = {
                            settings: {
                                number_of_shards: 1
                            }
                        };

                        var expected_json = JSON.stringify(options);

                        client.indices.create({index: new_index_name, options: options}, function (err) {
                            check_err(err);

                            var expected_args = {path: new_index_name, method: 'PUT', body: expected_json};
                            assert.ok(client.http_client.put.calledWithMatch(expected_args));
                            client.http_client.put.restore();
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

                                var expected_keys = ['merges', 'refresh', 'flush', 'shards'];
                                expected_keys.forEach(function (key) {
                                    var msg = "\nExpected keys to include " + key +
                                        "\nGot: " + JSON.stringify(Object.keys(result.indices[new_index_name]));
                                    assert.ok(result.indices[new_index_name].hasOwnProperty(key), msg);
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
                            var expected_indices = [new_index_name1, new_index_name2].sort();
                            var actual_indices = Object.keys(result.indices).sort();
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
                        sinon.spy(client.http_client, 'post');

                        client.indices.refresh({indices: [new_index_name1, new_index_name2]}, function (err) {
                            check_err(err);
                            var expected_path = new_index_name1 + ',' + new_index_name2 + '/_refresh';
                            assert.ok(client.http_client.post.calledWithMatch({path: expected_path, method: 'POST'}));
                            client.http_client.post.restore();
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

                                setTimeout(function () {
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
                                }, 100);
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
                        sinon.spy(client.http_client, 'post');

                        client.indices.refresh(function (err) {
                            check_err(err);

                            assert.ok(client.http_client.post.calledWithMatch({path: '_refresh'}));

                            client.http_client.post.restore();
                            done();
                        });
                    });

                    it("refreshes all indexes", function (done) {
                        client.indices.status(function (err, result) {
                            check_err(err);
                            var initial_refresh_count = get_refresh_total(result.indices);
                            assert.ok(initial_refresh_count >= 0);

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
                        sinon.spy(client.http_client, 'post');

                        client.indices.refresh(null, function (err) {
                            check_err(err);

                            assert.ok(client.http_client.post.calledWithMatch({path: '_refresh'}));

                            client.http_client.post.restore();
                            done();
                        });
                    });
                });
            });

            describe("mapping methods", function () {
                var mapping;

                before(function (done) {
                    client.indices.create({index: index_name}, done);
                });

                after(function (done) {
                    client.indices.del({index: index_name}, done);
                });

                beforeEach(function () {
                    mapping = {
                        user_mapping: {
                            properties: {
                                name: {type: "string", store: "yes"}
                            }
                        }
                    };
                });

                describe("update()", function () {
                    it("requires presence of index, type, and mapping args", function (done) {
                        sinon.spy(validator, 'validate_args');

                        var args = {};
                        client.indices.mappings.update(args, function (err) {
                            assert.ok(validator.validate_args.calledWith(args, ['index', 'type', 'mapping']));
                            assert.ok(err.message.match(/missing arg/));
                            validator.validate_args.restore();
                            done();
                        });
                    });

                    context("when index does not exist", function () {
                        it("returns result with IndexMissingException and status 404", function (done) {
                            var non_existent_index = index_name + support.random.string(20);
                            client.indices.mappings.update({index: non_existent_index, type: type, mapping: mapping}, function (err, result) {
                                assert.ok(result.error.match(/IndexMissingException/));
                                assert.strictEqual(result.status, 404);
                                done();
                            });
                        });
                    });

                    context("when type does not exist", function () {
                        it("returns success response", function (done) {
                            client.indices.mappings.update({index: index_name, type: support.random.string(), mapping: mapping}, function (err, result) {
                                assert.strictEqual(result.ok, true);
                                assert.strictEqual(result.acknowledged, true);
                                done();
                            });
                        });
                    });

                    context("and index exists", function () {
                        it("returns success response", function (done) {
                            client.indices.mappings.update({index: index_name, type: type, mapping: mapping}, function (err, result) {
                                check_err(err);
                                assert.strictEqual(result.ok, true);
                                assert.strictEqual(result.acknowledged, true);
                                done();
                            });
                        });
                    });

                    context("when mapping object is malformed", function () {
                        it("returns an error", function (done) {
                            mapping = {foo: 'fake'};
                            client.indices.mappings.update({index: index_name, type: type, mapping: mapping}, function (err) {
                                assert.ok(err);
                                done();
                            });
                        });
                    });
                });

                describe("del()", function () {
                    it("requires presence of index and type args", function (done) {
                        sinon.spy(validator, 'validate_args');

                        var args = {};
                        client.indices.mappings.del(args, function (err) {
                            assert.ok(validator.validate_args.calledWith(args, ['index', 'type']));
                            assert.ok(err.message.match(/missing arg/));
                            validator.validate_args.restore();
                            done();
                        });
                    });

                    context("when index does not exist", function () {
                        it("returns result with IndexMissingException and status 404", function (done) {
                            var non_existent_index = index_name + support.random.string(20);
                            client.indices.mappings.del({index: non_existent_index, type: type}, function (err, result) {
                                assert.ok(result.error.match(/IndexMissingException/));
                                assert.strictEqual(result.status, 404);
                                done();
                            });
                        });
                    });

                    context("when index exists", function () {
                        beforeEach(function (done) {
                            client.indices.mappings.update({index: index_name, type: type, mapping: mapping}, done);
                        });

                        it("returns success response", function (done) {
                            client.indices.mappings.del({index: index_name, type: type}, function (err, result) {
                                check_err(err);
                                assert.strictEqual(result.ok, true);
                                done();
                            });
                        });
                    });
                });

                describe("get()", function () {
                    it("requires presence of index and type args", function (done) {
                        sinon.spy(validator, 'validate_args');

                        var args = {};
                        client.indices.mappings.get(args, function (err) {
                            assert.ok(validator.validate_args.calledWith(args, ['index', 'type']));
                            assert.ok(err.message.match(/missing arg/));
                            validator.validate_args.restore();
                            done();
                        });
                    });

                    context("when index passed in", function () {
                        context("and index does not exist", function () {
                            it("returns result with IndexMissingException and status 404", function (done) {
                                var non_existent_index = index_name + support.random.string(20);
                                client.indices.mappings.get({index: non_existent_index, type: type}, function (err, result) {
                                    assert.ok(result.error.match(/IndexMissingException/));
                                    assert.strictEqual(result.status, 404);
                                    done();
                                });
                            });
                        });

                        context("and index exists", function () {
                            context("and mapping does not exist", function () {
                                beforeEach(function (done) {
                                    client.indices.mappings.del({index: index_name, type: type}, done);
                                });

                                it("returns a result with TypeMissingException and status 404", function (done) {
                                    client.indices.mappings.get({index: index_name, type: type}, function (err, result) {
                                        check_err(err);
                                        assert.ok(result.error.match(/TypeMissingException/));
                                        assert.strictEqual(result.status, 404);
                                        done();
                                    });
                                });
                            });

                            context("and mapping exists", function () {
                                beforeEach(function (done) {
                                    client.indices.mappings.update({index: index_name, type: type, mapping: mapping}, done);
                                });

                                it("returns mapping info", function (done) {
                                    client.indices.mappings.get({index: index_name, type: type}, function (err, result) {
                                        check_err(err);
                                        assert.ok(result[type]);
                                        assert.ok(result[type].properties.name);
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe("core instance methods", function () {
        var client;

        before(function (done) {
            client = simple_es.client.create(server_options);
            client.indices.create({index: index_name}, done);
        });

        describe("index()", function () {
            context("when no doc passed in", function () {
                it("returns an error", function (done) {
                    client.core.index({index: index_name, type: type}, function (err) {
                        assert.ok(err.message.match(/missing arg: doc/));
                        done();
                    });
                });
            });

            context("when no index passed in", function () {
                it("returns an error", function (done) {
                    client.core.index({type: type, doc: {foo: 'bar'}}, function (err) {
                        assert.ok(err.message.match(/missing arg: index/));
                        done();
                    });
                });
            });

            context("when no type passed in", function () {
                it("returns an error", function (done) {
                    client.core.index({index: index_name, doc: {foo: 'bar'}}, function (err) {
                        assert.ok(err.message.match(/missing arg: type/));
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

                it("uses default index if available and no override passed in", function (done) {
                    var options = support.shallow_clone(server_options);
                    options.index = index_name;
                    var client = simple_es.client.create(options);
                    var doc = create_doc();
                    var id = support.random.number();

                    client.core.index({type: type, doc: doc, id: id}, function (err, result) {
                        check_err(err);
                        assert.strictEqual(result.ok, true);
                        done();
                    });
                });
            });
        });

        describe("get()", function () {
            var id;

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
                    sinon.stub(client.http_client, 'get', function (args, cb) {
                        cb(fake_err);
                    });

                    client.core.get({index: index_name, type: type, id: support.random.number()}, function (err) {
                        assert.equal(err, fake_err);
                        client.http_client.get.restore();
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

                it("uses default index if available and no override passed in", function (done) {
                    var options = support.shallow_clone(server_options);
                    options.index = index_name;
                    var client = simple_es.client.create(options);
                    var id = support.random.number();
                    var doc = create_doc();

                    client.core.index({type: type, doc: doc, id: id}, function (err) {
                        check_err(err);

                        client.core.get({type: type, id: id}, function (err, obj) {
                            check_err(err);
                            assert.deepEqual(obj, doc);
                            done();
                        });
                    });
                });
            });
        });

        describe("del()", function () {
            context("when no id passed in", function () {
                it("returns an error", function (done) {
                    client.core.del({index: index_name, type: type}, function (err) {
                        assert.ok(err.message.match(/missing arg: id/));
                        done();
                    });
                });
            });

            context("when no index passed in", function () {
                it("returns an error", function (done) {
                    client.core.del({type: type, id: support.random.number()}, function (err) {
                        assert.ok(err.message.match(/missing arg: index/));
                        done();
                    });
                });
            });

            context("when no type passed in", function () {
                it("returns an error", function (done) {
                    client.core.del({index: index_name, id: support.random.number()}, function (err) {
                        assert.ok(err.message.match(/missing arg: type/));
                        done();
                    });
                });
            });

            context("when HTTP request returns an error", function () {
                it("bubbles up that error", function (done) {
                    var fake_err = support.fake_error();
                    sinon.stub(client.http_client, 'del', function (args, cb) {
                        cb(fake_err);
                    });

                    client.core.del({index: index_name, type: type, id: support.random.number()}, function (err) {
                        assert.equal(err, fake_err);
                        client.http_client.del.restore();
                        done();
                    });
                });
            });

            context("when id is passed in", function () {
                context("and id is not found", function () {
                    it("returns ok=true and found=false", function (done) {
                        client.core.del({index: index_name, type: type, id: support.random.number()}, function (err, result) {
                            check_err(err);
                            assert.strictEqual(result.ok, true);
                            assert.strictEqual(result.found, false);
                            done();
                        });
                    });
                });

                context("and id is found", function () {
                    it("returns ok=true and found=true", function (done) {
                        var id = support.random.number();
                        var doc = create_doc();
                        client.core.index({index: index_name, type: type, doc: doc, id: id}, function (err) {
                            check_err(err);

                            client.core.del({index: index_name, type: type, id: id}, function (err, result) {
                                check_err(err);
                                assert.strictEqual(result.ok, true);
                                assert.strictEqual(result.found, true);
                                done();
                            });
                        });
                    });
                });

                it("uses default index if available and no override passed in", function (done) {
                    var options = support.shallow_clone(server_options);
                    options.index = index_name;
                    var client = simple_es.client.create(options);
                    var id = support.random.number();

                    client.core.del({type: type, id: id}, function (err, result) {
                        check_err(err);
                        assert.strictEqual(result.ok, true);
                        done();
                    });
                });
            });
        });

        describe("search()", function () {
            var doc1;
            var doc2;
            var ids;
            var prefix;
            var search_args;

            before(function (done) {
                ids = [];

                client.indices.del({index: index_name}, function (err) {
                    check_err(err);
                    client.indices.create({index: index_name, options: {number_of_shards: 1}}, function (err) {
                        check_err(err);

                        var mapping = {
                            foo: {
                                _source: {
                                    includes: [
                                        '*'
                                    ]
                                },
                                properties: {
                                    name: {type: 'string', store: 'yes'}
                                }
                            }
                        };

                        client.indices.mappings.update({index: index_name, type: type, mapping: mapping}, function (err) {
                            check_err(err);

                            prefix = support.random.string();

                            doc1 = create_doc({name: prefix + support.random.string()});
                            doc2 = create_doc({name: prefix + support.random.string()});

                            client.core.index({index: index_name, type: type, doc: doc1}, function (err, result) {
                                ids.push(result._id);
                                check_err(err);

                                client.core.index({index: index_name, type: type, doc: doc2}, function (err, result) {
                                    check_err(err);
                                    ids.push(result._id);

                                    client.indices.refresh({index: index_name}, function (err, result) {
                                        check_err(err);
                                        assert.ok(result.ok);
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });

            after(function (done) {
                client.indices.del({index: index_name}, done);
            });

            beforeEach(function () {
                search_args = {
                    index: index_name,
                    search: {
                        query: {
                            prefix: {name: prefix}
                        }
                    }
                };
            });

            context("when null args passed in", function () {
                it("searches across all indexes", function (done) {
                    client.core.search(null, function (err, result, raw) {
                        check_err(err);
                        raw = JSON.parse(raw);
                        assert.ok(raw.hits);
                        done();
                    });
                });
            });

            context("when malformed query passed in", function () {
                beforeEach(function () {
                    search_args = {
                        index: index_name,
                        search: {
                            query: {
                                malformed: {name: prefix}
                            }
                        }
                    };
                });

                it("returns an error", function (done) {
                    client.core.search(search_args, function (err) {
                        assert.ok(err.message.match(/ElasticsearchError/));
                        done();
                    });
                });

                it("catches JSON parse errors", function (done) {
                    sinon.stub(client, 'request', function (args, cb) {
                        cb(null, null, '{"bad_json..}');
                    });

                    client.core.search(search_args, function (err) {
                        assert.ok(err.message.match(/ElasticsearchError.*JSON/));
                        client.request.restore();
                        done();
                    });
                });

                context("when HTTP request does not return 'raw'", function () {
                    it("it returns a JSON parse error", function (done) {
                        sinon.stub(client, 'request', function (args, cb) {
                            cb(null, null, null);
                        });

                        client.core.search(search_args, function (err) {
                            assert.ok(err.message.match(/ElasticsearchError.*JSON/));
                            client.request.restore();
                            done();
                        });
                    });
                });
            });

            context("when HTTP request returns an error", function () {
                it("bubbles up that error", function (done) {
                    var fake_err = support.fake_error();
                    sinon.stub(client.http_client, 'post', function (args, cb) {
                        cb(fake_err);
                    });

                    client.core.search(search_args, function (err) {
                        assert.equal(err, fake_err);
                        client.http_client.post.restore();
                        done();
                    });
                });
            });

            context("when no index passed in", function () {
                it("searches against all indexes", function (done) {
                    sinon.spy(client.http_client, 'post');
                    delete search_args.index;

                    client.core.search(search_args, function (err) {
                        check_err(err);
                        assert.ok(client.http_client.post.calledWithMatch({path: '_search'}));
                        client.http_client.post.restore();
                        done();
                    });
                });

                context("it returns an object with:", function () {
                    it("array of matching ids", function (done) {
                        delete search_args.index;

                        client.core.search(search_args, function (err, result, raw) {
                            check_err(err);
                            assert.ok(Array.isArray(result.ids));
                            raw = JSON.parse(raw);
                            assert.strictEqual(raw.hits.total, 2);
                            assert.deepEqual(result.ids.sort(), ids.sort());
                            done();
                        });
                    });

                    it("array of _source objects", function (done) {
                        delete search_args.index;

                        client.core.search(search_args, function (err, result, raw) {
                            check_err(err);
                            assert.ok(Array.isArray(result.objects));
                            raw = JSON.parse(raw);
                            assert.strictEqual(raw.hits.total, 2);
                            //assert.ok(result.objects[0].name);
                            assert.deepEqual(result.objects, [doc1, doc2]);
                            done();
                        });
                    });

                    it("total field", function (done) {
                        delete search_args.index;

                        client.core.search(search_args, function (err, result, raw) {
                            check_err(err);
                            raw = JSON.parse(raw);
                            assert.strictEqual(raw.hits.total, 2);
                            assert.strictEqual(result.total, raw.hits.total);
                            done();
                        });
                    });

                    it("max_score field", function (done) {
                        delete search_args.index;

                        client.core.search(search_args, function (err, result, raw) {
                            check_err(err);
                            raw = JSON.parse(raw);
                            assert.ok(result.max_score >= 1);
                            assert.strictEqual(result.max_score, raw.hits.max_score);
                            done();
                        });
                    });
                });

                it("uses default index if available and no override passed in", function (done) {
                    var options = support.shallow_clone(server_options);
                    options.index = index_name;
                    var client = simple_es.client.create(options);

                    delete search_args.index;

                    sinon.spy(client.http_client, 'post');

                    client.core.search(search_args, function (err) {
                        check_err(err);
                        var expected_path = index_name + '/_search';
                        assert.ok(client.http_client.post.calledWithMatch({path: expected_path}));
                        client.http_client.post.restore();
                        done();
                    });
                });
            });

            context("when index passed in", function () {
                it("searches against that index", function (done) {
                    sinon.spy(client.http_client, 'post');

                    client.core.search(search_args, function (err) {
                        check_err(err);
                        var expected_path = index_name + '/_search';
                        assert.ok(client.http_client.post.calledWithMatch({path: expected_path}));
                        client.http_client.post.restore();
                        done();
                    });
                });

                it("returns array of matching results", function (done) {
                    client.core.search(search_args, function (err, result, raw) {
                        check_err(err);
                        raw = JSON.parse(raw);
                        assert.strictEqual(raw.hits.total, 2);
                        assert.deepEqual(result.ids.sort(), ids.sort());
                        done();
                    });
                });
            });

            context("when index and type passed in", function () {
                it("searches against that index and type", function (done) {
                    search_args.type = type;
                    sinon.spy(client.http_client, 'post');

                    client.core.search(search_args, function (err) {
                        check_err(err);
                        var expected_path = index_name + '/' + type + '/_search';
                        assert.ok(client.http_client.post.calledWithMatch({path: expected_path}));
                        client.http_client.post.restore();
                        done();
                    });
                });

                it("returns array of matching results", function (done) {
                    search_args.type = type;
                    client.core.search(search_args, function (err, result, raw) {
                        check_err(err);
                        raw = JSON.parse(raw);
                        assert.strictEqual(raw.hits.total, 2);
                        assert.deepEqual(result.ids.sort(), ids.sort());
                        done();
                    });
                });
            });

            context("when no matching results found", function () {
                it("returns an empty array", function (done) {
                    search_args.search.query.prefix.name = 'ZZZXXXYYY';

                    client.core.search(search_args, function (err, result, raw) {
                        check_err(err);
                        raw = JSON.parse(raw);
                        assert.strictEqual(raw.hits.total, 0);
                        assert.deepEqual(result, []);
                        done();
                    });
                });
            });
        });

        ['scan_search', 'scanSearch'].forEach(function (meth) {
            describe(meth + "()", function () {
                var client;

                before(function () {
                    client = simple_es.client.create(server_options);
                });

                context("when null args passed in", function () {
                    it("returns the scroll_id in both the raw and regular result", function (done) {
                        client.core[meth](null, function (err, result, raw) {
                            check_err(err);
                            raw = JSON.parse(raw);
                            assert.ok(raw.hits);
                            assert.ok(result);
                            done();
                        });
                    });
                });

                context("when index, type, and scroll_ttl are passed in ", function () {
                    it("searches against that index and type and uses scroll_ttl", function (done) {
                        sinon.spy(client.http_client, 'post');
                        var scroll_ttl = 2;
                        var args = {
                            scroll_ttl: scroll_ttl,
                            type: type,
                            index: index_name
                        };
                        client.core[meth](args, function (err) {
                            check_err(err);
                            var expected_path = index_name + '/' + type + '/_search?search_type=scan&scroll=' + scroll_ttl + 'm';
                            assert.ok(client.http_client.post.calledWithMatch({path: expected_path}));
                            client.http_client.post.restore();
                            done();
                        });
                    });
                });

                context("when no index, type, or scroll_ttl are passed in ", function () {
                    it("searches against all indexes and uses default scroll_ttl", function (done) {
                        sinon.spy(client.http_client, 'post');

                        client.core[meth](null, function (err) {
                            check_err(err);
                            var expected_path = "_search?search_type=scan&scroll=1m";
                            assert.ok(client.http_client.post.calledWithMatch({path: expected_path}));
                            client.http_client.post.restore();
                            done();
                        });
                    });
                });

                context("when HTTP request returns an error", function () {
                    it("bubbles up that error", function (done) {
                        var fake_err = support.fake_error();
                        sinon.stub(client.http_client, 'post', function (args, cb) {
                            cb(fake_err);
                        });

                        client.core[meth]({index: index_name, type: type}, function (err) {
                            assert.equal(err, fake_err);
                            client.http_client.post.restore();
                            done();
                        });
                    });
                });
            });
        });

        ['scroll_search', 'scrollSearch'].forEach(function (meth) {
            describe(meth + "()", function () {
                var doc1;
                var doc2;
                var ids;
                var prefix;
                var search_args;

                before(function (done) {
                    ids = [];

                    client.indices.del({index: index_name}, function (err) {
                        check_err(err);
                        client.indices.create({index: index_name, options: {number_of_shards: 1}}, function (err) {
                            check_err(err);

                            var mapping = {
                                foo: {
                                    _source: {
                                        includes: [
                                            '*'
                                        ]
                                    },
                                    properties: {
                                        name: {type: 'string', store: 'yes'}
                                    }
                                }
                            };

                            client.indices.mappings.update({index: index_name, type: type, mapping: mapping}, function (err) {
                                check_err(err);

                                prefix = support.random.string();

                                doc1 = create_doc({name: prefix + support.random.string()});
                                doc2 = create_doc({name: prefix + support.random.string()});

                                client.core.index({index: index_name, type: type, doc: doc1}, function (err, result) {
                                    ids.push(result._id);
                                    check_err(err);

                                    client.core.index({index: index_name, type: type, doc: doc2}, function (err, result) {
                                        check_err(err);
                                        ids.push(result._id);

                                        client.indices.refresh({index: index_name}, function (err, result) {
                                            check_err(err);
                                            assert.ok(result.ok);
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });

                after(function (done) {
                    client.indices.del({index: index_name}, done);
                });

                beforeEach(function () {
                    search_args = {
                        index: index_name,
                        search: {
                            query: {
                                prefix: {name: prefix}
                            }
                        }
                    };
                });

                context("when null args passed in", function () {
                    it("searches across all indexes", function (done) {
                        client.core.scan_search(null, function (err, scroll_id) {
                            check_err(err);
                            client.core[meth]({scroll_id: scroll_id}, function (err, result, raw) {
                                check_err(err);
                                raw = JSON.parse(raw);
                                assert.ok(raw.hits);
                                done();
                            });
                        });
                    });
                });

                context("when malformed query passed in", function () {
                    beforeEach(function () {
                        search_args = {
                            index: index_name,
                            search: {
                                query: {
                                    malformed: {name: prefix}
                                }
                            }
                        };
                    });

                    it("returns an error", function (done) {
                        client.core.scan_search(search_args, function (err, scroll_id) {
                            check_err(err);
                            client.core[meth]({scroll_id: scroll_id}, function (err) {
                                assert.ok(err.message.match(/ElasticsearchError/));
                                done();
                            });
                        });
                    });

                    it("catches JSON parse errors", function (done) {
                        client.core.scan_search(search_args, function (err, scroll_id) {
                            check_err(err);
                            sinon.stub(client, 'request', function (args, cb) {
                                cb(null, null, '{"bad_json..}');
                            });
                            client.core[meth]({scroll_id: scroll_id}, function (err) {
                                assert.ok(err.message.match(/ElasticsearchError.*JSON/));
                                client.request.restore();
                                done();
                            });
                        });
                    });

                    context("when HTTP request does not return 'raw'", function () {
                        it("it returns a JSON parse error", function (done) {
                            client.core.scan_search(search_args, function (err, scroll_id) {
                                check_err(err);
                                sinon.stub(client, 'request', function (args, cb) {
                                    cb(null, null, null);
                                });
                                client.core[meth]({scroll_id: scroll_id}, function (err) {
                                    assert.ok(err.message.match(/ElasticsearchError.*JSON/));
                                    client.request.restore();
                                    done();
                                });
                            });
                        });
                    });
                });

                context("when HTTP request returns an error", function () {
                    it("bubbles up that error", function (done) {
                        var fake_err = support.fake_error();

                        client.core.scan_search(search_args, function (err, scroll_id) {
                            check_err(err);
                            sinon.stub(client.http_client, 'get', function (args, cb) {
                                cb(fake_err);
                            });
                            client.core[meth]({scroll_id: scroll_id}, function (err) {
                                assert.equal(err, fake_err);
                                client.http_client.get.restore();
                                done();
                            });
                        });
                    });
                });

                context("when no index passed in", function () {
                    it("searches against all indexes", function (done) {
                        sinon.spy(client.http_client, 'get');
                        delete search_args.index;

                        client.core.scan_search(search_args, function (err, scroll_id) {
                            check_err(err);
                            client.core[meth]({scroll_id: scroll_id}, function (err) {
                                check_err(err);
                                assert.ok(client.http_client.get.calledWithMatch({path: '_search/scroll?scroll_id=' + scroll_id + '&scroll=1m'}));
                                client.http_client.get.restore();
                                done();
                            });
                        });
                    });

                    context("it returns an object with:", function () {
                        it("array of matching ids", function (done) {
                            delete search_args.index;

                            client.core.scan_search(search_args, function (err, scroll_id) {
                                check_err(err);
                                client.core[meth]({scroll_id: scroll_id}, function (err, result, raw) {
                                    check_err(err);
                                    assert.ok(Array.isArray(result.ids));
                                    raw = JSON.parse(raw);
                                    assert.strictEqual(raw.hits.total, 2);
                                    assert.deepEqual(result.ids.sort(), ids.sort());
                                    done();
                                });
                            });
                        });

                        it("array of _source objects", function (done) {
                            delete search_args.index;

                            client.core.scan_search(search_args, function (err, scroll_id) {
                                check_err(err);
                                client.core[meth]({scroll_id: scroll_id}, function (err, result, raw) {
                                    check_err(err);
                                    assert.ok(Array.isArray(result.objects));
                                    raw = JSON.parse(raw);
                                    assert.strictEqual(raw.hits.total, 2);
                                    assert.deepEqual(result.objects, [doc1, doc2]);
                                    done();
                                });
                            });
                        });

                        it("total field", function (done) {
                            delete search_args.index;

                            client.core.scan_search(search_args, function (err, scroll_id) {
                                check_err(err);
                                client.core[meth]({scroll_id: scroll_id}, function (err, result, raw) {
                                    check_err(err);
                                    raw = JSON.parse(raw);
                                    assert.strictEqual(raw.hits.total, 2);
                                    assert.strictEqual(result.total, raw.hits.total);
                                    done();
                                });
                            });
                        });

                        it("scroll_id field", function (done) {
                            delete search_args.index;

                            client.core.scan_search(search_args, function (err, scroll_id) {
                                check_err(err);
                                client.core[meth]({scroll_id: scroll_id}, function (err, result, raw) {
                                    check_err(err);
                                    raw = JSON.parse(raw);
                                    assert.strictEqual(result.total, raw.hits.total);
                                    done();
                                });
                            });
                        });
                    });
                });

                context("when no matching results found", function () {
                    it("returns an empty array", function (done) {
                        search_args.search.query.prefix.name = 'ZZZXXXYYY';

                        client.core.scan_search(search_args, function (err, scroll_id) {
                            check_err(err);
                            client.core[meth]({scroll_id: scroll_id}, function (err, result, raw) {
                                check_err(err);
                                raw = JSON.parse(raw);
                                assert.strictEqual(raw.hits.total, 0);
                                assert.deepEqual(result, []);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
});
