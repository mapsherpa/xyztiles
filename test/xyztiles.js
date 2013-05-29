var assert = require('better-assert')
  , uuid = require('uuid')
  , fs = require('fs')
  , path = require('path')
  ;
    
beforeEach(function() {
});

describe('XYZTiles', function() {
  var XYZTiles = require('../');
  var mq = 'http://otile1.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.jpg#image-type=image/jpeg';
  
  describe('getTile', function() {
    it('should get a tile', function(done) {
      this.timeout(6000);
      new XYZTiles(mq, function(err, sink) {
        if (err) return done(new Error(JSON.stringify(err)));
        sink.getTile(0,0,0,function(err, data, options) {
          if (err) return done(new Error(JSON.stringify(err)));
          assert(data instanceof Buffer);
          done();
        });
      });
    });
    
    it('should stream a tile', function(done) {
      this.timeout(6000);
      new XYZTiles(mq, function(err, sink) {
        if (err) return done(new Error(JSON.stringify(err)));
        var stream = fs.createWriteStream('/tmp/test.jpg');
        stream.on('close', function() {
          done();
        });
        sink.getTile(0,0,0, stream);
      });
    })
  })
});