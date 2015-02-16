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

// configure requirejs to find libraries and applications
// also configure jquery extensions as shims
requirejs.config({
    "baseUrl": "scripts/lib",
    paths: {
        "app": "../app"
    },
    shim: {
        "jquery.mousewheel.min": ["jquery"],
        "jquery-ui": ["jquery"],
        "jquery.flot.selection.min": ["jquery"],
        "jquery.colorhelpers.min": ["jquery"],
        "jquery.flot.canvas.min": ["jquery"],
        "jquery.flot.categories.min": ["jquery"],
        "jquery.flot.crosshair.min": ["jquery"],
        "jquery.flot.errorbars.min": ["jquery"],
        "jquery.flot.fillbetween.min": ["jquery"],
        "jquery.flot.image.min": ["jquery"],
        "jquery.flot.min": ["jquery"],
        "jquery.flot.navigate.min": ["jquery"],
        "jquery.flot.pie.min": ["jquery"],
        "jquery.flot.resize.min": ["jquery"],
        "jquery.flot.selection.min": ["jquery"],
        "jquery.flot.stack.min": ["jquery"],
        "jquery.flot.symbol.min": ["jquery"],
        "jquery.flot.threshold.min": ["jquery"],
        "jquery.flot.time.min": ["jquery"],
        "spectrum": ["jquery"]
    }
});