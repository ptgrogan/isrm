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

define(["mas", "isrm", "jquery", "jquery-ui", "jquery.flot.min"], 
        function(mas, isrm, $) {
    var model = new isrm.Model({
        metaFlag: 1,
        ceStaffRatio: 1000,
        modCoverage: 0.5,
        archThroughput: 50,
    });
    
    $("#meta").attr('checked', true);
    $("#meta").change(function() {
        model.params.metaFlag = $(this).is(':checked')?1:0;
        model.entity('metaFlag').value = model.params.metaFlag;
        model.params.ceStaffRatio = $(this).is(':checked')?1000:10;
        model.entity('ceStaffRatio').value = model.params.ceStaffRatio;
        model.params.modCoverage = $(this).is(':checked')?0.5:0;
        model.entity('modCoverage').value = model.params.modCoverage;
        model.params.archThroughput = $(this).is(':checked')?50:10;
        model.entity('archThroughput').value = model.params.archThroughput;
    });
    
    var numBurnIn = 5;
    $("#numBurnIn").val(numBurnIn);
    var numTrials = 20;
    $("#numTrials").val(numTrials);
    
    $("#numBurnIn").change(function() {
        if($.isNumeric($("#numBurnIn").val())) {
            numBurnIn = parseFloat($("#numBurnIn").val());
        } else {
            $("#numBurnIn").val(numBurnIn);
        }
    });
    
    $("#numTrials").change(function() {
        if($.isNumeric($("#numTrials").val())) {
            numTrials = parseFloat($("#numTrials").val());
        } else {
            $("#numTrials").val(numTrials);
        }
    });
    var locPlot = $.plot('#locPlaceholder', [{
            data: [],
            bars: {
                show: true
            }
        }]
    );
        
    var remPlot = $.plot('#remPlaceholder', [{
            data: [],
            bars: {
                show: true
            }
        }]
    );
    
    var qryPlot = $.plot('#qryPlaceholder', [{
            data: [],
            bars: {
                show: true
            }
        }]
    );
    $('#qryPath').val('/data');
    
    $('#locExecute').click(runLocal);
    $('#remExecute').click(runRemote);
    $('#qryExecute').click(runQuery);
    
    function setNumericVal(object, id, name) {
        var value = $("#"+id).val();
        if($.isNumeric(value)) {
            var val = parseFloat(value);
            object[name] = val;
        }
        $("#"+id).val(object[name]);
    };
    
    function runRemote() {
        var plotData = [];
        var exeTime = [];
        var initTime = 0;
        var data = {
            'model': model.name,
            'version': model.version+'b',
            'settings': {
                'init': 0,
                'max': 120,
                'step': 0.25,
                'method': 'euler',
            },
            'params': model.params
        };
        
        function execute() {
            var initTime = new Date();
            $.ajax({
                type: "POST",
                url: "/execute",
                data: JSON.stringify(data),
                contentType: "application/json"
            }).done(function(msg) {
                exeTime.push(new Date() - initTime);
                plotData.push([exeTime.length-1, exeTime[exeTime.length-1]]);
                
                remPlot.setData([{
                    data: plotData,
                    bars: {
                        show: true
                    }
                }]);
                remPlot.setupGrid();
                remPlot.draw();
            
                var totalTime = 0;
                for(var i = 0; i < exeTime.length; i++) {
                    totalTime += exeTime[i];
                }
                var meanTime = totalTime/exeTime.length;
                var sumSquareError = 0;
                for(var i = 0; i < exeTime.length; i++) {
                    sumSquareError += (exeTime[i] - meanTime)*(exeTime[i] - meanTime);
                }
                var stdDeviation = sumSquareError / exeTime.length;
                var stdError = stdDeviation / Math.sqrt(exeTime.length);
                document.getElementById('remNumTrials').innerHTML = exeTime.length;
                document.getElementById('remMeanTime').innerHTML = meanTime.toPrecision(3) + ' ms';
                document.getElementById('remStdError').innerHTML = stdError.toPrecision(3) + ' ms';

                if(exeTime.length < numTrials) {
                    setTimeout(function() { execute(); }, 5);
                }
            });
        }
        
        execute();
    };
    
    function runLocal() {
        var plotData = [];
        var exeTime = [];
        var initTime = 0;
        
        var sim = new mas.sim.LoggingSimulator({
            entities: model.entities,
            initTime: 0, 
            maxTime: 120, 
            timeStep: 0.25
        });
        sim.on('init', function(time) { 
            initTime = new Date();
        });
        for(var i = 0; i < numBurnIn; i++) {
            sim.execute();
        }
        sim.on('complete', function(time) { 
            var data = {
                'model': model.name,
                'version': model.version+'b',
                'settings': {
                    'init': sim.initTime,
                    'max': sim.maxTime,
                    'step': sim.timeStep,
                    'method': 'euler'
                },
                'params': model.params
            };
            // append simulation outputs to data
            data.outputs = {
                time: sim.log['time']
            };
            data.finalOutputs = {
                time: sim.log['time'][sim.log['time'].length-1]
            };
            for(var entity in sim.log) {
                if(model.entity(entity) instanceof mas.sd.Flow
                        || model.entity(entity) instanceof mas.sd.Stock) {
                    data.outputs[entity] = sim.log[entity];
                    data.finalOutputs[entity] = sim.log[entity][sim.log[entity].length-1];
                }
            }
            
            // post results to service
            $.ajax({
                type: "POST",
                url: "/results",
                data: JSON.stringify(data),
                contentType: "application/json"
            }).done(function(msg) {
                exeTime.push(new Date() - initTime);
                plotData.push([exeTime.length-1, exeTime[exeTime.length-1]]);
                
                locPlot.setData([{
                    data: plotData,
                    bars: {
                        show: true
                    }
                }]);
                locPlot.setupGrid();
                locPlot.draw();
            
                var totalTime = 0;
                for(var i = 0; i < exeTime.length; i++) {
                    totalTime += exeTime[i];
                }
                var meanTime = totalTime/exeTime.length;
                var sumSquareError = 0;
                for(var i = 0; i < exeTime.length; i++) {
                    sumSquareError += (exeTime[i] - meanTime)*(exeTime[i] - meanTime);
                }
                var stdDeviation = sumSquareError / exeTime.length;
                var stdError = stdDeviation / Math.sqrt(exeTime.length);
                document.getElementById('locNumTrials').innerHTML = exeTime.length;
                document.getElementById('locMeanTime').innerHTML = meanTime.toPrecision(3) + ' ms';
                document.getElementById('locStdError').innerHTML = stdError.toPrecision(3) + ' ms';

                if(exeTime.length < numTrials) {
                    setTimeout(function() { sim.execute(); }, 5);
                }
            });
        });
        
        sim.execute();
    };
    
    function runQuery() {
        var plotData = [];
        var exeTime = [];
        var initTime = 0;
        
        function execute() {
            var initTime = new Date();
            $.get(document.getElementById('qryPath').value, '', function(res) {
                exeTime.push(new Date() - initTime);
                plotData.push([exeTime.length-1, exeTime[exeTime.length-1]]);
                
                qryPlot.setData([{
                    data: plotData,
                    bars: {
                        show: true
                    }
                }]);
                qryPlot.setupGrid();
                qryPlot.draw();
            
                var totalTime = 0;
                for(var i = 0; i < exeTime.length; i++) {
                    totalTime += exeTime[i];
                }
                var meanTime = totalTime/exeTime.length;
                var sumSquareError = 0;
                for(var i = 0; i < exeTime.length; i++) {
                    sumSquareError += (exeTime[i] - meanTime)*(exeTime[i] - meanTime);
                }
                var stdDeviation = sumSquareError / exeTime.length;
                var stdError = stdDeviation / Math.sqrt(exeTime.length);
                document.getElementById('qryNumTrials').innerHTML = exeTime.length;
                document.getElementById('qryMeanTime').innerHTML = meanTime.toPrecision(3) + ' ms';
                document.getElementById('qryStdError').innerHTML = stdError.toPrecision(3) + ' ms';

                if(exeTime.length < numTrials) {
                    setTimeout(function() { execute(); }, 5);
                }
            });
        }
        
        execute();
    };
});