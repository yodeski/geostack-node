var path = require('path'),
    fs = require('fs'),
    connect = require('connect'),
    quip = require('quip'),
    url = require('url'),
    Hoptoad = require('./hoptoad-notifier').Hoptoad,
    config = require('../config').extend();
    
/* internals */

function datasetSearch(callback, queryParams, req, res, next) {
    // require the dataset
    var dataset = require('./datasets/' + req.params.dataset),
        processor = dataset[req.params.op];

    if (processor) {
        processor(callback, queryParams, req, res);
    }
    else {
        throw new Error('Dataset does not support the \'' + req.params.op + '\' operation');
    } // if..else
} // datasetSearch

function details(callback, queryParams, req, res, next) { 
    var fileId = req.params.dataset + '/' + req.params.id,
        filePath = 'details/' + fileId + '.json';
    
    // TODO: check in cache
    
    // if the file exists, the load the details
    path.exists(filePath, function(exists) {
        if (exists) {
            fs.readFile(filePath, function(err, data) {
                var result;
                
                try {
                    if (err) throw err;
                    
                    result = JSON.parse(data);
                }
                catch (e) {
                    result = { error: 'Could not open file' };
                } // try..catch

                callback(result);
            });
        }
        else {
            callback({
                error: 'Not found'
            });
        } // if..else
    });
} // details
    
/* exports */

exports.createServer = function() {
    return connect.createServer(
        // initialise connect middleware
        connect.favicon(),
        quip(),
    
        // define the connect routes
        connect.router(function(app) {
            app.get('/pois/:dataset/:op', wrapHandler(datasetSearch));
            app.get('/details?/:dataset/:id', wrapHandler(details));
        
            extensions.each(function() {
                if (this.router) {
                    this.router(app, exports);
                } // if
            });
        
            /*
            app.get('/config', wrapHandler(racq.getConfig));
            app.get('/geocode/:address', wrapHandler(geocode));
            app.get('/route/:waypoints', wrapHandler(route));
            */
        })
    );
};
    
var wrapHandler = exports.wrap = function(handlerFn) {

    function jsonify(cbName, res, output) {
        if (cbName) {
            res.jsonp(cbName, output);
        }
        else {
            res.json(output);
        } // if..else
    } // jsonify

    return function(req, res, next) {
        var queryParams = url.parse(req.url, true).query,
            output = {};

        try {
            handlerFn(function(output) {
                jsonify(queryParams.callback, res, output || { error: 'No results' });
            }, queryParams, req, res, next);
        }
        catch (e) {
            reportError(null, e);

            jsonify(queryParams.callback, res, {
                error:e.message
            });
        } // try..catch
    };
}; // wrapHandler    

var reportError = exports.reportError = function(callback, error) {
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

exports.extensions = require('./geostack/extensions');

/* initialization */

// initialise the hoptoad api key
Hoptoad.key = config.hoptoadKey;

process.addListener('uncaughtException', function(error) {
    reportError(null, error);
});