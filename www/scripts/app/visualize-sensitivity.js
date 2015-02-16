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

define(["mas", "isrm", "jquery", "spectrum", "jquery.flot.min"], 
        function(mas, isrm, $) {
    var baseline = new isrm.Model();
    $("#initTime").val(0);
    $("#timeStep").val(0.25);
    $("#maxTime").val(120);
    $("#modelVersion").val(baseline.name + " v" + baseline.version);

    $("#runColor").spectrum({
        disabled: true,
        color: '#ff3333',
        preferredFormat: "hex",
        showInput: true,
        change: updateColor,
    });

    var colors = [];
    var ids = [];

    baseline.entities.forEach(function(entity) {
        if(entity instanceof mas.sd.Parameter
                || (entity instanceof mas.sd.Stock 
                    && ! (entity instanceof mas.sd.Smooth) 
                    && ! (entity instanceof mas.sd.Delay1))) {
            $("#sensitivityVariables").append(
                $('<option></option>').val(entity.id).html(entity.name));
        }
    });

    refreshRuns();

    function refreshRuns() {
        var query = {
            model: baseline.name,
            version: baseline.version,
            settings: {
                init: Number($("#initTime").val()),
                step: Number($("#timeStep").val()),
                max: Number($("#maxTime").val())
            }
        }
        $("#runs").find('option').remove();
        $("#baselineRun").find('option').remove();
        $("#runs").attr('disabled','disabled');
        $("#baselineRun").attr('disabled','disabled');
        $("#runTag").attr('disabled','disabled');
        $("#updateTag").attr('disabled','disabled');
        $("#removeTag").attr('disabled','disabled');
        ids = [];
        colors = [];
        $.get("/data/tag", $.param(query), function(res) {
            if(res !== null) {
                res.forEach(function(item) {
                    ids.push(item._id);
                    $("#baselineRun").append($('<option></option>').val(item._id).html((item.tag&&item.tag.name)?item.tag.name:item._id));
                    $("#runs").append($('<option></option>').val(item._id).html((item.tag&&item.tag.name)?item.tag.name:item._id));
                    colors.push((item.tag&&item.tag.color)?item.tag.color:'#ff3333');
                });
            }
            $("#runs").removeAttr("disabled");
            $("#baselineRun").removeAttr("disabled");
        });
    }

    $("#runs").on("change", function() {
        if($("#runs").val().length===1) {
            var id = $("#runs").val()[0];
            $("#runs").attr('disabled','disabled');
            $("#runID").val(id);
            if($("#runs option:selected").text()===id) {
                $("#runTag").val([]);
                $("#removeTag").attr('disabled','disabled');
            } else {
                $("#runTag").val($("#runs option:selected").text());
                $("#removeTag").removeAttr('disabled');
            }
            if(id !== null) {
                $("#runColor").spectrum("enable");
                $("#resetColor").removeAttr('disabled');
                $("#runColor").spectrum("set", colors[ids.indexOf(id)]);
                
                $.get("/results/"+id+"/params", function(res) {
                    $("#runParameters").val(JSON.stringify(res));
                    $("#runs").removeAttr("disabled");
                    $("#runs").focus();
                    $("#runTag").removeAttr('disabled');
                });
            }
        } else {
            $("#runID").val([]);
            $("#runTag").val([]);
            $("#runTag").attr('disabled','disabled');
            $("#removeTag").attr('disabled','disabled');
            $("#runColor").spectrum("set", '#999999');
            $("#runColor").spectrum("disable");
            $("#resetColor").attr('disabled','disabled');
        }
    });
    $("#runTag").on("input propertychange paste", function() {
        $("#updateTag").removeAttr("disabled");
    });
    $("#updateTag").on("click", function() {
        $("#updateTag").attr('disabled','disabled');
        $("#removeTag").attr('disabled','disabled');
        $.post("/results/"+$("#runs").val()+"/tag/name/"+$("#runTag").val(), function() {
            $("#runs option:selected").html($("#runTag").val());
            $("#removeTag").removeAttr("disabled");
        });
    });
    function updateColor() {
        var id = $("#runs").val()[0];
        $("#resetColor").attr('disabled','disabled');
        $("#runColor").spectrum("disable");
        $.post("/results/"+id+"/tag/color/"+$("#runColor").val().replace('#','%23'), function() {
            colors[ids.indexOf(id)] = $("#runColor").val();
            $("#resetColor").removeAttr("disabled");
            $("#runColor").spectrum("enable");
            updateSensitivity();
        });
    };
    $("#removeTag").on("click", function() {
        $("#updateTag").attr('disabled','disabled');
        $("#removeTag").attr('disabled','disabled');
        $.ajax({
            type: "DELETE",
            url: "/results/"+$("#runs").val()+"/tag/name"
        }).done(function() {
            $("#runTag").val([]);
            $("#runs option:selected").html($("#runs option:selected").val());
        });
    });
    $("#resetColor").on("click", function() {
        var id = $("#runs").val();
        $("#resetColor").attr('disabled','disabled');
        $.ajax({
            type: "DELETE",
            url: "/results/"+$("#runs").val()+"/tag/color"
        }).done(function() {
            $("#runColor").spectrum("set", '#ff3333');
            colors[ids.indexOf(id)] = $("#runColor").val();
            updateSensitivity();
        });
    });

    $("#baselineRun").change(updateSensitivity);
    $("#runs").change(updateSensitivity);

    var plotData = [[]];
    var ticks = [];
    var plot = $.plot("#plot", plotData, {
        series: {
            bars: {
                show: true,
            }
        },
        bars: {
            horizontal: true,
        },
        yaxis: {
            ticks: ticks,
            tickFormatter: (function formatter(val, axis) { return val>1e6?val.toExponential():parseFloat(val.toFixed(6)); }),
        },
        xaxis: {
            tickFormatter: (function formatter(val, axis) { return (val*100).toFixed(0)+"%"}),
        },
        legend: {
            container: $('#legend')
        },
        grid: {
            hoverable: false
        }
    });
    $("#sensitivityVariables").change(updateSensitivity);

    function updateSensitivity() {
        plotData = [];
        ticks = [];
        var id1 = $("#baselineRun").val();
        if($("#runs").val()!==null) {
            if($("#sensitivityVariables").val()!==null) {
                for(var j = 0; j < $("#sensitivityVariables").val().length; j++) {
                    var val = $("#sensitivityVariables").val()[j];
                    var jMax = $("#sensitivityVariables").val().length - 1;
                    ticks[jMax-j] = [jMax-j, baseline.entity(val).name];
                };
                plot.getOptions().yaxes[0].ticks = ticks;
                plot.getOptions().series.bars.barWidth = 1/$("#runs").val().length;
            }
            for(var i = 0; i < $("#runs").val().length; i++) {
                var numVar = $("#sensitivityVariables").val()===null?0:$("#sensitivityVariables").val().length;
                var iMax = $("#runs").val().length - 1;
                plotData[i] = {
                    label: $("#runs :selected")[i].text,
                    data: []
                };
                var id = $("#runs").val()[i];
                plot.getOptions().colors[i] = colors[ids.indexOf(id)];
                for(var j = 0; j < numVar; j++) {
                    setValue1(i, j);
                }
            }
        }
        
        function setValue1(i, j) {
            var id1 = $("#baselineRun").val();
            var varId = $("#sensitivityVariables").val()[j];
            getValue(id1, varId, function(value) {
                setValue2(value, i, j);
            });
        }
        
        function setValue2(baseline, i, j) {
            var varId = $("#sensitivityVariables").val()[j];
            var id2 = $("#runs").val()[i];
            getValue(id2, varId, function(value) {
                var iMax = $("#runs").val().length - 1;
                var jMax = $("#sensitivityVariables").val().length - 1;
                plotData[i].data[j] = [
                        baseline===0?0:(value-baseline)/baseline,
                        (jMax-j) - 0.5 + 1.0*(iMax-i)/(iMax+1)];
                if(i===iMax && j===jMax) {
                    plot.setData(plotData);
                    plot.setupGrid();
                    plot.draw();
                }
            });
        }
        
        function getValue(id, varId, callback) {
            if(baseline.entity(varId) instanceof mas.sd.Stock) {
                $.get("/results/"+id+"/outputs/"+varId, function(res) {
                    callback(res[res.length-1]);
                });
            } else if(baseline.entity(varId) instanceof mas.sd.Parameter) {
                $.get("/results/"+id+"/params/"+varId, function(res) {
                    callback(res);
                });
            }
        }
    }
});