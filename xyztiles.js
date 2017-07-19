var url = require('url')
  , qs = require('querystring')
  , request = require('request')
  , http = require('http')
  , util = require('util')
  , debug
  ;
  
if (util.debuglog) {
  debug = util.debuglog('xyztiles');
} else {
  debug = process.env.NODE_DEBUG && /xyztiles/.test(process.env.NODE_DEBUG) ? 
          function(x) { console.error('XYZTiles: %s', x); } : 
          function(){};
}   

exports = module.exports = XYZTiles;

function XYZTiles(uri, callback) {
  if (typeof uri === 'string') {
    uri = url.parse(uri, true);
  } else if (typeof uri.query === 'string') {
    uri.query = qs.parse(uri.query);
  }
  
  if (uri.port && uri.port == 443) {
    uri.protocol = 'https:';
  } else {
    uri.protocol = 'http:';
  }

  uri.pathname = uri.pathname.replace(/%7B/g,"{");
  uri.path = uri.path.replace(/%7B/g,"{");
  uri.href = uri.href.replace(/%7B/g,"{");
  uri.pathname = uri.pathname.replace(/%7D/g,"}");
  uri.path = uri.path.replace(/%7D/g,"}");
  uri.href = uri.href.replace(/%7D/g,"}");

  this._isWriting = 0;
  this.contentType = 'image/jpeg';
  this.uri = uri.protocol + '//' + uri.host + uri.pathname;
  if (uri.search) {
    this.uri += uri.search;
  }
  
  if (uri.hash) {
    this.contentType = uri.hash.split('#')[1];
  } else {
    debug('warning: no content-type specified, defaulting to %s.', this.contentType);
  }
  callback(null, this);
}

XYZTiles.registerProtocols = function(tilelive) {
  tilelive.protocols['xyztiles:'] = XYZTiles;
};

XYZTiles.prototype.getTile = function(z, x, y, callback) {
  var args = {x:x,y:y,z:z}
    , opts = {
        uri: this.uri.replace(/\$\{(.*?)\}/g, function(match, item) {
            return typeof args[item] !== 'undefined' ? args[item] : match;
          }),
        encoding: null
      }
    ;

  debug(opts.uri);

  if (callback instanceof require('stream')) {
    request(opts).pipe(callback);
  } else if (typeof callback !== 'function') {
    throw new Error('Callback needed');
  } else {
    request(opts, function(error, response, body) {
      callback(null, body, response.headers);
    });
  }
};

XYZTiles.prototype.getGrid = function(z, x, y, callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback needed');
  }
};

XYZTiles.prototype.getInfo = function(callback) {
  callback(null, {
    bounds: [-180, -90, 180, 90]
  });
};

XYZTiles.prototype.startWriting = function(callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback needed');
  }
  this._isWriting ++;
  callback(null);
};

XYZTiles.prototype.stopWriting = function(callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback needed');
  }
  this._isWriting --;
  callback(null);
};

XYZTiles.prototype.putInfo = function(info, callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback needed');
  }
  callback(null);
};

XYZTiles.prototype.putTile = function(z, x, y, tile, callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback needed');
  }
  if (!this._isWriting) {
    return callback(new Error('XYZTiles not in write mode'));
  }
  callback(null);
};

XYZTiles.prototype.putGrid = function(z, x, y, grid, callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback needed');
  }
  callback(null);
};

XYZTiles.prototype.close = function(callback) {
  callback(null);
};

XYZTiles.prototype.getMimeType =  function(data) {
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E &&
    data[3] === 0x47 && data[4] === 0x0D && data[5] === 0x0A &&
    data[6] === 0x1A && data[7] === 0x0A) {
    return 'image/png';
  } else if (data[0] === 0xFF && data[1] === 0xD8 &&
    data[data.length - 2] === 0xFF && data[data.length - 1] === 0xD9) {
    return 'image/jpeg';
  } else if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 &&
    data[3] === 0x38 && (data[4] === 0x39 || data[4] === 0x37) &&
    data[5] === 0x61) {
    return 'image/gif';
  }
};

