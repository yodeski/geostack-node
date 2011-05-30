var Hoptoad = require('node-hoptoad-notifier').Hoptoad,
    config = require('./config').extend();

// initialise the hoptoad api key
Hoptoad.key = config.hoptoadKey;

exports.report = function(callback, error) {
    var message;
    
    if (typeof error == 'string') {
        message = error;
        Hoptoad.notify(new Error(message));
    }
    else {
        Hoptoad.notify(error);
        message = error.message;
    } // if..else
    
    if (callback) {
        callback({
            error: message
        });
    } // if
};

exports.run = function(callback, innerFn) {
    try {
        var results = innerFn.call(null);
        callback(results);
    }
    catch (e) {
        Hoptoad.notify(e);
        
        callback({
            error: e.message
        });
    } // try..catch
};