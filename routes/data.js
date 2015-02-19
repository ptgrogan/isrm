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
        } else if(value.indexOf("$lte")===0) {
            dot[newKey] = { $lte: Number(value.substring(4)) };
        } else if(value.indexOf("$gte")===0) {
            dot[newKey] = { $gte: Number(value.substring(4)) };
        } else if(value.indexOf("$lt")===0) {
            dot[newKey] = { $lt: Number(value.substring(3)) };
        } else if(value.indexOf("$gt")===0) {
            dot[newKey] = { $gt: Number(value.substring(3)) };
        } else if(value.indexOf("$ne")===0) {
            dot[newKey] = { $ne: Number(value.substring(3)) };
        } else {
            dot[newKey] = Number(value);
        }
    }
  }
}

/* GET [id] of the results matching a query. */
router.get('/', function(req, res) {
    // based on http://stackoverflow.com/questions/13218745/convert-complex-json-object-to-dot-notation-json-object
    var dot = {};
    recurse(dot, req.query);
    
    req.db.collection('results').find(dot, {'_id':1}).toArray(function(err, items) {
        res.json(items);
    });
});

/* GET [id] and [param] of the results matching a query. */
router.get('/tag', function(req, res) {
    // based on http://stackoverflow.com/questions/13218745/convert-complex-json-object-to-dot-notation-json-object
    var dot = {};
    recurse(dot, req.query);
    
    var query = {'_id':1, 'tag': 1};
    
    req.db.collection('results').find(dot, query).toArray(function(err, items) {
        res.json(items);
    });
});

/* GET [id] and [param] of the results matching a query. */
router.get('/params/:param', function(req, res) {
    // based on http://stackoverflow.com/questions/13218745/convert-complex-json-object-to-dot-notation-json-object
    var dot = {};
    recurse(dot, req.query);
    
    var query = {'_id':1};
    query['params.'+req.params.param] = 1;
    
    req.db.collection('results').find(dot, query).toArray(function(err, items) {
        res.json(items);
    });
});

/* GET [id] and [param] of the results matching a query. */
router.get('/outputs/:output', function(req, res) {
    // based on http://stackoverflow.com/questions/13218745/convert-complex-json-object-to-dot-notation-json-object
    var dot = {};
    recurse(dot, req.query);
    
    var query = {'_id':1};
    query['outputs.'+req.params.output] = 1;
    
    req.db.collection('results').find(dot, query).toArray(function(err, items) {
        res.json(items);
    });
});

/* GET [id] and [param] of the results matching a query. */
router.get('/outputs/:output/time/:time', function(req, res) {
    // based on http://stackoverflow.com/questions/13218745/convert-complex-json-object-to-dot-notation-json-object
    var dot = {};
    recurse(dot, req.query);
    
    var query = {'_id':1};
    query['outputs.time'] = 1;
    query['outputs.'+req.params.output+'.'] = 1;
    
    req.db.collection('results').find(dot, query).toArray(function(err, items) {
        for(var i = 0; i < items.length; i++) {
            var timeIndex = items[i].outputs.time.indexOf(Number(req.params.time));
            items[i].outputs.time = items[i].outputs.time[timeIndex];
            items[i].outputs[req.params.output] = items[i].outputs[req.params.output][timeIndex];
        }
        res.json(items);
    });
});

/* GET data element outputs. */
router.get('/finalOutputs/:output', function(req, res) {
    // based on http://stackoverflow.com/questions/13218745/convert-complex-json-object-to-dot-notation-json-object
    var dot = {};
    recurse(dot, req.query);
    
    var query = {'_id':1};
    query['finalOutputs.'+req.params.output] = 1;
    
    req.db.collection('results').find(dot, query).toArray(function(err, items) {
        res.json(items);
    });
});

module.exports = router;
