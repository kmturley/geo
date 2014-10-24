/*
    App
    by kmturley
*/

/*global window, document, Geo*/

var App = function () {
    'use strict';
    
    var module = {
        /**
         * @method init
         */
        init: function (id, options) {
            var me = this;
            this.el = document.getElementById(id || 'results');
            this.inputs = document.getElementById('inputs');
            this.geo = new Geo();
            this.geo.init();
            
            this.addEvent('click', this.inputs, function (e) {
                if (e.target.checked === true) {
                    me.geo.load(e.target.value, function (kml) {
                        me.kml = kml;
                        me.update();
                    });
                } else if (e.target.checked === false) {
                    me.geo.remove(e.target.value);
                }
            });
            
            this.addEvent('change', document.getElementById('minDeviation'), function (e) {
                me.geo.options.minDeviation = e.target.value;
                document.getElementById('minDeviationVal').innerHTML = e.target.value;
            });

            this.addEvent('change', document.getElementById('maxDeviation'), function (e) {
                me.geo.options.maxDeviation = e.target.value;
                document.getElementById('maxDeviationVal').innerHTML = e.target.value;
            });
            
            this.addEvent('change', document.getElementById('minDistance'), function (e) {
                me.geo.options.minDistance = e.target.value;
                document.getElementById('minDistanceVal').innerHTML = e.target.value;
            });

            this.addEvent('change', document.getElementById('maxDistance'), function (e) {
                me.geo.options.maxDistance = e.target.value;
                document.getElementById('maxDistanceVal').innerHTML = e.target.value;
            });
            
            this.addEvent('change', document.getElementById('minBearing'), function (e) {
                me.geo.options.minBearing = e.target.value;
                document.getElementById('minBearingVal').innerHTML = e.target.value;
            });

            this.addEvent('change', document.getElementById('maxBearing'), function (e) {
                me.geo.options.maxBearing = e.target.value;
                document.getElementById('maxBearingVal').innerHTML = e.target.value;
            });
            
            this.addEvent('change', document.getElementById('sliders'), function (e) {
                me.update();
            });
            
            this.el.innerHTML = this.createFooter([]);
        },
        update: function () {
            this.geo.reset();
            this.geo.add(this.kml);
            var lines = this.geo.calculate(this.kml);
            this.el.innerHTML = this.createFooter(lines);
        },
        /**
         * @method createFooter
         */
        createFooter: function (lines) {
            var me = this,
                i = 0,
                html = '',
                show = false;

            html += '<div class="col w1of3 h1of1 scroll' + (show ? ' line-hide' : ' line-show') + '"><table><tr><th>Name &#x25BE;</th><th>Distance</th><th>Bearing</th></tr>';
            html += this.createTable(lines.sort(function (a, b) {
                // limit lines on google earth to prevent performance issues
                if (i < 200) {
                    me.geo.addLine(a);
                } else if (i === 200) {
                    alert('There are too many lines to be drawn on the map, try narrowing the line filters');
                }
                i += 1;
                return (a.name < b.name) ? -1 : 1;
            }));
            html += '</table></div>';
            html += '<div class="col w1of3 h1of1 scroll' + (show ? ' line-hide' : ' line-show') + '"><table><tr><th>Name</th><th>Distance &#x25BE;</th><th>Bearing</th></tr>';
            html += this.createTable(lines.sort(function (a, b) { return a.distance - b.distance; }));
            html += '</table></div>';
            html += '<div class="col w1of3 h1of1 scroll' + (show ? ' line-hide' : ' line-show') + '"><table><tr><th>Name</th><th>Distance</th><th>Bearing &#x25BE;</th></tr>';
            html += this.createTable(lines.sort(function (a, b) { return a.bearing - b.bearing; }));
            html += '</table></div>';
            
            return html;
        },
        /**
         * @method createTable
         */
        createTable: function (items) {
            var i = 0,
                html = '';
            for (i = 0; i < items.length; i += 1) {
                html += '<tr class="' + (items[i].selected ? 'line-on' : 'line') + '"><td>' + items[i].name + '</td><td>' + items[i].distance.toFixed(2) + 'km</td><td>' + items[i].bearing.toFixed(2) + '° / ' + items[i].bearing2.toFixed(2) + '°</td></tr>';
            }
            if (html === '') {
                html = '<tr><td colspan="3" style="text-align:center;">No results found</td></tr>';
            }
            return html;
        },
        /**
         * @method addEvent
         */
        addEvent: function (name, el, func) {
            if (el.addEventListener) {
                el.addEventListener(name, func, false);
            } else if (el.attachEvent) {
                el.attachEvent('on' + name, func);
            } else {
                el[name] = func;
            }
        }
    };
    return module;
};