var path = require('path'),
    fs = require('fs');

exports.load = function(callback, queryParams, req, res, next) { 
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
};