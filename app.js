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

// define required packages
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var mongo = require('mongoskin');

// define routes
var results = require('./routes/results');
var execute = require('./routes/execute');
var data = require('./routes/data');

// create database connection
var db = mongo.db("mongodb://localhost:27017/imcse", {native_parser:true});

// create express application
var app = express();

// set up favicon and logging
app.use(favicon(__dirname + '/www/images/favicon.png'));
app.use(logger('dev'));

// set up body parser
// increase json parser limit to allow large post
app.use(bodyParser.json({limit: '16mb'}));
app.use(bodyParser.urlencoded({ extended: false }));

// configure static path to www files
app.use(express.static(path.join(__dirname, 'www')));

// inject database into application request
app.use(function(req,res,next) {
    req.db = db;
    next();
});

// set paths to routes
app.use('/results', results);
app.use('/execute', execute);
app.use('/data', data);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

// export app to node
module.exports = app;