var fs = require('fs');

module.exports = (function() {

    /* internals */
    
    var extensions = [];
    
    /* exports */

    function each(callback) {
        
    } // each
    
    /* initialization */
    
    fs.readdir('stack_modules', function(err, files) {
        for (var ii = 0; ii < files.length; ii++) {
            extensions.push(require('../../stack_modules/' + files[ii]));
        } // for
    });
    
    return {
        each: each
    };
})();