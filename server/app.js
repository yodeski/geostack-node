var connect = require('connect'),
    quip = require('quip'),
    url = require('url'),
    geojs = require('geojs'),
    racq = require('./racq/services'),
    details = require('./lib/details'),
    sys = require('sys'),
    protector = require('./lib/protector'),
    extensions = require('./lib/geostack/extensions');
    
function wrapHandler(handlerFn) {
    
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
            protector.report(null, e);
            
            jsonify(queryParams.callback, res, {
                error:e.message
            });
        } // try..catch
    };
} // wrapHandler

// route handlers

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

function geocode(callback, queryParams, req, res, next) {
    racq.geocode(req.params.host, req.params.address, callback);
} // geocode

function route(callback, queryParams, req, res, next) {
    racq.route(req.params.host, req.params.waypoints.split(','), callback);
} // route

module.exports = connect.createServer(
    // initialise connect middleware
    connect.favicon(),
    quip(),
    
    // define the connect routes
    connect.router(function(app) {
        // add the wrap method to the app
        app.wrap = wrapHandler;
        
        app.get('/pois/:dataset/:op', app.wrap(datasetSearch));
        app.get('/details?/:dataset/:id', app.wrap(details.load));
        
        extensions.each(function() {
            if (this.router) {
                this.router(app);
            } // if
        });
        
        app.get('/config', wrapHandler(racq.getConfig));
        app.get('/geocode/:address', wrapHandler(geocode));
        app.get('/route/:waypoints', wrapHandler(route));
    })
);

process.addListener('uncaughtException', function(error) {
    protector.report(null, error);
});