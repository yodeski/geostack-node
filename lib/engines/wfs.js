exports.filter = function(geostack, callback, queryParams, req, res) {
    console.log(queryParams.filter);
}; // filter

exports.makeRequest = function(params, filter) {
    var xmlTypes = {
        GML2: '',
        GML3: 'text/xml; subtype=gml/3.1.1',
        JSON: 'application/json' 
    };
    
    // ensure output format and version have default values
    params.version = params.version || '1.1.0';
    params.outputFormat = params.outputFormat || (params.version === '1.0.0' ? 'GML2' : 'GML3');
    
    if (params.kvp) {
        return 'service=' + params.service + '&' + 
            'request=' + params.request + '&' + 
            'Typename=' + params.dataset + '&' + 
            'version=' + params.version + '&' + 
            'maxFeatures=' + params.maxFeatures + '&' + 
            'outputformat=' + params.outputFormat + '&' + 
            'filter=' + filter;
    }
    else {
        return '<?xml version="1.0" ?>' + 
            '<wfs:GetFeature ' + 
              'service="WFS" ' + 
              'version="' + params.version + '" ' + 
              'maxFeatures="' + params.maxFeatures + '" ' +
              'outputFormat="' + xmlTypes[params.outputFormat] + '" ' +
              'xmlns:wfs="http://www.opengis.net/wfs" ' + 
              'xmlns:ogc="http://www.opengis.net/ogc" ' + 
              'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' + 
              'xsi:schemaLocation="http://www.opengis.net/wfs ../wfs/1.1.0/WFS.xsd">' + 
              '<wfs:Query typename="aaat:acc">' + filter + '</wfs:Query>' + 
            '</wfs:GetFeature>';
    } // if..else
}; // makeRequest

exports.standardize = (function() {
    function parseFeatures(features, eastingFirst) {
        var results = [],
            latIdx = eastingFirst ? 1 : 0,
            lonIdx = eastingFirst ? 0 : 1;

        // iterate over the features in the array
        for (var ii = 0; ii < features.length; ii++) {
            var feature = features[ii],
                featureType = (feature.geometry.type || '').toLowerCase(),
                result = feature.properties;
                
            result.geomType = featureType;

            // parse geometry
            switch (featureType) {
                case 'point': {
                    result.geom = feature.geometry.coordinates[latIdx] + ' ' + 
                        feature.geometry.coordinates[lonIdx];

                    break;
                } // case point
                
                case 'multipolygon': {
                    result.geom = feature.geometry.coordinates;
                    break;
                } // case multipolygon

                default: {
                    throw new Error('Unknown Geometry');
                };
            }

            results[results.length] = result;
        } // for

        return results;
    } // parseFeatures
    
    return function(input, params) {
        try {
            // parse the input
            var data = JSON.parse(input);
            
            // iterate through the features
            if (data.features) {
                return parseFeatures(data.features, params.eastingFirst);
            } // if
        }
        catch (e) {
            throw new Error('Unable to parse response. ERROR: ' + e.message);
        } // try..catch
    };
})();