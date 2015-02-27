[![Coverage Status](https://coveralls.io/repos/BryanDonovan/node-simple-elasticsearch/badge.png?branch=master)](https://coveralls.io/r/BryanDonovan/node-simple-elasticsearch?branch=master)

# Node.js Simple Elasticsearch

Provides lightweight wrapper around [Elasticsearch API](http://www.elasticsearch.org/).

## Features

* Simple interface
* Full test coverage

## Installation
```sh
npm install simple-elasticsearch
```

## Overview

Provides wrappers around commonly-used Elasticsearch API endpoints, as well as a generic `request()` method that can
be used to execute arbitrary API calls.

## Usage Examples

See tests for more usage examples.

### Creating a Client

#### Simple Usage
```js
var client = require('simple-elasticsearch').client.create();
```

#### Advanced Usage
```js
var options = {
    host: 'localhost', // default
    port: 9200,        // default
    protocol: 'http',  // default
    index: 'my_index', // optional - if set, then the core methods don't require an index
                       //            to be set in each function call.
    auth: {            // optional HTTP Basic Auth params.
       username: 'username',
       password: 'password'
    },
    logging: {         // optional logging
       logger: your_logger, // required -- there is no default logger.
       level: 'debug', // default
       events: ['request', 'response'] // Default events to log.
                                       // 'request':  Log the HTTP requests.
                                       // 'response': Log the HTTP responses.
       formatters: {request: 'curl'} // Default 'plain'. Available options are 'plain' and 'curl' for now.
                                     // 'curl' formatter logs requests in
                                     // cURL format, which is handy for debugging and
                                     // sharing requests with others.
                                     // TODO: add ability to provide a custom formatter.
    }
};

var client = require('simple-elasticsearch').client.create(options);
```

### Core Methods

#### index()
```js
client.core.index({index: 'my_index', type: 'my_type'}, function(err, result) {});
client.core.index({index: 'my_index', type: 'my_type', id: 'my_id'}, function(err, result) {});
```

#### search()
```js
var search = {query: {term: {name: 'foo'}}};
client.core.search({search: search}, function(err, result) {});
client.core.search({index: 'my_index', search: search}, function(err, result) {});
client.core.search({index: 'my_index', type: 'my_type', search: search}, function(err, result, raw) {
    // raw is the raw JSON string from Elasticsearch
    // result is an object with this structure:
    //  {
    //     ids: [/* array of matching doc ids */],
    //     objects: [/* array of _source doc objects */],
    //     total: <number of search hits>,
    //     max_score: <max search score>
    //  }
});
```

#### get()
```js
client.core.get({index: 'my_index', type: 'my_type', id: id}, function(err, doc) {
    console.log(doc);
});
```

#### del()
```js
client.core.del({index: 'my_index', type: 'my_type', id: id}, function(err, result) {});
```

#### scanSearch() / scan_search()
```sh
var search = {query: {term: {name: 'foo'}}};
client.core.scanSearch({search: search}, function(err, result) {});
client.core.scanSearch({index: 'my_index'}, function(err, result) {});
client.core.scanSearch({index: 'my_index', type: 'my_type'}, function(err, result, raw) {
    // raw is the raw JSON string from Elasticsearch
    // result is the scroll_id
});
```

#### scrollSearch / scroll_search()
```js
client.core.scrollSearch({scroll_id: 'a_scroll_id_returned_from_scan_search'}, function(err, result, raw) {
    // raw is the raw JSON string from Elasticsearch
    // result is an object with this structure:
    //  {
    //     ids: [/* array of matching doc ids */],
    //     objects: [/* array of _source doc objects */],
    //     total: <number of search hits>,
    //     max_score: <max search score>
    //  }
});
```

### Index Methods

#### create()
```js
var options = {number_of_shards: 1};
client.indices.create({index: 'my_index', options: options}, function(err, result) {});
```

#### del()
```js
client.indices.del({index: 'my_index'}, function(err, result) {});
```

#### refresh()
```js
client.indices.refresh(function(err, result) {});
client.indices.refresh({index: 'my_index'}, function(err, result) {});
client.indices.refresh({indices: ['my_index1', 'my_index2']}, function(err, result) {});
```

#### status()
```js
client.indices.status(function(err, result) {});
client.indices.status({index: 'my_index'}, function(err, result) {});
client.indices.status({indices: ['my_index1', 'my_index2']}, function(err, result) {});
```

### Cluster Methods
TBD, but you can use the `client.request()` method directly in the meantime.

## Tests

To run tests, first run:
```sh
npm install
```

Run the tests and JShint:
```sh
make
```

## Contribute

If you would like to contribute to the project, please fork it and send us a pull request.  Please add tests
for any new features or bug fixes.  Also run `make` before submitting the pull request.


## License

node-simple-elasticsearch licensed under the MIT license. See LICENSE file.
