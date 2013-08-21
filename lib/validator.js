var validator = {
    validate_args: function (args, required_args, cb) {
        if (typeof required_args === 'function') {
            cb = required_args;
            required_args = null;
        }

        if (!args) {
            //process.nextTick(function () {
            return cb(new Error('Elasticsearch error: args required'));
            //});
        } else if (Array.isArray(required_args)) {
            var err = null;

            for (var i = 0; i < required_args.length; i++) {
                var arg = required_args[i];
                if (!args.hasOwnProperty(arg)) {
                    //process.nextTick(function () {
                    err = new Error('Elasticsearch error - missing arg: ' + arg);
                    break;
                    //});
                } else {
                    continue;
                }
            }
            return cb(err);
        } else {
            cb();
        }
    }
};

module.exports = validator;
