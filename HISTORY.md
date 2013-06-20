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
