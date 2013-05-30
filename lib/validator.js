var validator = {
    validate_args: function (args, required_args) {
        if (!args) {
            return new Error('Elasticsearch error: args required');
        }

        if (Array.isArray(required_args)) {
            for (var i = 0; i < required_args.length; i++) {
                var arg = required_args[i];
                if (!args.hasOwnProperty(arg)) {
                    return new Error('Elasticsearch error - missing arg: ' + arg);
                }
            }
        }
    }
};

module.exports = validator;
