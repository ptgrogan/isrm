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
    baseline.entities.forEach(function(entity) {
        if(entity instanceof mas.sd.Flow
                || (entity instanceof mas.sd.Stock 
                    && ! (entity instanceof mas.sd.Smooth) 
                    && ! (entity instanceof mas.sd.Delay1))) {
            $("#historyVars").append(
                $('<option></option>').val(entity.id).html(entity.name));
        }
    });
    $("#historyVars").val('nreCost');
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
        $("#runs").attr('disabled','disabled');
        $("#runTag").attr('disabled','disabled');
        $("#updateTag").attr('disabled','disabled');
        $("#removeTag").attr('disabled','disabled');
        ids = [];
        colors = [];
        $.get("/data/tag"+getFilter(), $.param(query), function(res) {
            if(res !== null) {
                res.forEach(function(item) {
                    ids.push(item._id);
                    $("#runs").append($('<option></option>').val(item._id).html((item.tag&&item.tag.name)?item.tag.name:item._id));
                    colors.push((item.tag&&item.tag.color)?item.tag.color:'#ff3333');
                });
            }
            $("#runs").removeAttr("disabled");
        });
    }
    
    $('#filterRuns').change(refreshRuns);
    function getFilter() {
        if($('#filterRuns').val()==='') {
            return '';
        }
        var filters = $('#filterRuns').val()
                .replace(new RegExp('\\s', 'g'), '')
                .replace(new RegExp('!=', 'g'), '=$ne')
                .replace(new RegExp('>=', 'g'), '=$gte')
                .replace(new RegExp('<=', 'g'), '=$lte')
                .replace(new RegExp('>', 'g'), '=$gt')
                .replace(new RegExp('<', 'g'), '=$lt')
                .split(new RegExp('[,;]', 'g'));
        return '?params.'+filters.join("&params.");
    }

    var plotColors = [];
    var plotData = {};

    var plot = $.plot("#plot", plotData, {
        plotData: {
            lines: {show: true},
            points: {show: false}
        },
        series: {
            shadowSize: 0
        },
        legend: {
            container: $('#legend')
        },
        grid: {
            hoverable: false
        },
        yaxis: {
            tickFormatter: (function formatter(val, axis) { return val>1e6?val.toExponential():parseFloat(val.toFixed(6)); })
        },
        colors: plotColors
    });

    $('#runs').change(updateHistory);
    $('#historyVars').change(updateHistory);

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
            $("#runParameters").val([]);
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
        $.post("/results/"+$("#runs").val()[0]+"/tag/name/"+$("#runTag").val(), function() {
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
            updateHistory();
        });
    };
    $("#removeTag").on("click", function() {
        $("#updateTag").attr('disabled','disabled');
        $("#removeTag").attr('disabled','disabled');
        $.ajax({
            type: "DELETE",
            url: "/results/"+$("#runs").val()[0]+"/tag/name"
        }).done(function() {
            $("#runTag").val([]);
            $("#runs option:selected").html($("#runs option:selected").val());
        });
    });
    $("#resetColor").on("click", function() {
        var id = $("#runs").val()[0];
        $("#resetColor").attr('disabled','disabled');
        $.ajax({
            type: "DELETE",
            url: "/results/"+id+"/tag/color"
        }).done(function() {
            $("#runColor").spectrum("set", '#ff3333');
            colors[ids.indexOf(id)] = $("#runColor").val();
            updateHistory();
        });
    });

    function updateHistory() {
        plotColors = [];
        plotData = [];
        if($("#runs").val() !== null) {
            for(var i = 0; i < $('#runs').val().length; i++) {
                var id = $('#runs').val()[i];
                plotColors[i] = colors[ids.indexOf(id)];
                plot.getOptions().colors = plotColors;
                plotData[i] = {
                    label: $("#runs :selected")[i].text,
                    data: [],
                }
                if($('#historyVars').val() !== null) {
                    getHistory(i);
                }
            }
        }
        function getHistory(i) {
            var id = $('#runs').val()[i];
            var varId = $('#historyVars').val();
            $.get('/results/'+id+'/outputs/time', function(res) {
                var time = res;
                $.get('/results/'+id+'/outputs/'+varId, function(res) {
                    var iMax = $("#runs").val().length - 1;
                    for(var k = 0; k < res.length; k++) {
                        plotData[i].data[k] = [time[k], res[k]];
                    }
                    if(i===iMax) {
                        plot.setData(plotData);
                        plot.setupGrid();
                        plot.draw();
                    }
                });
            });
        }
    };
});