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

describe("client", function () {
    describe("instantiating", function () {
        it("doesn't blow up when no args passed in", function () {
            simple_es.client.create();
        });
    });

    describe("index()", function () {
        var client;

        before(function () {
            client = simple_es.client.create(server_options);
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
});
