var path = require('path'),
    fs = require('fs'),
    connect = require('connect'),
    quip = require('quip'),
    url = require('url'),
    reJSFile = /\.js$/i;
    
Geostack = (function() {

    /* internals */
    
    var extFiles =  fs.readdirSync('lib/extensions'),
        extensions = [],
        baseConfig = {};
    
    for (var ii = 0; extFiles && ii < extFiles.length; ii++) {
        if (reJSFile.test(extFiles[ii])) {
            console.log('loading extension: ' + extFiles[ii]);
            extensions.push(require(process.cwd() + '/lib/extensions/' + extFiles[ii]));
        } // if
    } // for

    function datasetSearch(geostack, callback, queryParams, req, res, next) {
        // require the dataset
        var dataset = getDataset(req.params.dataset),
            dsConfig = extendConfig(dataset.config),
            processor = require('./engines/' + dataset.type).init(dsConfig)[req.params.op];
            
        if (processor) {
            processor(geostack, callback, queryParams, req, res);
        }
        else {
            throw new Error('Dataset does not support the \'' + req.params.op + '\' operation');
        } // if..else
    } // datasetSearch

    function details(geostack, callback, queryParams, req, res, next) { 
        var dsName = (req.params.dataset || '').replace(':', '_'),
            fileId = path.join(dsName, 'items', req.params.id),
            filePath = path.join(baseConfig.dataPath || 'data', fileId + '.json');

        // TODO: check in cache
        // console.log(baseConfig);
        // console.log('looking for details file: ' + filePath);

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
    
    function extendConfig() {
        var args = arguments,
            config = {};

        // insert the base config
        Array.prototype.splice.call(args, 0, 0, baseConfig);

        // iterate through the args
        for (var ii = 0; ii < args.length; ii++) {
            var src = args[ii];
            for (var key in src) {
                config[key] = src[key];
            } // for
        } // for
        
        return config;
    } // extendConfig
    
    function getDataset(dataset) {
        var ds;
        
        try {
            ds = require(process.cwd() + '/lib/datasets/' + dataset);
        }
        catch (e) {
            ds = {
                type: 'geoserver',
                config: {
                    dataset: dataset
                }
            };
        } // try..catch
        
        return ds;
    } // getDataset

    /* exports */

    function createServer(logExceptions) {
        if (logExceptions) {
            process.addListener('uncaughtException', function(error) {
                reportError(null, error);
            });
        } // if
        
        return connect.createServer(
            // initialise connect middleware
            connect.favicon(),
            quip(),

            // define the connect routes
            connect.router(function(app) {
                app.get('/pois/:dataset/:op', wrap(datasetSearch));
                app.get('/details?/:dataset/:id', wrap(details));

                extensions.forEach(function(ext) {
                    if (ext.router) {
                        ext.router(app, _self);
                    } // if
                });
            })
        );
    };

    function initConfig(config) {
        baseConfig = config;
        
        return _self;
    } // initConfig
    
    function initLog() {
        return require('./log')();
    } // initStats

    function reportError(callback, error) {
        var message,
            stack;

        if (typeof error == 'string') {
            message = error;
        }
        else {
            
            message = error.message;
            stack = error.stack;
        } // if..else
        
        if (callback) {
            callback({
                error: message,
                stack: stack
            });
        } // if
    };

    function run(callback, innerFn) {
        try {
            var results = innerFn.call(null);
            callback(results);
        }
        catch (e) {
            callback({
                error: e.message
            });
        } // try..catch
    };
    
    function wrap(handlerFn) {

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
                handlerFn(_self, function(output) {
                    jsonify(queryParams.callback, res, output || { error: 'No results' });
                }, queryParams, req, res, next);
            }
            catch (e) {
                reportError(function(data) {
                    jsonify(queryParams.callback, res, data);
                }, e);
            } // try..catch
        };
    } // wrap

    /* initialization */

    var _self = {
        createServer: createServer,
        initConfig: initConfig,
        initLog: initLog,
        reportError: reportError,
        run: run,
        wrap: wrap
    };
    
    return _self;
})();

module.exports = Geostack;