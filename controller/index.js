var hash = require('object-hash');
var _ = require('underscore');

var Controller = function( yelp, BaseController ){

  // inherit from the base controller to share some logic 
  var controller = {};
  controller.__proto__ = BaseController();

  // respond to the root route
  controller.index = function(req, res){
    res.send('This is the base route of ye Yelp provider');
  };

  // get a resource from the providers model 
  controller.get = function(req, res){
    yelp.find(req.params, req.query, function(err, data){
      if (err){
        res.send(err, 500);
      } else {
        res.json( data );
      }
    });
  };
  
  // use the shared code in the BaseController to create a feature service
  controller.featureserver = function(req, res){
    var callback = req.query.callback, self = this;
    delete req.query.callback;

    // need to always respond with a count greater than the max count of 1000
    // that way the JS API will have to ask for bounding boxes
    if(req.query.returnCountOnly === 'true'){
      res.send({count: 1001});
    } else {
      yelp.find(req.params, req.query, function(err, data){
        if (err) {
          res.send(err, 500);
        } else {
          // inherited logic for processing feature service requests      
          controller.processFeatureServer( req, res, err, data, callback);
        }
      });
    }
  };

  // render templates and views 
  controller.preview = function(req, res){
    res.render(__dirname + '/../views/demo', { locals:{ id: req.params.id } });
  };

  // drops the cache
  controller.drop = function(req, res){
    var params = req.params;
    params.layer = 0;

    var key = hash.MD5(_.omit(params,'method'));

    yelp.drop( key, req.query, function(error, result){
      if (error) {
        res.send( error, 500);
      } else {
        res.json( result );
      }
    });
  };
  
  // return the controller so it can be used by koop
  return controller;

};

module.exports = Controller;

