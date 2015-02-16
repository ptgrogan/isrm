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

    var numBurnIn = 20;
    $("#numBurnIn").val(numBurnIn);
    var numTrials = 100;
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
    var simPlot = $.plot('#simPlaceholder', [{
            data: [],
            bars: {
                show: true
            }
        }]
    );
        
    var logPlot = $.plot('#logPlaceholder', [{
            data: [],
            bars: {
                show: true
            }
        }]
    );
    $('#simExecute').click(function() {
        run('sim', new mas.sim.Simulator({
            entities: model.entities,
            initTime: 0, 
            maxTime: 120, 
            timeStep: 0.25
        }), simPlot);
    });

    $('#logExecute').click(function() {
        run('log', new mas.sim.LoggingSimulator({
            entities: model.entities,
            initTime: 0, 
            maxTime: 120, 
            timeStep: 0.25
        }), logPlot);
    });

    function setNumericVal(object, id, name) {
        var value = $("#"+id).val();
        if($.isNumeric(value)) {
            var val = parseFloat(value);
            object[name] = val;
        }
        $("#"+id).val(object[name]);
    };

    function run(id, sim, plot) {
        var plotData = [];
        var exeTime = [];
        var initTime = 0;
        sim.on('init', function(time) { 
            initTime = new Date();
        });
        for(var i = 0; i < numBurnIn; i++) {
            sim.execute();
        }
        sim.on('complete', function(time) { 
            exeTime.push(new Date() - initTime);
            plotData.push([exeTime.length-1, exeTime[exeTime.length-1]]);
        });
        
        execute();
        
        function execute() {
            sim.execute();
            plot.setData([{
                data: plotData,
                bars: {
                    show: true
                }
            }]);
            plot.setupGrid();
            plot.draw();
        
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
            document.getElementById(id+'NumTrials').innerHTML = exeTime.length;
            document.getElementById(id+'MeanTime').innerHTML = meanTime.toPrecision(3) + ' ms';
            document.getElementById(id+'StdError').innerHTML = stdError.toPrecision(3) + ' ms';

            if(exeTime.length < numTrials) {
                setTimeout(execute, 5);
            }
        }
    };
});