const qs = require('node:querystring');
const util = require('util');
const { Writable } = require('stream');
var debug;
  
if (util.debuglog) {
  debug = util.debuglog('xyztiles');
} else {
  debug = process.env.NODE_DEBUG && /xyztiles/.test(process.env.NODE_DEBUG) ? 
          function(x) { console.error('XYZTiles: %s', x); } : 
          function(){};
}   

exports = module.exports = XYZTiles;

function XYZTiles(uri, callback) {
  let myParams = {};

  if (typeof uri === 'string') {
    uri = URL.parse(uri);
  } else if (typeof uri.query === 'string') {
    myParams.query = qs.parse(uri.query);
  }
  
  if (uri.port && uri.port == 443) {
    myParams.protocol = 'https:';
  } else {
    myParams.protocol = 'http:';
  }

  this._isWriting = 0;
  this.contentType = 'image/jpeg';
  this.uri = myParams.protocol + '//' + uri.host + uri.pathname;
  if (myParams.search) {
    this.uri += myParams.search;
  } else if (uri.search){
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
  const args = { x, y, z };
  const uri = decodeURIComponent(this.uri).replace(/\$\{(.*?)\}/g, (match, item) => {
    return typeof args[item] !== 'undefined' ? args[item] : match;
  });

  debug(uri);

  if (callback instanceof Writable) {
    fetch(uri)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // The fetch response body is a ReadableStream.
        // We can use the pipeTo method to pipe it directly to a Writable stream.
        return response.body.pipeTo(callback);
      })
      .catch(error => {
        callback.emit('error', error);
      });
  } else if (typeof callback !== 'function') {
    throw new Error('Callback needed');
  } else {
    fetch(uri)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // To get the raw body data, we can use arrayBuffer()
        return Promise.all([
          response.arrayBuffer(),
          response.headers
        ]);
      })
      .then(([bodyBuffer, headers]) => {
        // Convert the Headers object to a plain JavaScript object
        const plainHeaders = {};
        headers.forEach((value, key) => {
          if (plainHeaders[key]) {
            if (Array.isArray(plainHeaders[key])) {
              plainHeaders[key].push(value);
            } else {
              plainHeaders[key] = [plainHeaders[key], value];
            }
          } else {
            plainHeaders[key] = value;
          }
        });

        // Convert the ArrayBuffer to a Buffer for compatibility
        callback(null, Buffer.from(bodyBuffer), plainHeaders);
      })
      .catch(error => {
        callback(error);
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

