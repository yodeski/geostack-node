var request = require('request');

exports.init = function(params) {
    var requiredParams = ['urls'],
        configOK = true,
        defaultParams = {
            service: 'WFS',
            version: '1.1.0',
            request: 'GetFeature',
            maxFeatures: 200,
            outputFormat: 'json'
        };

    /* internals */
    
    function buildUrl(url, args) {
        var qsParts = [],
            key;
        
        for (key in defaultParams) {
            args[key] = args[key] || defaultParams[key];
        } // for
        
        // build the url
        for (key in args) {
            qsParts.push(key + '=' + escape(args[key]));
        } // for
        
        return url + '?' + qsParts.join('&');
    } // buildUrl
    
    function getActiveServer(callback) {
        // TODO: implement some checking of the available servers
        callback(params.urls[0]);
    } // getActiveServer
    
    function standardize(input) {
        try {
            // parse the input
            var data = JSON.parse(input);

            // iterate through the features
            if (data.features) {
                return parseFeatures(data.features);
            } // if
        }
        catch (e) {
            throw new Error('Unable to parse response: ' + input);
        } // try..catch
    } // standardize
    
    function parseFeatures(features) {
        var results = [];
        
        // iterate over the features in the array
        for (var ii = 0; ii < features.length; ii++) {
            var feature = features[ii],
                result = feature.properties;
            
            // parse geometry
            switch (feature.geometry.type) {
                case 'Point': {
                    result.geomType = 'point';
                    result.geom = feature.geometry.coordinates[0] + ' ' + 
                        feature.geometry.coordinates[1];
                        
                    break;
                } // case point
                
                default: {
                    throw new Error('Unknown Geometry');
                };
            }
            
            results[results.length] = result;
        } // for
        
        return results;
    } // parseFeatures
    
    /* exports */
    
    /**
    ### bbox(queryParams, req, res)
    */
    function bbox(geostack, callback, queryParams, req, res) {
        return {
            result: 'blah'
        };
    } // bbox
    
    /**
    ### cql(queryParams)
    */
    function cql(geostack, callback, queryParams, req, res) {
        getActiveServer(function(url) {
            // constructor the url
            var targetUri = buildUrl(url, {
                    typeName: req.params.dataset,
                    cql_filter: queryParams.cql
                }),
                log = geostack.initLog();
            
            console.log('requesting: ' + targetUri);
            
            // make the request to geoserver
            request({ uri: targetUri }, function(err, response, body) {
                if (! err) {
                    log.checkpoint('Request processed by geoserer');
                    
                    geostack.run(callback, function() {
                        var results = standardize(body);
                        log.checkpoint('Response standardized');
                        
                        return {
                            log: log.getData(),
                            results: results
                        };
                    });
                }
                else {
                    geostack.reportError(callback, 'Invalid response from geoserver: ' + err);
                }
            });
        });
    } // cql
    
    /* initialization */
    
    // iterate through and check the required params have been specified
    for (var ii = 0; ii < requiredParams.length; ii++) {
        configOK = configOK && typeof params[requiredParams[ii]] != 'undefined';
    } // for
    
    if (! configOK) {
        throw new Error('Dataset not configured correctly, please contact administrator');
    } // if
    
    return {
        bbox: bbox,
        cql: cql
    };
};