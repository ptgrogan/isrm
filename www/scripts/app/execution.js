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

define(["mas", "isrm", "jquery"], function(mas, isrm, $) {
    var baseline = new isrm.Model();
    $("#initTime").val(0);
    $("#timeStep").val(0.25);
    $("#maxTime").val(120);
    $("#modelVersion").val(baseline.name + " v" + baseline.version);
    var ids = [];
    var vals = {};
    for(var param in baseline.params) {
        $('#parameters').append($('<option></option>').val(param).html(baseline.entity(param).name));
        vals[param] = [baseline.params[param]];
        ids.push(param);
    }
    generateLevels();
    
    $("#parameters").on("change", function() {
        var id = $("#parameters").val();
        $("#varyParameter").removeAttr('disabled');
        $("#fixVariable").attr('disabled','disabled');
        $("#variables").val([]);
        $("#minValue").attr('disabled','disabled');
        $("#maxValue").attr('disabled','disabled');
        $("#stepSize").attr('disabled','disabled');
        $("#levelValue").attr('disabled','disabled');
        //$("#generateLevels").attr('disabled','disabled');
        //$("#resetLevels").attr('disabled','disabled');
        $("#defaultValue").val(baseline.params[id]);
        $("#minValue").val(baseline.params[id]);
        $("#maxValue").val(baseline.params[id]);
        $("#stepSize").val(0);
        $("#levels").find("option").remove();
        $("#levels").append($('<option></option>').val(baseline.params[id]).html(baseline.params[id]));
    });
    $("#varyParameter").on("click", function() {
        var id = $("#parameters").val();
        $("#parameters option[value='"+id+"']").remove();
        $("#variables").append($('<option></option>').val(id).html(baseline.entity(id).name));
        $("#variables").html($("#variables option").sort(function(a,b) { return ids.indexOf(a.value) - ids.indexOf(b.value); }));
        $("#variables").focus();
        $("#variables").val(id);
        $("#variables").trigger("change");
        $("#levelValue").val(2);
    });
    $("#variables").on("change", function() {
        var id = $("#variables").val();
        $("#parameters").val([]);
        $("#varyParameter").attr('disabled','disabled');
        $("#fixVariable").removeAttr('disabled');
        $("#minValue").removeAttr("disabled");
        $("#maxValue").removeAttr("disabled");
        $("#stepSize").removeAttr("disabled");
        //$("#generateLevels").removeAttr("disabled");
        //$("#resetLevels").removeAttr("disabled");
        $("#defaultValue").val(baseline.params[id]);
        $("#minValue").val(vals[id][0]);
        $("#maxValue").val(vals[id][vals[id].length-1]);
        $("#stepSize").val(vals[id].length>1?vals[id][1]-vals[id][0]:0);
        $("#levels").find("option").remove();
        for(var i in vals[id]) {
            $("#levels").append($('<option></option>').val(vals[id][i]).html(vals[id][i]));
        }
    });
    $("#fixVariable").on("click", function() {
        var id = $("#variables").val();
        $("#variables option[value='"+id+"']").remove();
        $("#parameters").append($('<option></option>').val(id).html(baseline.entity(id).name));
        $("#parameters").html($("#parameters option").sort(function(a,b) { return ids.indexOf(a.value) - ids.indexOf(b.value); }));
        $("#levels").find('option').remove();
        vals[id] = [baseline.params[id]];
        $("#parameters").focus();
        $("#parameters").val(id);
        $("#parameters").trigger("change");
    });
    $("#fixVariable").on("click", generateLevels);
    $("#minValue").change(function() {
        var minValue = Number($("#minValue").val());
        var maxValue = Number($("#maxValue").val());
        if(minValue>maxValue) {
            $("#maxValue").val(minValue);
        }
    });
    $("#minValue").change(generateLevels);
    $("#maxValue").change(generateLevels);
    $("#stepSize").change(generateLevels);
    // $("#generateRuns").on("click", generateRuns);
    $("#runs").on("change", function() {
        var data = $.parseJSON($("#runs").val());
        $("#runs").attr('disabled','disabled');
        $("#runID").val([]);
        $("#runTag").val([]);
        $("#runTag").attr('disabled','disabled');
        $("#updateTag").attr('disabled','disabled');
        $("#removeTag").attr('disabled','disabled');
        $("#execute").attr('disabled','disabled');
        if(data !== null) {
            $("#runParameters").val(JSON.stringify(data.params));
            $.get("/results", $.param(data), function(res) {
                if(res !== null && res.length === 1) {
                    $("#runID").val(res[0]._id);
                    $("#runTag").removeAttr("disabled");
                    if(res[0].tag !== undefined && res[0].tag.name !== undefined) {
                        $("#runTag").val(res[0].tag.name);
                        $("#removeTag").removeAttr("disabled");
                    }
                } else {
                    $("#execute").removeAttr("disabled");
                }
                $("#runs").removeAttr("disabled");
                $("#runs").focus();
            });
        }
    });
    $("#runTag").on("input propertychange paste", function() {
        $("#updateTag").removeAttr("disabled");
    });
    $("#updateTag").on("click", function() {
        $("#updateTag").attr('disabled','disabled');
        $("#removeTag").attr('disabled','disabled');
        $.post("/results/"+$("#runID").val()+"/tag/name/"+$("#runTag").val(), function() {
            $("#runs option:selected").html($("#runTag").val()+": " + $("#runs option:selected").html().split(": ")[1]);
            $("#removeTag").removeAttr("disabled");
        });
    });
    $("#removeTag").on("click", function() {
        $("#updateTag").attr('disabled','disabled');
        $("#removeTag").attr('disabled','disabled');
        $.ajax({
            type: "DELETE",
            url: "/results/"+$("#runID").val()+"/tag/name"
        }).done(function() {
            $("#runTag").val([]);
            $("#runs option:selected").html("Run "+($("#runs")[0].selectedIndex+1)+": " + $("#runs option:selected").html().split(": ")[1]);
        });
    });
    
    $("#execute").on("click", function() {
        execute($.parseJSON($("#runs").val()));
    });
    $("#executeAll").on("click", function() {
        $("#runs").attr('disabled','disabled');
        $("#execute").attr('disabled','disabled');
        $("#runs option").each(function() {
            var data = $.parseJSON(this.value);
            $.get("/results", $.param(data), function(res) {
                if(res === null || res.length === 0) {
                    execute(data);
                }
            });
        });
    });
    
    function generateLevels() {
        var id = $("#variables").val();
        vals[id] = [];
        $("#levels").find("option").remove();
        var minValue = Number($("#minValue").val());
        var maxValue = Number($("#maxValue").val());
        var stepSize = Number($("#stepSize").val());
        
        if(minValue <= maxValue && stepSize > 0) {
            for(var i = minValue; i <= maxValue; i += stepSize) {
                // limit digits to avoid imprecise floating point arithmetic
                var value = parseFloat(i.toFixed(6));
                $("#levels").append($('<option></option>').val(value).html(value));
                vals[id].push(value);
            }
        } else if(stepSize===0) {
            $("#levels").append($('<option></option>').val(minValue).html(minValue));
            vals[id].push(minValue);
        }
        generateRuns();
    }
    
    function resetLevels() {
        var id = $("#variables").val();
        vals[id] = [baseline.value(id)];
        $("#levels").find('option').remove();
        for(var i in vals[id]) {
            $("#levels").append($('<option></option>').val(vals[id][i]).html(vals[id][i]));
        }
    }
    
    function generateRuns() {
        $("#executeAll").attr('disabled','disabled');
        $("#runs").find('option').remove();
        var numTot = 1;
        var numVals = [];
        var cumVals = [];
        for(var i in vals) {
            numVals.push(vals[i].length);
            cumVals.push(numTot);
            numTot *= vals[i].length;
        }
        var valIndices = new Array(numTot);
        for(var i = 0; i < numTot; i++) {
            valIndices[i] = new Array(ids.length);
            var data = {
                'model': baseline.name,
                'version': baseline.version,
                'settings': {
                    'init': Number($("#initTime").val()),
                    'max': Number($("#maxTime").val()),
                    'step': Number($("#timeStep").val()),
                    'method': $("#integrationMethod").val()
                },
                'params': {}
            };
            for(var j = 0; j < ids.length; j++) {
                valIndices[i][j] = Math.floor(i/cumVals[j]) % numVals[j];
            }
            ids.forEach(function(id) {
                data.params[id] = vals[id][valIndices[i][ids.indexOf(id)]];
            });
            
            var setLabel = function(value, defaultPrefix, suffix) {
                return function(res) {
                    if(res === null 
                            || res.length === 0
                            || res[0].tag === undefined 
                            || res[0].tag.name === undefined) {
                        $("#runs").append($('<option></option>').val(value).html(defaultPrefix + suffix));
                    } else {
                        $("#runs").append($('<option></option>').val(value).html(res[0].tag.name + suffix));
                    }
                    if(res === null
                            || res.length === 0) {
                        $("#executeAll").removeAttr('disabled');
                    }
                }
            }
            $.get("/results", $.param(data), setLabel(JSON.stringify(data), "Run " + (i+1), ": " + JSON.stringify(valIndices[i])));
        }
        $("#runParameters").val([]);
    }
    
    function execute(data) {
        $('#mode').val()==='local'?executeLocal(data):executeRemote(data);
    }
    
    function executeLocal(data) {
        // instantiate model
        var model = new isrm.Model(data.params);
        
        // instantiate simulator
        var sim = new mas.sim.LoggingSimulator({
            initTime: data.settings.init,
            maxTime: data.settings.max,
            timeStep: data.settings.step,
            entities: model.entities
        });
        
        sim.on("complete", function() {
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
                $("#runs").trigger("change");
                $("#runs").removeAttr('disabled');
                $("#generateRuns").removeAttr('disabled');
            });
        });
        
        // execute simulation
        sim.execute();
    };
    
    function executeRemote(data) {
        $.ajax({
            type: "POST",
            url: "/execute",
            data: JSON.stringify(data),
            contentType: "application/json"
        }).done(function(msg) {
            $("#runs").trigger("change");
            $("#runs").removeAttr('disabled');
            $("#generateRuns").removeAttr('disabled');
        });
    };
});