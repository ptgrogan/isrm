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

define(["kinetic.min", "mas", "isrm", "stockFlowDiagram", 
        "jquery", "jquery-ui", "jquery.mousewheel.min", "jquery.flot.min"], 
        function(Kinetic, mas, isrm, StockFlowDiagram, $) {
    var running = false;            // is simulation animation running
    var initialized = false;        // is simulation initialized
    var animationRate = 30;         // maximum, in Hertz
    var updateCounter = 0;          // counter to limit plot updates
    var updateRate = 5;             // maximum, in Hertz
    var model = new isrm.Model({
        metaFlag: 1,                // META: 1, non-META: 0
        ceStaffRatio: 1000,         // META: 1000, non-META: 10
        modCoverage: 0.5,           // META: 0.5, non-META: 0
        archThroughput: 50,         // META: 50, non-META: 10
    });
    var sim = new mas.sim.LoggingSimulator({
        entities: model.entities,
        initTime: 0,
        maxTime: 120,
        timeStep: 0.25
    });
    
    // add each standard model entity to the ids array
    var ids = [];
    sim.entities.forEach(function(entity) {
        if(entity instanceof mas.sd.Parameter 
                || (entity instanceof mas.sd.Stock 
                    && !(entity instanceof mas.sd.Delay1)
                    && !(entity instanceof mas.sd.Smooth))
                || entity instanceof mas.sd.Flow) {
            ids.push(entity.id);
        }
    });
    
    // create plot settings to link ids with plots
    var plotSettings = new Array();
    plotSettings.push({placeholder: "#leftPlot", 
        ids: ["reqElicit", "conExploration", "designIntegration", 
            "verification", "validation"]});
    plotSettings.push({placeholder: "#rightPlot", ids: ["nreCost"]});

    // create plots, adding data series to each
    var plots = new Array();
    plotSettings.forEach(function(plotSetting) {
        plots.push($.plot($(plotSetting.placeholder),
            $.map(plotSetting.ids, function(id) { 
                return {
                    label: model.entity(id).name,
                    data: []}; 
                }
            ) , {
                series: {
                    lines: {show: true},
                    points: {show: false},
                    shadowSize: 0
                },
                xaxis: {
                    min: sim.initTime,
                    max: sim.maxTime
                }
            }
        ));
    });

    // set initial values of text inputs
    $("#animationRate").val(animationRate);
    $("#updateRate").val(updateRate);
    $("#initTime").val(sim.initTime)
    $("#timeStep").val(sim.timeStep);
    $("#maxTime").val(sim.maxTime);
    
    // set up settings dialog
    $("#settingsDialog").dialog({
        autoOpen: false,
        width: 600,
        position: "top",
        buttons: [{text: "OK", click: function(){ $(this).dialog("close") } }]
    });
    
    // set up parameter dialog
    $("#parameterDialog").dialog({
        autoOpen: false,
        width: 600,
        buttons: [{text: "OK", click: function(){ $(this).dialog("close") } }]
    });
    
    // set up flow dialog
    $("#flowDialog").dialog({
        autoOpen: false,
        width: 600,
        buttons: [{text: "OK", click: function(){ $(this).dialog("close") } }]
    });
    
    // set up stock dialog
    $("#stockDialog").dialog({
        autoOpen: false,
        width: 600,
        buttons: [{text: "OK", click: function(){ $(this).dialog("close") } }]
    });
    
    // callback to update plot when simulation is changed
    sim.on("init advance", function(time) {
        for(var i = 0; i < plots.length; i++) {
            update(plots[i], plotSettings[i].ids, false);
        }
        $("#time").val(sim.time.toFixed(2));
    });

    // callback to update buttons when simulation is initialized
    sim.on("init", function() {
        toggleButton("execute", false);
        toggleInput("parameterInput", false);
        toggleInput("stockInitInput", false);
        toggleInput("initTime", false);
        toggleInput("timeStep", false);
        toggleInput("maxTime", false);
    });
    
    // callback to update buttons when simulation is completed
    sim.on("complete", function() {
        toggleInput("parameterInput", true);
        toggleInput("stockInitInput", true);
        toggleInput("initTime", true);
        toggleInput("timeStep", true);
        toggleInput("maxTime", true);
        toggleButton("reset", true);
    });
    
    // callback to trigger a simulation execution
    $("#execute").click(function() {
        toggleButton("start", false);
        toggleButton("stop", false);
        sim.execute();
        plots.forEach(function(plot) {
            plot.setupGrid();
            plot.draw();
        });
    });
    
    // callback to trigger a simulation reset
    $("#reset").click(function() {
        toggleButton("reset", false);
        toggleButton("stop", false);
        $("#time").val("");
        sim.log = {};
        plots.forEach(function(plot) {
            update(plot, plotSettings[plots.indexOf(plot)].ids, false);
        });
        initialized = false;
        toggleButton("execute", true);
        toggleButton("start", true);
        toggleInput("parameterInput", true);
        toggleInput("stockInitInput", true);
        toggleInput("initTime", true);
        toggleInput("timeStep", true);
        toggleInput("maxTime", true);
    });
    
    // callback to start a simulation animation
    $("#start").click(function() {
        toggleButton("start", false);
        toggleButton("reset", false);
        if(!initialized) {
            toggleButton("execute", false);
            toggleInput("parameterInput", false);
            toggleInput("stockInitInput", false);
            sim.init();
            initialized = true;
        }
        running = true;
        advance();
        toggleButton("stop", true);
    });
    
    // callback to stop a simulation animation
    $("#stop").click(function() {
        toggleButton("stop", false);
        running = false;
        toggleButton("start", true);
        toggleButton("reset", true);
    });
    
    // callback to edit animation rate
    $("#animationRate").change(function() {
        var val = $("#animationRate").val();
        if($.isNumeric(val)) {
            animationRate = Math.min(100, Math.max(1, parseFloat(val)));
        }
        $("#animationRate").val(animationRate);
    });
    
    // callback to edit update rate
    $("#updateRate").change(function() {
        var val = $("#updateRate").val();
        if($.isNumeric(val)) {
            updateRate = Math.min(100, Math.max(0, parseFloat(val)));
        }
        $("#updateRate").val(updateRate);
    });
    
    // callback to edit initial time
    $("#initTime").change(function() {
        setNumericVal(sim, "initTime", "initTime",{max:sim.maxTime});
        plots.forEach(function(plot) {
            plot.getOptions().xaxes[0].min = sim.initTime;
            plot.setupGrid();
            plot.draw();
        });
    });
    
    // callback to edit time step
    $("#timeStep").change(function() {
        setNumericVal(sim, "timeStep", "timeStep",{min:0.01});
    });
    
    // callback to edit end time
    $("#maxTime").change(function() {
        setNumericVal(sim, "maxTime", "maxTime",{min:sim.initTime});
        plots.forEach(function(plot) {
            plot.getOptions().xaxes[0].max = sim.maxTime;
            plot.setupGrid();
            plot.draw();
        });
    });
    
    // callback to open the settings dialog
    $("#settings").click(function() {
        $("#settingsDialog").dialog("open");
    });
    
    // callback to export JSON-formatted data
    $("#exportJson").click(function() {
        var data = $.map(ids, function(id) { 
            return {id: id, values: sim.log[id]}; 
        });
        data.push({id: 'time', values: sim.log['time']});
        var json = JSON.stringify({
            model: {name: model.name, 
                version: model.version, 
                params: model.params}, 
            data: data
        });
        var blob = new Blob([json], {type: "application/json"});
        var url = URL.createObjectURL(blob);

        var a = document.createElement("a");
        a.style = "display: none";
        a.href = url;
        a.download = "export_" + new Date().getTime() + ".json";
        a.click();
        window.URL.revokeObjectURL(url);
    });
    
    // callback to export CSV-formatted data
    $("#exportCsv").click(function() {
        var csv = 'Time; ';
        
        ids.forEach(function(id) {
            csv += sim.entity(id).name + "; ";
        });
        csv += "\n";
        if(typeof sim.log['time'] !== 'undefined') {
            for(var t = 0; t < sim.log['time'].length; t++) {
                csv += sim.log['time'][t] + ";";
                ids.forEach(function(id) {
                    csv += sim.log[id][t] + "; ";
                });
                csv += "\n";
            }
        }
        var blob = new Blob([csv], {type: "application/json"});
        var url = URL.createObjectURL(blob);

        var a = document.createElement("a");
        a.style = "display: none";
        a.href = url;
        a.download = "export_" + new Date().getTime() + ".csv";
        a.click();
        window.URL.revokeObjectURL(url);
    });
    
    // build the diagram and add all its components
    var diagram = new StockFlowDiagram({
        container: 'stockFlowDiagram',
        width:950,
        height:520,
        scale: 950/1080
    });
    $('#stockFlowDiagram').bind('mousewheel', function(event) {
        var prevScale = diagram.stage.getScale().x;
        var scale = prevScale*Math.pow(1.1,event.deltaY);
        
        diagram.stage.scale({
            x: scale, 
            y: scale
        });
        diagram.stage.x(event.offsetX - scale/prevScale*(event.offsetX - diagram.stage.x()));
        diagram.stage.y(event.offsetY - scale/prevScale*(event.offsetY - diagram.stage.y()));
        diagram.stage.draw();
    });
    diagram.addParameter(model.entity("schPressure"), {x: 0, y: 170});
    diagram.addTime(1, {x: 100, y: 170, width: 50});
    diagram.addFlow(model.entity("initReq"), {x: 25, y: 220});
    diagram.linkComponents("schPressure", "initReq", {offsetX: 10});
    diagram.linkComponents("time1", "initReq", {offsetX: 5});
    diagram.addFlow(model.entity("changeReq"), {x: 25, y: 360});
    diagram.addShadow(model.entity("fracChangeReq"), 1, {x: 0, y: 460, width: 160});
    diagram.linkComponents("fracChangeReq1", "changeReq", {offsetX: 5});
    diagram.addFlow(model.entity("reqElicit"), {x: 25, y: 300});
    diagram.linkComponents("initReq", "reqElicit", {offsetX: 10, offsetY: -10});
    diagram.linkComponents("changeReq", "reqElicit", {offsetX: 10});
    diagram.addStock(model.entity("reqDefined"), {x: 120, y: 250});
    diagram.linkStockFlow("reqDefined", "reqElicit", true);
    diagram.addFlow(model.entity("levAbstraction"), {x: 160, y: 150});
    diagram.linkComponents("reqDefined", "levAbstraction", {offsetX: -10});
    diagram.addParameter(model.entity("cogBandwidth"), {x: 25, y: 125});
    diagram.linkComponents("cogBandwidth", "levAbstraction", {offsetY: 10});
    diagram.addParameter(model.entity("metaFlag"), {x: 100, y: 100});
    diagram.linkComponents("metaFlag", "levAbstraction", {offsetX: -10});
    diagram.addFlow(model.entity("conSwitch"), {x: 190, y: 230, width: 50});
    diagram.linkComponents("levAbstraction", "conSwitch", {offsetX: -2});
    diagram.linkComponents("reqElicit", "conSwitch", {offsetX: 40, offsetY: 60});
    diagram.addFlow(model.entity("conExploration"), {x: 240, y: 300});
    diagram.addStock(model.entity("archExplored"), {x: 330, y: 250});
    diagram.linkStockFlow("archExplored", "conExploration", true);
    diagram.linkComponents("conSwitch", "conExploration", {offsetX: 10, offsetY: -20});
    diagram.addParameter(model.entity("archThroughput"), {x: 240, y: 200});
    diagram.linkComponents("archThroughput", "conExploration", {offsetX: -10});
    diagram.addShadow(model.entity("schPressure"), 1, {x: 320, y: 180, width: 120});
    diagram.linkComponents("schPressure1", "conExploration", {offsetX: -10});
    diagram.addFlow(model.entity("explorationRate"), {x: 160, y: 350});
    diagram.linkComponents("explorationRate", "conExploration", {offsetX: 10});
    diagram.addShadow(model.entity("metaFlag"), 2, {x: 130, y: 410});
    diagram.linkComponents("metaFlag2", "explorationRate", {offsetX: -10});
    diagram.addTime(2, {x: 190, y: 390, width: 50});
    diagram.linkComponents("time2", "explorationRate", {offsetX: 0});
    diagram.addShadow(model.entity("levAbstraction"), 1, {x: 200, y: 440, width: 140});
    diagram.linkComponents("levAbstraction1", "explorationRate", {offsetX: 20});
    diagram.addStock(model.entity("archRetained"), {x: 330, y: 330});
    diagram.linkComponents("conExploration", "archRetained", {offsetX: -10});
    diagram.addFlow(model.entity("archFiltering"), {x: 380, y: 440});
    diagram.linkStockFlow("archRetained", "archFiltering", false);
    diagram.linkComponents("conExploration", "archFiltering", {offsetX: -40, offsetY: 40});
    diagram.linkComponents("archRetained", "archFiltering", {offsetX: -40, offsetY: 10});
    diagram.linkComponents("archRetained", "explorationRate", {offsetX: -40, offsetY: 20});
    diagram.addFlow(model.entity("designSwitch"), {x: 410, y: 230, width: 50});
    diagram.linkComponents("levAbstraction", "designSwitch", {offsetX: 50, offsetY: -80});
    diagram.linkComponents("conExploration", "designSwitch", {offsetY: -40});
    diagram.linkComponents("archRetained", "designSwitch", {offsetX: 10, offsetY: 20});
    diagram.addFlow(model.entity("designIntegration"), {x: 460, y: 300});
    diagram.addStock(model.entity("systemSpecs"), {x: 550, y: 250});
    diagram.linkStockFlow("systemSpecs", "designIntegration", true);
    diagram.linkComponents("designSwitch", "designIntegration", {offsetX: 10, offsetY: -10});
    diagram.linkComponents("systemSpecs", "designIntegration", {offsetY: 30});
    diagram.addFlow(model.entity("productivity"), {x: 470, y: 220});
    diagram.linkComponents("productivity", "designIntegration", {offsetX: 10, offsetY: -10});
    diagram.addShadow(model.entity("schPressure"), 2, {x: 550, y: 230, width: 120});
    diagram.linkComponents("schPressure2", "designIntegration", {offsetX: -20, offsetY: -10});
    diagram.addParameter(model.entity("designSpeed"), {x: 420, y: 350, width: 50});
    diagram.linkComponents("designSpeed", "designIntegration");
    diagram.addParameter(model.entity("fracChangeReq"), {x: 400, y: 530, width: 150});
    diagram.linkComponents("fracChangeReq", "designIntegration", {offsetX: -20});
    diagram.addFlow(model.entity("novelty"), {x: 470, y: 400, width: 60});
    diagram.linkComponents("novelty", "designIntegration", {offsetX: -10});
    diagram.addParameter(model.entity("modCoverage"), {x: 480, y: 480});
    diagram.linkComponents("novelty", "modCoverage", {offsetX: -10});
    diagram.addFlow(model.entity("strComplexity"), {x: 460, y: 180});
    diagram.linkComponents("strComplexity", "productivity", {offsetX: 10});
    diagram.addShadow(model.entity("archExplored"), 1, {x: 380, y: 90});
    diagram.linkComponents("archExplored1", "strComplexity", {offsetX: 20});
    diagram.addShadow(model.entity("reqDefined"), 1, {x: 480, y: 120, width: 90});
    diagram.linkComponents("reqDefined1", "strComplexity", {offsetX: 20});
    diagram.addShadow(model.entity("novelty"), 1, {x: 530, y: 180});
    diagram.linkComponents("novelty1", "productivity", {offsetX: 20});
    diagram.addShadow(model.entity("reqDefined"), 2, {x: 560, y: 350, width: 90});
    diagram.linkComponents("reqDefined2", "designIntegration", {offsetX: -10, offsetY: 10});
    diagram.addFlow(model.entity("verification"), {x: 670, y: 290});
    diagram.linkComponents("systemSpecs", "verification", {offsetY: 30});
    diagram.addStock(model.entity("testsPerformed"), {x: 760, y: 250});
    diagram.linkStockFlow("testsPerformed", "verification", true);
    diagram.linkComponents("testsPerformed", "verification", {offsetY: 30});
    diagram.addFlow(model.entity("testSwitch"), {x: 610, y: 200});
    diagram.linkComponents("testSwitch", "verification", {offsetX: 10, offsetY: -10});
    diagram.addShadow(model.entity("productivity"), 1, {x: 650, y: 150});
    diagram.linkComponents("productivity1", "verification", {offsetX: 10, offsetY: -10});
    diagram.linkComponents("levAbstraction", "testSwitch", {offsetX: 80, offsetY: -120});
    diagram.addFlow(model.entity("validationSwitch"), {x: 740, y: 180});
    diagram.linkComponents("verification", "validationSwitch", {offsetX: -20, offsetY: -20});
    diagram.addShadow(model.entity("schPressure"), 3, {x: 730, y: 220, width: 120});
    diagram.linkComponents("schPressure3", "verification", {offsetX: -10});
    diagram.addFlow(model.entity("validation"), {x: 900, y: 290});
    diagram.linkComponents("validationSwitch", "validation", {offsetY: -30});
    diagram.linkComponents("testsPerformed", "validation", {offsetY: 30});
    diagram.addStock(model.entity("reqValidated"), {x: 990, y: 250});
    diagram.linkStockFlow("reqValidated", "validation", true);
    diagram.addShadow(model.entity("productivity"), 2, {x: 930, y: 200});
    diagram.linkComponents("productivity2", "validation", {offsetX: -10});
    diagram.addShadow(model.entity("schPressure"), 4, {x: 960, y: 220, width: 120});
    diagram.linkComponents("schPressure4", "validation", {offsetX: -10});
    diagram.addFlow(model.entity("certCompletion"), {x: 1000, y: 340});
    diagram.linkComponents("reqValidated", "certCompletion", {offsetX: -10});
    diagram.addShadow(model.entity("reqDefined"), 3, {x: 990, y: 400, width: 90});
    diagram.linkComponents("reqDefined3", "certCompletion", {offsetX: 10});
    diagram.addFlow(model.entity("changeGen"), {x: 760, y: 420});
    diagram.addStock(model.entity("pendChanges"), {x: 720, y: 450});
    diagram.addStock(model.entity("cumChanges"), {x: 630, y: 450});
    diagram.linkStockFlow("pendChanges", "changeGen", true);
    diagram.linkComponents("changeGen", "cumChanges", {offsetX: -20, offsetY: -20});
    diagram.linkComponents("verification", "changeGen", {offsetX: -20, offsetY: 30});
    diagram.linkComponents("reqDefined2", "changeGen", {offsetX: -20, offsetY: 20});
    diagram.linkComponents("designIntegration", "changeGen", {offsetX: -40, offsetY: 30});
    diagram.addShadow(model.entity("metaFlag"), 4, {x: 730, y: 340});
    diagram.linkComponents("metaFlag4", "changeGen", {offsetX: 10});
    diagram.addParameter(model.entity("fracProblemsCaught"), {x: 820, y: 370});
    diagram.linkComponents("fracProblemsCaught", "changeGen", {offsetX: 10, offsetY: 5});
    diagram.addShadow(model.entity("strComplexity"), 1, {x: 640, y: 360});
    diagram.linkComponents("strComplexity1", "changeGen", {offsetX: -20, offsetY: 10});
    diagram.addFlow(model.entity("changeImpl"), {x: 770, y: 520, width: 90});
    diagram.linkStockFlow("pendChanges", "changeImpl", false);
    diagram.linkComponents("changeImpl", "designIntegration", {offsetX: -50, offsetY: 100});
    diagram.linkComponents("changeImpl", "changeReq", {offsetX: -160, offsetY: 120});
    diagram.linkComponents("validation", "changeGen", {offsetX: 40, offsetY: 40});
    diagram.linkComponents("reqValidated", "changeGen", {offsetX: 0, offsetY: 60});
    diagram.linkComponents("pendChanges", "certCompletion", {offsetX: 0, offsetY: 30});
    diagram.linkComponents("changeGen", "changeImpl", {offsetX: 20});
    diagram.addShadow(model.entity("novelty"), 2, {x: 850, y: 540});
    diagram.linkComponents("novelty2", "changeGen", {offsetX: 20, offsetY: 10});
    diagram.addParameter(model.entity("modIntegrity"), {x: 920, y: 560, width: 100});
    diagram.linkComponents("modIntegrity", "changeGen", {offsetX: 40, offsetY: -10});
    diagram.addParameter(model.entity("changeFlag"), {x: 980, y: 520});
    diagram.linkComponents("changeFlag", "changeGen", {offsetX: 10, offsetY: -20});
    diagram.addFlow(model.entity("spendRate"), {x: 930, y: 80});
    diagram.addStock(model.entity("nreCost"), {x: 870, y: 10});
    diagram.linkStockFlow("nreCost", "spendRate", true);
    diagram.addParameter(model.entity("aveLaborRate"), {x: 980, y: 20});
    diagram.linkComponents("aveLaborRate", "spendRate", {offsetX: 10, offsetY: 10});
    diagram.addFlow(model.entity("testers"), {x: 980, y: 110});
    diagram.linkComponents("testers", "spendRate", {offsetX: 5});
    diagram.addParameter(model.entity("vvStaffRatio"), {x: 1000, y: 140});
    diagram.linkComponents("vvStaffRatio", "testers", {offsetX: 5, offsetY: 0});
    diagram.addShadow(model.entity("verification"), 1, {x: 950, y: 160});
    diagram.linkComponents("verification1", "testers", {offsetX: -10, offsetY: 0});
    diagram.addShadow(model.entity("validation"), 1, {x: 900, y: 180});
    diagram.linkComponents("validation1", "testers", {offsetX: -25, offsetY: -5});
    diagram.addFlow(model.entity("designers"), {x: 880, y: 130});
    diagram.linkComponents("designers", "spendRate", {offsetX: 5});
    diagram.addParameter(model.entity("cgStaffRatio"), {x: 850, y: 160});
    diagram.linkComponents("cgStaffRatio", "designers", {offsetX: 5, offsetY: 0});
    diagram.addShadow(model.entity("designIntegration"), 1, {x: 770, y: 140});
    diagram.linkComponents("designIntegration1", "designers", {offsetX: 0, offsetY: -5});
    diagram.addFlow(model.entity("diStaffRatio"), {x: 750, y: 110});
    diagram.linkComponents("diStaffRatio", "designers", {offsetX: 0, offsetY: -5});
    diagram.addShadow(model.entity("novelty"), 3, {x: 610, y: 110, width: 60});
    diagram.linkComponents("novelty3", "diStaffRatio", {offsetX: 10, offsetY: -5});
    diagram.addFlow(model.entity("sysEngineers"), {x: 760, y: 60});
    diagram.linkComponents("sysEngineers", "spendRate", {offsetX: -20, offsetY: 10});
    diagram.addShadow(model.entity("conExploration"), 1, {x: 600, y: 80, width: 130});
    diagram.linkComponents("conExploration1", "sysEngineers", {offsetX: 20, offsetY: 10});
    diagram.addParameter(model.entity("ceStaffRatio"), {x: 640, y: 60});
    diagram.linkComponents("ceStaffRatio", "sysEngineers", {offsetY: 5});
    diagram.addShadow(model.entity("reqElicit"), 1, {x: 580, y: 30, width: 150});
    diagram.linkComponents("reqElicit1", "sysEngineers", {offsetX: 20});
    diagram.addParameter(model.entity("reStaffRatio"), {x: 680, y: 10});
    diagram.linkComponents("reStaffRatio", "sysEngineers", {offsetX: 20});
    diagram.stage.draw();
    
    $("#clearLeft").click(function() {
        if(confirm("Clear all plot data?")) {
            plotSettings[0].ids = [];
            update(plots[0], plotSettings[0].ids, true);
        }
    });

    $("#sortOrderLeft").click(function() {
        plotSettings[0].ids.sort(function(id1, id2) {
            return ids.indexOf(id1) - ids.indexOf(id2);
        });
        update(plots[0], plotSettings[0].ids, true);
    });

    $("#sortAlphaLeft").click(function() {
        plotSettings[0].ids.sort();
        update(plots[0], plotSettings[0].ids, true);
    });

    $("#clearRight").click(function() {
        if(confirm("Clear all plot data?")) {
            plotSettings[1].ids = [];
            update(plots[1], plotSettings[1].ids, true);
        }
    });

    $("#sortOrderRight").click(function() {
        plotSettings[1].ids.sort(function(id1, id2) {
            return ids.indexOf(id1) - ids.indexOf(id2);
        });
        update(plots[1], plotSettings[1].ids, true);
    });

    $("#sortAlphaRight").click(function() {
        plotSettings[1].ids.sort();
        update(plots[1], plotSettings[1].ids, true);
    });

    diagram.on("select", function(id) {
        if(model.entity(id) instanceof mas.sd.Stock) {
            $("#stockName").text(model.entity(id).name);
            $("#stockDesc").html(model.entity(id).desc);
            $("#stockVar").html(model.entity(id).id);
            $("#stockEqn").html(getEquation(model.entity(id).getDerivative));
            $("#stockUnits").text(model.entity(id).units);
            $("#stockInput").val(sim.value(id));
            $("#stockInitInput").val(model.entity(id).getInitValue());
            $("#stockInitInput").off();
            $("#stockInitInput").change(function() {
                setNumericVal(model.entity(id), "stockInitInput", "initValue");
            });
            $("#stockPlotId").off();
            $("#stockPlotId").val(0);
            for(var i = 0; i < plotSettings.length; i++) {
                if(plotSettings[i].ids.indexOf(id) > -1) {
                    $("#stockPlotId").val(i);
                    break;
                }
            }
            $("#stockPlotImg").attr("src",
                    plotSettings[$("#stockPlotId").val()].ids.indexOf(id) > -1?
                    "images/delete.png":"images/add.png");
            $("#stockPlotId").change(function() {
                $("#stockPlotImg").attr("src",
                        plotSettings[$("#stockPlotId").val()].ids.indexOf(id) > -1?
                        "images/delete.png":"images/add.png");
            });
            $("#stockPlot").off();
            $("#stockPlot").click(function() {
                var i = $("#stockPlotId").val();
                if(plotSettings[i].ids.indexOf(id) > -1) {
                    var index = plotSettings[i].ids.indexOf(id);
                    if(index > -1) {
                        plotSettings[i].ids.splice(index, 1);
                    }
                    $("#stockPlotImg").attr("src","images/add.png");
                } else {
                    plotSettings[i].ids.push(id);
                    $("#stockPlotImg").attr("src","images/delete.png");
                }
                update(plots[i], plotSettings[i].ids, true);
            });
            $("#stockDialog").dialog("open");
        } else if(model.entity(id) instanceof mas.sd.Flow) {
            $("#flowName").text(model.entity(id).name);
            $("#flowDesc").html(model.entity(id).desc);
            $("#flowVar").html(model.entity(id).id);
            $("#flowEqn").html(getEquation(model.entity(id).getValue));
            $("#flowUnits").text(model.entity(id).units);
            $("#flowInput").val(sim.value(id));
            $("#flowPlotId").off();
            $("#flowPlotId").val(0);
            for(var i = 0; i < plotSettings.length; i++) {
                if(plotSettings[i].ids.indexOf(id) > -1) {
                    $("#flowPlotId").val(i);
                    break;
                }
            }
            $("#flowPlotImg").attr("src",
                    plotSettings[$("#flowPlotId").val()].ids.indexOf(id) > -1?
                    "images/delete.png":"images/add.png");
            $("#flowPlotId").change(function() {
                $("#flowPlotImg").attr("src",
                        plotSettings[$("#flowPlotId").val()].ids.indexOf(id) > -1?
                        "images/delete.png":"images/add.png");
            });
            $("#flowPlot").off();
            
            $("#flowPlot").click($.proxy(function() {
                var i = $("#flowPlotId").val();
                if(plotSettings[i].ids.indexOf(id) > -1) {
                    var index = plotSettings[i].ids.indexOf(id);
                    if(index > -1) {
                        plotSettings[i].ids.splice(index, 1);
                    }
                    $("#flowPlotImg").attr("src","images/add.png");
                } else {
                    plotSettings[i].ids.push(id);
                    $("#flowPlotImg").attr("src","images/delete.png");
                }
                update(plots[i], plotSettings[i].ids, true);
            }, this));
            $("#flowDialog").dialog("open");
        } else if(model.entity(id) instanceof mas.sd.Parameter) {
            $("#parameterName").text(model.entity(id).name);
            $("#parameterDesc").html(model.entity(id).desc);
            $("#parameterUnits").text(model.entity(id).units);
            $("#parameterInput").val(sim.value(id));
            $("#parameterInput").off();
            $("#parameterInput").change(function() {
                setNumericVal(model.entity(id), "parameterInput", "value");
            });
            $("#parameterDialog").dialog("open");
        }
    });

    /**
     * Helper function to get the screen-readable equation from a function.
     * @param {Function} fun the function
     * @returns {String} the screen-readable equation
     */
    function getEquation(fun) {
        return new String(fun).replace(/Math\./g,'')
                .replace(/===/g,'==')
                .replace(/\s+\*\s+/g,'*').replace(/\*/g, ' * ')
                .replace(/\s+\+\s+/g,'+').replace(/\+/g, ' + ')
                .replace(/\s+\-\s+/g,'-').replace(/\-/g, ' - ')
                .replace(/\s+\/\s+/g,'/').replace(/\//g, ' / ')
                .replace(/function\s*\(\s*\)\s*\{/g,'')
                .replace(/;/g,'').replace(/\mas.util\.Utils\.intPart/g,'int')
                .replace(/return/g,'').replace(/\}\s*$/g,'')
                .replace(/sim\.value\("/g,'').replace(/"\)/g,'');
    }

    /**
     * Helper function to toggle the state of buttons.
     * @param {String} id the button id
     * @param {Boolean} enabled true if the button should be enabled
     * @returns {undefined}
     */
    function toggleButton(id, enabled) {
        if(enabled) {
            $("#"+id).removeAttr('disabled');
        } else {
            $("#"+id).attr('disabled','diabled');
        }
        $("#"+id+"Img").attr("src","images/"+ id + (enabled?"":"-disabled") + ".png");
    };

    /**
     * Helper function to toggle the state of inputs.
     * @param {String} id the input id
     * @param {Boolean} enabled true if the input should be enabled
     * @returns {undefined}
     */
    function toggleInput(id, enabled) {
        if(enabled) {
            $("#"+id).removeAttr('disabled');
        } else {
            $("#"+id).attr('disabled','diabled');
        }
    };

    /**
     * Helper function to parse numerical input from a text input 
     * and set corresponding value of an object. Options include
     * max (maximum value) and min (minimum value).
     * @param {Object} object
     * @param {String} id of input element
     * @param {String} name of model attribute
     * @param {Object} options
     * @returns {undefined}
     */
    function setNumericVal(object, id, name, options) {
        var value = $("#"+id).val();
        if($.isNumeric(value)) {
            var val = parseFloat(value);
            val = (undefined!==options) 
                    && options.hasOwnProperty("max")?
                            Math.min(options.max,val):val;
            val = (undefined!==options) 
                    && options.hasOwnProperty("min")?
                            Math.max(options.min,val):val;
            object[name] = val;
        }
        $("#"+id).val(object[name]);
    };

    /**
     * Helper function to update plot with new data.
     * @param {Plot} plot the plot update
     * @param {Array} ids array of model component ids
     * @param {Boolean} setupGrid true if plot needs setup
     * @returns {undefined}
     */
    function update(plot, ids, setupGrid) {
        var plotData = [];
        ids.forEach(function(id) {
            series = [];
            if(typeof sim.log[id] !== 'undefined') {
                for(var i = 0; i < sim.log[id].length; i++) {
                    series.push([sim.log['time'][i], sim.log[id][i]]);
                }
            }
            plotData.push({
                label: model.entity(id).name,
                data: series
            });
        });
        plot.setData(plotData);
        plot.draw();
        if(setupGrid) {
            plot.setupGrid();
            plot.draw();
        }
    }

    /**
     * Helper function to advance the simulation by one time step 
     * and handle associated user interface updates.
     * @returns {undefined}
     */
    function advance() {
        sim.advance();
        if(sim.isComplete()) {
            running = false;
            initialized = false;
            $("#stop").attr('disabled','disabled');
            $("#reset").removeAttr('disabled');
        }
        if(running) {
            setTimeout(advance, 1000/animationRate);
            updateCounter = updateCounter + 1;
            if(updateRate > 0 && updateCounter>animationRate/updateRate) {
                plots.forEach(function(plot) {
                    plot.setupGrid();
                    plot.draw();
                });
                updateCounter = 0;
            }
        } else {
            plots.forEach(function(plot) {
                plot.setupGrid();
                plot.draw();
            });
        }
    }
});