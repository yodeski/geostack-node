var baseConfig = {
    urls: [
        'http://125.7.123.218:8080/geoserver/wfs',
        'http://10.1.1.19:8080/geoserver/aaat/ows'
    ],
    hoptoadKey: '71b2c4a8a43e129fce6a2242f537e295'
};

exports.extend = function() {
    var args = arguments,
        target = {
            
        };
        
    // insert the base config
    Array.prototype.splice.call(args, 0, 0, baseConfig);
    
    // iterate through the args
    for (var ii = 0; ii < args.length; ii++) {
        var src = args[ii];
        for (var key in src) {
            target[key] = src[key];
        } // for
    } // for
    
    return target;
};