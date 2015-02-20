/*
 * Copyright 2015 Paul T. Grogan
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

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function(require) {
    var Kinetic = require('kinetic.min');
    
    /**
     * The StockFlowDiagram class defines a stock-and-flow diagram.
     * @type Object
     */
    function StockFlowDiagram() {
        this.container = 'container';
        this.width = 1080;
        this.height = 580;
        this.scale = 1;
        this.fontSize = 12;
        // override default attributes
        for(var n in arguments[0]) {
            this[n] = arguments[0][n];
        }
        this.shapes = new Kinetic.Layer({draggable: true});
        this.shapes.add(new Kinetic.Rect({
            id: 'background',
            x: -1000,
            y: -1000,
            width: 2000,
            height: 2000,
            fill: "#000000",
            opacity: 0
        }));
        this.shapes.on('dragmove', $.proxy(function() {
            this.lines.x(this.shapes.x());
            this.lines.y(this.shapes.y());
            this.lines.draw();
        }, this));
        this.lines = new Kinetic.Layer();
        this.stage = new Kinetic.Stage({
            container: this.container,
            width: this.width,
            height: this.height,
            scale: {x: this.scale, y: this.scale},
        });
        this.stage.add(this.lines, this.shapes);
        this.handlers = new Array();
    };

    /**
     * Safely overrides a value or falls back to a default.
     * @param {Number} value the value
     * @param {Number} defaultValue the default value
     * @returns {Number} the value
     */
    StockFlowDiagram.prototype.override = function(value, defaultValue) {
        return (typeof value !== 'undefined')?value:defaultValue;
    }

    /**
     * Adds a stock variable component to the diagram. Displayed as a black
     * label with black outline.
     * @param {Object} stock the Stock object instance
     * @param {Object} o optional arguments [x, y, width, height, fontSize]
     * @returns {undefined}
     */
    StockFlowDiagram.prototype.addStock = function(stock, o) {
        var group = new Kinetic.Group({
            id: stock.id,
            x: this.override(o?o.x:undefined, 0),
            y: this.override(o?o.y:undefined, 0),
            width: this.override(o?o.width:undefined, 80),
            height: this.override(o?o.height:undefined, 40),
            draggable: true,
            dragDistance: 5
        });
        var box = new Kinetic.Rect({
            width: group.width(),
            height: group.height(),
            fill: 'white',
            stroke: 'black',
            strokeWidth: 1
        });
        var text = new Kinetic.Text({
            text: stock.name,
            fill: 'black',
            align: 'center',
            fontSize: this.override(o?o.fontSize:undefined, this.fontSize),
            width: group.width()
        });
        text.y(box.height()/2 - text.height()/2);
        group.add(box);
        group.add(text);
        group.on('dblclick dbltap', $.proxy(function() {
            this.trigger("select", stock.id);}, this));
        this.shapes.add(group);
    }

    /**
     * Adds a flow variable component to the diagram. Displayed as a label
     * with black font.
     * @param {Object} flow the Flow object instance
     * @param {Object} o optional arguments [x, y, width, fontSize]
     * @returns {undefined}
     */
    StockFlowDiagram.prototype.addFlow = function(flow, o) {
        var group = new Kinetic.Group({
            id: flow.id,
            x: this.override(o?o.x:undefined, 0),
            y: this.override(o?o.y:undefined, 0),
            width: this.override(o?o.width:undefined, 80),
            draggable: true,
            dragDistance: 5
        });
        var text = new Kinetic.Text({
            text: flow.name,
            fill: 'black',
            align: 'center',
            fontSize: this.override(o?o.fontSize:undefined, this.fontSize),
            width: group.width()
        });
        text.y(-text.height()/2);
        var box = new Kinetic.Rect({
            width: group.width(),
            y: text.y(),
            height: text.height(),
            fill: 'white'
        });
        group.add(box);
        group.add(text);
        group.on('dblclick dbltap', $.proxy(function() {
            this.trigger("select", flow.id);}, this));
        this.shapes.add(group);
    };

    /**
     * Adds a parameter variable component to the diagram. Displayed as a label
     * with blue font.
     * @param {Object} parameter the Parameter object instance
     * @param {Object} o optional arguments [x, y, width, fontSize]
     * @returns {undefined}
     */
    StockFlowDiagram.prototype.addParameter = function(parameter, o) {
        var group = new Kinetic.Group({
            id: parameter.id,
            x: this.override(o?o.x:undefined, 0),
            y: this.override(o?o.y:undefined, 0),
            width: this.override(o?o.width:undefined, 80),
            draggable: true,
            dragDistance: 5
        });
        var text = new Kinetic.Text({
            text: parameter.name,
            fill: 'blue',
            align: 'center',
            fontSize: this.override(o?o.fontSize:undefined, this.fontSize),
            width: group.width()
        });
        text.y(-text.height()/2);
        var box = new Kinetic.Rect({
            width: group.width(),
            y: text.y(),
            height: text.height(),
            fill: 'white'
        });
        group.add(box);
        group.add(text);
        group.on('dblclick dbltap', $.proxy(function() {
            this.trigger("select", parameter.id);}, this));
        this.shapes.add(group);
    };

    /**
     * Adds a time component to the diagram. Displayed as a label
     * with gray font.
     * @param {Number} num the time number (unique)
     * @param {Object} o optional arguments [x, y, width, fontSize]
     * @returns {undefined}
     */
    StockFlowDiagram.prototype.addTime = function (num, o) {
        var group = new Kinetic.Group({
            id: 'time' + num,
            x: this.override(o?o.x:undefined, 0),
            y: this.override(o?o.y:undefined, 0),
            width: this.override(o?o.width:undefined, 80),
            draggable: true
        });
        var text = new Kinetic.Text({
            text: "<time>",
            fill: 'gray',
            align: 'center',
            fontSize: this.override(o?o.fontSize:undefined, this.fontSize),
            width: group.width()
        });
        text.y(-text.height()/2);
        var box = new Kinetic.Rect({
            width: group.width(),
            y: text.y(),
            height: text.height(),
            fill: 'white'
        });
        group.add(box);
        group.add(text);
        this.shapes.add(group);
    };

    /**
     * Adds a shadow variable component to the diagram. Displayed as a label
     * with gray font.
     * @param {Object} entity the Entity object instance
     * @param {Number} num the shadow variable number (unique)
     * @param {Object} o optional arguments [x, y, width, fontSize]
     * @returns {undefined}
     */
    StockFlowDiagram.prototype.addShadow = function (entity, num, o) {
        var group = new Kinetic.Group({
            id: entity.id + num,
            x: this.override(o?o.x:undefined, 0),
            y: this.override(o?o.y:undefined, 0),
            width: this.override(o?o.width:undefined, 80),
            draggable: true
        });
        var text = new Kinetic.Text({
            text: "<" + entity.name + ">",
            fill: 'gray',
            align: 'center',
            fontSize: this.override(o?o.fontSize:undefined, this.fontSize),
            width: group.width()
        });
        text.y(-text.height()/2);
        var box = new Kinetic.Rect({
            width: group.width(),
            y: text.y(),
            height: text.height(),
            fill: 'white'
        });
        group.add(box);
        group.add(text);
        group.on('dblclick dbltap', $.proxy(function() {
            this.trigger("select", entity.id);}, this));
        this.shapes.add(group);
    };

    /**
     * Links two existing components on the diagram. Displayed with a blue 
     * line having one intermediate handle for positioning.
     * @param {String} id1 the ID of the first component
     * @param {String} id2 the ID of the second component
     * @param {Object} o optional arguments [offsetX, offsetY]
     * @returns {undefined}
     */
    StockFlowDiagram.prototype.linkComponents = function(id1, id2, o) {
        var c1 = this.shapes.find("#"+id1)[0];
        var c2 = this.shapes.find("#"+id2)[0];
        var handle = new Kinetic.Circle({
            x: (c1.x() + c1.width()/2 + c2.x() + c2.width()/2)/2 
                    + this.override(o?o.offsetX:undefined,0),
            y: (c1.y() + c1.height()/2 + c2.y() + c2.height()/2)/2 
                    + this.override(o?o.offsetY:undefined,0),
            width: 6,
            height: 6,
            draggable: true,
            dragDistance: 5,
            stroke: 'blue',
            strokeWidth: 0.5,
            fill: 'white'
        });
        var line = new Kinetic.Line({
            points: [c1.x()+c1.width()/2, 
                c1.y()+c1.height()/2, 
                handle.x(), handle.y(), 
                c2.x()+c2.width()/2, 
                c2.y()+c2.height()/2],
            stroke: 'blue',
            strokeWidth: 0.5,
            tension: 0.5
        });
        var stage = this.stage;
        function update() {
            line.points([c1.x()+c1.width()/2, 
                c1.y()+c1.height()/2, 
                handle.x(), handle.y(), 
                c2.x()+c2.width()/2, 
                c2.y()+c2.height()/2]);
            stage.draw();
        };
        handle.on('dragmove', update);
        c1.on('dragmove', update);
        c2.on('dragmove', update);
        
        this.lines.add(line);
        this.shapes.add(handle);
    };

    /**
     * Links existing stock and flow components on the diagram. Displayed 
     * with a cloud, arrow, and valve.
     * @param {String} stockId the stock ID
     * @param {String} flowId the flow ID
     * @param {Boolean} inFlow is the flow in to (true)
     *             or out of the stock (false)
     * @returns {undefined}
     */
    StockFlowDiagram.prototype.linkStockFlow = function(stockId, flowId, inFlow) {
        var stock = this.shapes.find("#"+stockId)[0];
        var flow = this.shapes.find("#"+flowId)[0];
        // create a new group
        var group = new Kinetic.Group();
        // create the arrow shaft and add it to the group
        var line = new Kinetic.Rect({
            stroke: 'black',
            strokeWidth: 1,
            fill: 'white'
        });
        group.add(line);
        // create the cloud and add it to the group
        var cloud = new Kinetic.Line({
            points: [8,0, 5,2, 0,6, -8,0, -4,-4, 0,-8, 4,-4],
            closed: true,
            fill: 'white',
            stroke: 'black',
            strokeWidth: 1,
            tension: 0.5
        });
        group.add(cloud);
        // create the top valve and add it to the group
        var valveTop = new Kinetic.Star({
            numPoints: 3,
            innerRadius: 3,
            outerRadius: 6,
            stroke: 'black',
            strokeWidth: 1,
            fill: 'white'
        });
        group.add(valveTop);
        // create the bottom valve and add it to the group
        var valveBottom = new Kinetic.Star({
            numPoints: 3,
            innerRadius: 3,
            outerRadius: 6,
            stroke: 'black',
            strokeWidth: 1,
            fill: 'white'
        });
        group.add(valveBottom);
        // create the arrowhead and add it to the group
        var arrow = new Kinetic.Star({
            numPoints: 3,
            innerRadius: 5,
            outerRadius: 10,
            fill: 'black'
        });
        group.add(arrow);
        
        var stage = this.stage;
        
        /**
         * Function to re-draw the stage after a stock or flow is moved.
         * @returns {undefined}
         */
        function update() {
            // layout is horizontal unless stock and flow are "close" in the
            // horizontal dimension (close = within 3/4 of the stock width)
            var horizontal = Math.abs(flow.x()-stock.x() 
                    + (flow.width()-stock.width())/2) > 3/4*stock.width();
            if(horizontal) {
                // normal layout has flow to the left of stock for in-flow
                var reversed = flow.x() - stock.x() 
                        + (flow.width()-stock.width())/2 > 0;
                // set group height and y-location
                group.height(12);
                group.y(stock.y()+(stock.height()-group.height())/2);
                // set group width and x-location
                if(reversed) {
                    group.width(2*Math.abs(flow.x() + flow.width()/2 
                            - (stock.x() + stock.width())));
                    group.x(stock.x() + stock.width());
                } else {
                    group.width(2*Math.abs(flow.x() + flow.width()/2 
                            - stock.x()));
                    group.x(flow.x() + (flow.width() - group.width())/2);
                }
                // set cloud y- and x-location
                cloud.y((group.height()-cloud.height())/2);
                if(reversed) {
                    cloud.x(group.width() - cloud.width());
                } else {
                    cloud.x(0);
                }
                // set shaft height, width, and y- and x-location
                // set arrow x- and y-location and rotation
                line.height(4);
                line.width(group.width() - arrow.outerRadius() - cloud.width());
                line.y((group.height()-line.height())/2);
                arrow.y((group.height()-arrow.height())/2);
                if(inFlow && reversed) {
                    arrow.x(arrow.outerRadius());
                    arrow.rotation(90+180);
                    line.x(arrow.outerRadius());
                } else if(inFlow) {
                    arrow.x(line.width());
                    arrow.rotation(90);
                    line.x(cloud.width());
                } else if(reversed) {
                    arrow.x(line.width());
                    arrow.rotation(90);
                    line.x(0);
                } else {
                    arrow.x(arrow.outerRadius()+cloud.width());
                    arrow.rotation(90+180);
                    line.x(arrow.outerRadius()+cloud.width());
                }
                // set top valve y- and x-location and rotation
                valveTop.y(0);
                valveTop.x((group.width()-valveTop.width())/2);
                valveTop.rotation(60);
                // set bottom valve y- and x-location and rotation
                valveBottom.x((group.width()-valveTop.width())/2);
                valveBottom.y(group.height());
                valveBottom.rotation(0);
            } else {
                // normal layout has flow above the stock for in-flow
                var reversed = flow.y() - stock.y() 
                        + (flow.height()-stock.height())/2 > 0;
                // set group width and x-location
                group.width(12);
                group.x(stock.x()+(stock.width()-group.width())/2);
                // set group height and y-location
                if(reversed) {
                    group.height(2*Math.abs(flow.y() + flow.height()/2 
                            - (stock.y() + stock.height())));
                    group.y(stock.y() + stock.height());
                } else {
                    group.height(2*Math.abs(flow.y() + flow.height()/2 - stock.y()));
                    group.y(flow.y() + flow.height()/2 - group.height()/2);
                }
                // set cloud x- and y-location
                cloud.x((group.width()-cloud.width())/2);
                if(reversed) {
                    cloud.y(group.height() - cloud.height());
                } else {
                    cloud.y(0);
                }
                // set shaft width, height, and x- and y-location
                // set arrow x- and y-location and rotation
                line.width(4);
                line.height(group.height() - arrow.outerRadius() - cloud.height());
                line.x((group.width()-line.width())/2);
                arrow.x((group.width()-arrow.width())/2);
                arrow.rotation(90+90);
                if(inFlow && reversed) {
                    arrow.y(arrow.outerRadius());
                    arrow.rotation(90+90+180);
                    line.y(arrow.outerRadius());
                } else if(inFlow) {
                    arrow.y(line.height());
                    arrow.rotation(90+90);
                    line.y(cloud.height());
                } else if(reversed) {
                    arrow.y(line.height());
                    arrow.rotation(90+90);
                    line.y(0);
                } else {
                    arrow.y(arrow.outerRadius()+cloud.height());
                    arrow.rotation(90+90+180);
                    line.y(arrow.outerRadius()+cloud.height());
                }
                // set top valve y- and x-location and rotation
                valveTop.x(group.width());
                valveTop.y((group.height()-valveTop.height())/2);
                valveTop.rotation(60+90);
                // set bottom valve y- and x-location and rotation
                valveBottom.y((group.height()-valveTop.height())/2);
                valveBottom.x(0);
                valveBottom.rotation(0+90);
            }
            stage.draw();
        };

        update();

        stock.on('dragmove', update);
        flow.on('dragmove', update);

        this.shapes.add(group);
    };

    /**
     * Triggers an event with data.
     * @param {String} event the event name
     * @param {Object} data the event data
     * @returns {undefined}
     */
    StockFlowDiagram.prototype.trigger = function(event, data) {
        if(!this.handlers[event]) {
            return;
        }
        for(var i = 0; i < this.handlers[event].length; i++) {
            this.handlers[event][i](data)
        }
    };

    /**
     * Adds an event handler.
     * @param {String} events the event name(s)
     * @param {Object} handler the event handler
     * @returns {undefined}
     */
    StockFlowDiagram.prototype.on = function(events, handler) {
        var handlers = this.handlers;
        events.split(' ').forEach(function(event) {
            if(!handlers[event]) {
                handlers[event] = [];
            }
            handlers[event].push(handler);
        });
    };

    /**
     * Removes an event handler.
     * @param {String} events the event name(s)
     * @param {Object} handler the event handler (optional)
     * @returns {undefined}
     */
    StockFlowDiagram.prototype.off = function(events, handler) {
        var handlers = this.handlers;
        events.split(' ').forEach(function(event) {
            if(typeof handler === 'undefined') {
                handlers[event] = [];
            }
            if(handlers[event]) {
                var index = handlers[event].indexOf(handler);
                if(index >= 0) {
                    handlers[event].splice(index, 1);
                }
            }
        });
    };
    
    return StockFlowDiagram;
});