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

define(["mas", "isrm", "jquery", "spectrum", "jquery.flot.min", "jquery.flot.selection.min"], 
        function(mas, isrm, $) {
    var baseline = new isrm.Model();
    baseline.entities.forEach(function(entity) {
        if(entity instanceof mas.sd.Parameter
                || (entity instanceof mas.sd.Stock 
                    && ! (entity instanceof mas.sd.Smooth) 
                    && ! (entity instanceof mas.sd.Delay1))) {
            $("#xAxisVariable").append(
                $('<option></option>').val(entity.id).html(entity.name));
            $("#yAxisVariable").append(
                $('<option></option>').val(entity.id).html(entity.name));
        }
    });
    $("#xAxisVariable").val('nreCost');
    $("#xAxisVariable").change(updateTradespace);
    $("#yAxisVariable").val('projDuration');
    $("#yAxisVariable").change(updateTradespace);
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

    var plotData = [[]];
    var colors = [];
    var ids = [];

    var plot = $.plot("#tradespace", plotData, {
        series: {
            points: { show: true },
            lines: { show: false },
            shadowSize: 0
        },
        legend: {
            show: false
        },
        grid: {
            hoverable: true,
            clickable: true
        },
        selection: {
            mode: "xy"
        },
        xaxis: {
            tickFormatter: (function formatter(val, axis) { return val>1e6?val.toExponential():parseFloat(val.toFixed(6)); }),
        },
        yaxis: {
            tickFormatter: (function formatter(val, axis) { return val>1e6?val.toExponential():parseFloat(val.toFixed(6)); }),
        },
        colors: colors
    });

    var overview = $.plot("#overview", plotData, {
        legend: {
            show: false
        },
        series: {
            points: { show: true, radius: 1 },
            shadowSize: 0
        },
        xaxis: {
            show: false,
            min: 0
        },
        yaxis: {
            show: false,
            min: 0
        },
        grid: {
            color: "#999"
        },
        selection: {
            mode: "xy"
        },
        colors: colors
    });

    $("#tradespace").bind("plotselected", function (event, ranges) {
        if (ranges.xaxis.to - ranges.xaxis.from < 0.00001) {
            ranges.xaxis.to = ranges.xaxis.from + 0.00001;
        }

        if (ranges.yaxis.to - ranges.yaxis.from < 0.00001) {
            ranges.yaxis.to = ranges.yaxis.from + 0.00001;
        }

        plot = $.plot("#tradespace", plotData,
            $.extend(true, {}, {
                series: {
                    points: { show: true },
                    lines: { show: false },
                    shadowSize: 0
                },
                legend: {
                    show: false
                },
                grid: {
                    hoverable: true,
                    clickable: true
                },
                selection: {
                    mode: "xy"
                },
                colors: colors
            }, {
                xaxis: { min: ranges.xaxis.from, max: ranges.xaxis.to, tickFormatter: (function formatter(val, axis) { return val>1e6?val.toExponential():parseFloat(val.toFixed(6)); }) },
                yaxis: { min: ranges.yaxis.from, max: ranges.yaxis.to, tickFormatter: (function formatter(val, axis) { return val>1e6?val.toExponential():parseFloat(val.toFixed(6)); }) }
            })
        );
        overview.setSelection(ranges, true);
    });

    refreshRuns();

    $("#overview").bind("plotselected", function (event, ranges) {
        plot.setSelection(ranges);
    });

    $("#tradespace").bind("plotclick", function(event, pos, item) {
        if(item) {
            plot.unhighlight();
            plot.highlight(item.series, item.datapoint);
            
            $("#runs").val(ids[item.seriesIndex]);
            $("#runs").trigger("change");
        }
    });

    function updateTradespace() {
        plotData = [];
        for(var i = 0; i < ids.length; i++) {
            plotData[i] = {data:[], label:ids[i]};
        }
        var xVar = $("#xAxisVariable").val();
        var yVar = $("#yAxisVariable").val();
        getValues(xVar, function(res) {
            var x = [];
            for(var i = 0; i < res.length; i++) {
                if(baseline.entity(xVar) instanceof mas.sd.Stock) {
                    x[i] = res[i].finalOutputs[xVar];
                } else if(baseline.entity(xVar) instanceof mas.sd.Parameter) {
                    x[i] = res[i].params[xVar];
                }
            }
            getValues(yVar, function(res) {
                var y = [];
                for(var i = 0; i < res.length; i++) {
                    if(baseline.entity(yVar) instanceof mas.sd.Stock) {
                        y[i] = res[i].finalOutputs[yVar];
                    } else if(baseline.entity(yVar) instanceof mas.sd.Parameter) {
                        y[i] = res[i].params[yVar];
                    }
                    plotData[i] = {data: [[x[i], y[i]]], label: res[i]._id};
                }
                plot.getOptions().colors = colors;
                plot.getOptions().xaxis.min = {};
                plot.getOptions().xaxis.max = {};
                plot.getOptions().yaxis.min = {};
                plot.getOptions().yaxis.max = {};
                plot.setData(plotData);
                plot.setupGrid();
                plot.draw();
                overview.getOptions().colors = colors;
                overview.setData(plotData);
                overview.setupGrid();
                overview.draw();
            });
        });
        
        function getValues(varId, callback) {
            var query = {
                model: baseline.name,
                version: baseline.version,
                settings: {
                    init: Number($("#initTime").val()),
                    step: Number($("#timeStep").val()),
                    max: Number($("#maxTime").val())
                }
            }
            if(baseline.entity(varId) instanceof mas.sd.Stock) {
                $.get("/data/finalOutputs/"+varId+getFilter(), $.param(query), callback);
            } else if(baseline.entity(varId) instanceof mas.sd.Parameter) {
                $.get("/data/params/"+varId+getFilter(), $.param(query), callback);
            }
        }
    }

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
                updateTradespace();
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

    $("#runs").on("change", function() {
        var id = $("#runs").val();
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
            
            plot.unhighlight();
            plot.highlight(ids.indexOf(id), 0);
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
        var id = $("#runs").val();
        $("#resetColor").attr('disabled','disabled');
        $("#runColor").spectrum("disable");
        $.post("/results/"+id+"/tag/color/"+$("#runColor").val().replace('#','%23'), function() {
            colors[ids.indexOf(id)] = $("#runColor").val();
            $("#resetColor").removeAttr("disabled");
            $("#runColor").spectrum("enable");
            plot.getOptions().colors = colors;
            plot.setData(plotData);
            plot.draw();
            overview.getOptions().colors = colors
            overview.setData(plotData);
            overview.draw();
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
            plot.getOptions().colors = colors;
            plot.setData(plotData);
            plot.draw();
            overview.getOptions().colors = colors;
            overview.setData(plotData);
            overview.draw();
        });
    });
});