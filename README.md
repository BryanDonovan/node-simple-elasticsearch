node-simple-elasticsearch
=========================

# Node.js Simple Elasticsearch 

Provides lightweight wrapper around [Elasticsearch API](http://www.elasticsearch.org/).

## Features

* Simple interface 
* Full test coverage 

## Installation
TBD

## Overview

Provides wrappers around commonly-used Elasticsearch API endpoints, as well as a generic `request()` method that can
be used to execute arbitrary API calls.

## Usage Examples
### Creating a Client

    var options = {
        host: 'localhost', // default
        port: 9200 // default
    };

    var client = require('simple-elasticsearch').client.create(options);


### Core Methods

#### index()

    client.core.index({index: 'my_index', type: 'my_type'}, function(err, result) {});
    client.core.index({index: 'my_index', type: 'my_type', id: 'my_id'}, function(err, result) {});

#### search()

    var query = {query: {term: {name: 'foo'}}};
    client.core.search({query: query}, function(err, result) {});
    client.core.search({index: 'my_index', query: query}, function(err, result) {});
    client.core.search({index: 'my_index', type: 'my_type', query: query}, function(err, result) {
        //
    });
    
#### get()

    client.core.get({index: 'my_index', type: 'my_type', id: id}, function(err, doc) {
        console.log(doc);
    });


#### del()
TBD (soon).

### Index Methods

#### create()

    var options = {number_of_shards: 1};
    client.indices.create({index: 'my_index', options}, function(err, result) {});

#### del()

    client.indices.del({index: 'my_index'}, function(err, result) {});

#### refresh()

    client.indices.refresh(function(err, result) {});
    client.indices.refresh({index: 'my_index'}, function(err, result) {});
    client.indices.refresh({indices: ['my_index1', 'my_index2']}, function(err, result) {});

#### status()

    client.indices.status(function(err, result) {});
    client.indices.status({index: 'my_index'}, function(err, result) {});
    client.indices.status({indices: ['my_index1', 'my_index2']}, function(err, result) {});

### Cluster Methods
TBD, but you can use the ``client.request()`` method directly in the meantime.

## Tests

To run tests, first run:

    npm install

Run the tests and JShint:

    make

## Contribute

If you would like to contribute to the project, please fork it and send us a pull request.  Please add tests
for any new features or bug fixes.  Also run ``make`` before submitting the pull request.


## License

node-simple-elasticsearch licensed under the MIT license. See LICENSE file.
