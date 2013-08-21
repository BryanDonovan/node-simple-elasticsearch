var validator = {
    validate_args: function (args, required_args, cb) {
        if (typeof required_args === 'function') {
            cb = required_args;
            required_args = null;
        }

        var err;

        if (!args) {
            err = new Error('Elasticsearch error: args required');
            return process.nextTick(function () {
                cb(err);
            });
        }

        if (Array.isArray(required_args)) {
            for (var i = 0; i < required_args.length; i++) {
                var arg = required_args[i];
                if (!args.hasOwnProperty(arg)) {
                    err = new Error('Elasticsearch error - missing arg: ' + arg);
                    return process.nextTick(function () {
                        cb(err);
                    });
                }
            }
        }

        return cb();
    }
};

module.exports = validator;
