/*
 * Copyright 2015 Paul T. Grogan, Massachusetts Institute of Technology
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var express = require('express');
var router = express.Router();

function recurse(dot, obj, current) {
  for(var key in obj) {
    var value = obj[key];
    var newKey = (current ? current + "." + key : key);  // joined key with dot
    if(value && typeof value === "object") {
        recurse(dot, value, newKey);  // it's a nested object, so do it again
    } else {
        if(newKey==="model" || newKey==="version" || newKey==="settings.method") {
            dot[newKey] = value;  // it's not an object, so set the property
        } else {
            dot[newKey] = Number(value);
        }
    }
  }
}

/* GET [id] and [tag] of the results matching a query. */
router.get('/', function(req, res) {
    // based on http://stackoverflow.com/questions/13218745/convert-complex-json-object-to-dot-notation-json-object
    var dot = {};
    recurse(dot, req.query);
    
    req.db.collection('results').find(dot, {'_id':1,'tag':1}).toArray(function(err, items) {
        res.json(items);
    });
});

/* GET data element. */
router.get('/:id', function(req, res) {
  req.db.collection('results').findById(req.params.id, {'_id':0}, function(err, item) {
    res.json(item);
  });
});

/* GET [id] and [property] of the results matching a query.
router.get('/:id/:property', function(req, res) {
    // based on http://stackoverflow.com/questions/13218745/convert-complex-json-object-to-dot-notation-json-object
    
    var query = {'_id':0};
    query[req.params.property] = 1;
    
    req.db.collection('results').findById(req.params.id, query), function(err, item) {
        res.json(item);
    });
}); */

/* GET data element settings. */
router.get('/:id/settings', function(req, res) {
  req.db.collection('results').findById(req.params.id, {'settings':1,'_id':0}, function(err, item) {
    if(item===null || item.settings===undefined) {
        res.json(null);
    } else {
        res.json(item.settings);
    }
  });
});

/* GET data element params. */
router.get('/:id/params', function(req, res) {
  req.db.collection('results').findById(req.params.id, {'params':1,'_id':0}, function(err, item) {
    if(item===null || item.params===undefined) {
        res.json(null);
    } else {
        res.json(item.params);
    }
  });
});

/* GET data element params. */
router.get('/:id/params/:param', function(req, res) {
  req.db.collection('results').findById(req.params.id, {'params':1,'_id':0}, function(err, item) {
    if(item===null || item.params===undefined || req.params.param===undefined) {
        res.json(null);
    } else {
        res.json(item.params[req.params.param]);
    }
  });
});

/* GET data element params. */
router.get('/:id/tag', function(req, res) {
  req.db.collection('results').findById(req.params.id, {'tag':1,'_id':0}, function(err, item) {
    if(item===null || item.tag===undefined) {
        res.json(null);
    } else {
        res.json(item.tag);
    }
  });
});

/* GET data element params. */
router.get('/:id/tag/name', function(req, res) {
  req.db.collection('results').findById(req.params.id, {'tag':1,'_id':0}, function(err, item) {
    if(item===null || item.tag===undefined || item.tag.name===undefined) {
        res.json(null);
    } else {
        res.json(item.tag.name);
    }
  });
});

/* GET data element params. */
router.get('/:id/tag/color', function(req, res) {
  req.db.collection('results').findById(req.params.id, {'tag':1,'_id':0}, function(err, item) {
    if(item===null || item.tag===undefined || item.tag.color===undefined) {
        res.json(null);
    } else {
        res.json(item.tag.color);
    }
  });
});

/* GET data element outputs. */
router.get('/:id/outputs', function(req, res) {
  req.db.collection('results').findById(req.params.id, {'outputs':1,'_id':0}, function(err, item) {
    if(item===null || item.outputs===undefined) {
        res.json(null);
    } else {
        res.json(item.outputs);
    }
  });
});

/* GET data element entry. */
router.get('/:id/outputs/:output', function(req, res) {
  req.db.collection('results').findById(req.params.id, {'outputs':1,'_id':0}, function(err, item) {
    if(item===null || item.outputs===undefined || item.outputs[req.params.output]===undefined) {
        res.json(null);
    } else {
        res.json(item.outputs[req.params.output]);
    }
  });
});

/* GET data element entry. */
router.get('/:id/outputs/:output/time/:time', function(req, res) {
  req.db.collection('results').findById(req.params.id, {'outputs':1,'_id':0}, function(err, item) {
    if(item===null || item.outputs===undefined || item.outputs[req.params.output]===undefined) {
        res.json(null);
    } else {
        res.json(item.outputs[req.params.output][item.outputs.time.indexOf(Number(req.params.time))]);
    }
  });
});

/* GET data element outputs. */
router.get('/:id/finalOutputs', function(req, res) {
  req.db.collection('results').findById(req.params.id, {'finalOutputs':1,'_id':0}, function(err, item) {
    if(item===null || item.finalOutputs===undefined) {
        res.json(null);
    } else {
        res.json(item.finalOutputs);
    }
  });
});

/* GET data element entry. */
router.get('/:id/finalOutputs/:output', function(req, res) {
  req.db.collection('results').findById(req.params.id, {'finalOutputs':1,'_id':0}, function(err, item) {
    if(item===null || item.finalOutputs===undefined 
            || item.finalOutputs[req.params.output]===undefined) {
        res.json(null);
    } else {
        res.json(item.finalOutputs[req.params.output]);
    }
  });
});

/* POST to data list. */
router.post('/', function(req, res) {
    req.db.collection('results').update(
        {
            model: req.body.model,
            version: req.body.version,
            settings: req.body.settings,
            params: req.body.params
        }, req.body,
        { upsert: true },
        function(err, result) {
            if(err===null) {
                console.log(result);
            } else {
                console.log(err);
            }
            res.send((err===null)?{msg:''}:{msg:err});
        }
    );
    /*
    req.db.collection('results').insert(req.body, function(err, result) {
        if(err===null) {
            console.log(result);
        } else {
            console.log(err);
        }
        res.send((err===null)?{msg:''}:{msg:err});
    });
    */
});

var mongo = require('mongoskin');

/* POST to data list. */
router.post('/:id/tag/name/:tag', function(req, res) {
    req.db.collection('results').update(
        { _id: mongo.helper.toObjectID(req.params.id) }, 
        {$set: {'tag.name': req.params.tag}},
        function(err, result) {
            if(err===null) {
                console.log('result: ' + result);
            } else {
                console.log(err);
            }
            res.send((err===null)?{msg:''}:{msg:err});
        }
    );
});

/* POST to data list. */
router.post('/:id/tag/color/:color', function(req, res) {
    req.db.collection('results').update(
        { _id: mongo.helper.toObjectID(req.params.id) }, 
        {$set: {'tag.color': req.params.color}},
        function(err, result) {
            if(err===null) {
                console.log('result: ' + result);
            } else {
                console.log(err);
            }
            res.send((err===null)?{msg:''}:{msg:err});
        }
    );
});

router.delete('/:id/tag/name', function(req, res) {
    req.db.collection('results').update(
        { _id: mongo.helper.toObjectID(req.params.id) }, 
        {$unset: {'tag.name': ""}},
        function(err, result) {
            if(err===null) {
                console.log('result: ' + result);
            } else {
                console.log(err);
            }
            res.send((err===null)?{msg:''}:{msg:err});
        }
    );
});

router.delete('/:id/tag/color', function(req, res) {
    req.db.collection('results').update(
        { _id: mongo.helper.toObjectID(req.params.id) }, 
        {$unset: {'tag.color': ""}},
        function(err, result) {
            if(err===null) {
                console.log('result: ' + result);
            } else {
                console.log(err);
            }
            res.send((err===null)?{msg:''}:{msg:err});
        }
    );
});

module.exports = router;
