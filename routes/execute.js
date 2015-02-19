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

var mas = require('mas');
var isrm = require('../www/scripts/lib/isrm');

/* POST execution test. */
router.post('/', function(req, res) {
    if(req.body.model !== undefined
            && req.body.version !== undefined
            && req.body.params !== undefined
            && req.body.settings !== undefined
            && req.body.settings.init !== undefined
            && req.body.settings.max !== undefined
            && req.body.settings.step !== undefined) {
        var data = req.body;
        var model = new isrm.Model(data.params);
        var sim = new mas.sim.LoggingSimulator({
            initTime: data.settings.init,
            maxTime: data.settings.max,
            timeStep: data.settings.step,
            entities: model.entities,
        });
        sim.on('complete', function() {
            // append simulation outputs to data
            data.outputs = {
                time: sim.log['time']
            };
            data.finalOutputs = {
                time: sim.log['time'][sim.log['time'].length-1]
            };
            for(var entity in sim.log) {
                if(model.entity(entity) instanceof mas.sd.Flow
                        || model.entity(entity) instanceof mas.sd.Stock
                        && !(model.entity(entity) instanceof mas.sd.Delay1)
                        && !(model.entity(entity) instanceof mas.sd.Smooth)) {
                    data.outputs[entity] = sim.log[entity];
                    data.finalOutputs[entity] = sim.log[entity][sim.log[entity].length-1];
                }
            }
            
            req.db.collection('results').findAndModify(
                {
                    model: data.model,
                    version: data.version,
                    settings: data.settings,
                    params: data.params
                },
                [['_id','asc']],
                data,
                { new: true, upsert: true },
                function(err, doc) {
                    if(err===null) {
                        console.log(doc._id);
                    } else {
                        console.log(err);
                    }
                    res.send((err===null)?{'_id': doc._id}:{err:err});
                }
            );
        });
        sim.execute();
    }
});

module.exports = router;
