var validator = {
    validate_args: function (args, required_args, cb) {
        //process.nextTick(function () {
            if (typeof required_args === 'function') {
                cb = required_args;
                required_args = null;
            }

            if (!args) {
                return cb(new Error('Elasticsearch error: args required'));
            }

            if (Array.isArray(required_args)) {
                for (var i = 0; i < required_args.length; i++) {
                    var arg = required_args[i];
                    if (!args.hasOwnProperty(arg)) {
                        var err = new Error('Elasticsearch error - missing arg: ' + arg);
                        return cb(err);
                    }
                }
            }

            return cb();
        //});
    }
};

module.exports = validator;
