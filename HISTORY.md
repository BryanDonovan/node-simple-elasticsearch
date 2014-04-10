- 0.2.1 - 2014-04-10
  - BUGFIX: added scroll_id to scroll_search response (enetzer)

- 0.2.0 - 2014-04-10
  - FEATURE: aliasing scroll_search and scan_search to scrollSearch and scanSearch

- 0.1.0 - 2014-04-09
  - FEATURE: Adding scroll_search, scan_search methods (thanks enetzer).

- 0.0.16 - 2014-04-09
  - BUGFIX: Test setup fix for core methods in client.unit.js.

- 0.0.15 - 2013-10-04
  - FEATURE: Adding coveralls test coverage tool.

- 0.0.14 - 2013-10-03
  - FEATURE: Adding cURL-formatted request logging option.

- 0.0.13 - 2013-10-03
  - CHANGE: Removing 'args' logging.
  - BUGFIX: Fixing response handler to handle errors from Elasticsearch 0.90.x.

- 0.0.12 - 2013-08-21
  - CHANGE: Callbacks after error checks are now async via process.nextTick().
  - BUGFIX: Fixed path.join() issues to be compatible with node v0.10.x.

- 0.0.11 - 2013-06-21
  - CHANGE: Bubbling up any "ElasticSearchException" ES responses as errors in callbacks.

- 0.0.10 - 2013-06-20
  - BUGFIX: Moving callback outside of try/catch block.

- 0.0.9 - 2013-06-20
  - BUGFIX: Bubbling up errors from search().

- 0.0.8 - 2013-05-30
  - CHANGE: Adding total and max_score to search result object.
  - FEATURE: Adding indices.mappings functions.

- 0.0.7 - 2013-05-30
  - BUGFIX: Returning array of matching ids in search results. Will return mapped objects later.

- 0.0.6 - 2013-05-28
  - CHANGE: Moved logger to its own file.

- 0.0.5 - 2013-05-28
  - FEATURE: Adding logging capabilities. Must supply your own logger.

- 0.0.4 - 2013-05-28
  - CHANGE: Replacing "request" npm module with lightweight home-grown http client.

- 0.0.3 - 2013-05-27
  - FEATURE: Allowing optional index arg to be passed in during client instantiation,
             which allows you to omit the index arg in core functions.

- 0.0.2 - 2013-05-27
  - FEATURE: Added HTTP basic auth support.
  - FEATURE: Added core.del().

- 0.0.1 - 2013-05-26
  Initial release.
