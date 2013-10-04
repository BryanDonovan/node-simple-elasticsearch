BASE = .

ISTANBUL = ./node_modules/.bin/istanbul
TEST_COMMAND = NODE_ENV=test ./node_modules/.bin/mocha
COVERAGE_OPTS = --lines 98 --statements 95 --branches 95 --functions 95

main: lint test

cover:
	$(ISTANBUL) cover test/run.js -- -T unit,functional

check-coverage:
	$(ISTANBUL) check-coverage $(COVERAGE_OPTS)

test: cover check-coverage

test-travis: lint
	./node_modules/.bin/istanbul cover test/run.js --report lcovonly \
	  -- -T unit,functional -R spec && cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js && rm -rf ./coverage


test-cov: cover check-coverage
	open coverage/lcov-report/index.html

lint:
	./node_modules/.bin/jshint ./lib --config $(BASE)/.jshintrc && \
	./node_modules/.bin/jshint ./test --config $(BASE)/.jshintrc


.PHONY: test
