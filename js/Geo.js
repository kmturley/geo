/**
 * Geo - Calculating line segments from points
 * by kmturley
*/

/*global window, document, LatLon, Earth*/

var Geo = function () {
    'use strict';
    
    var module = {
        init: function (options) {
            var me = this;
            this.el = document.getElementById(options.id);
            this.custom = document.getElementById('custom');
            this.output = document.getElementById('output');
            this.inputs = this.el.getElementsByTagName('input');
            this.files = this.getInputs('file');
            this.earth = new Earth();
            this.earth.init();
            this.addEvent('click', this.el, function (e) {
                if (!e) { e = window.event; }
                me.onClick(e.target);
            });
            window.setTimeout(function () {
                me.onClick(me.getInputs('calculate')[0]);
            }, 1000);
        },
        getInputs: function (name) {
            var i = 0,
                list = [];
            for (i = 0; i < this.inputs.length; i += 1) {
                if (name === this.inputs[i].getAttribute('name')) {
                    list.push(this.inputs[i]);
                }
            }
            return list;
        },
        addEvent: function (name, el, func) {
            if (el.addEventListener) {
                el.addEventListener(name, func, false);
            } else if (el.attachEvent) {
                el.attachEvent('on' + name, func);
            } else {
                el[name] = func;
            }
        },
        onClick: function (el) {
            if (el.nodeName === 'INPUT' && el.getAttribute('type') === 'checkbox') {
                var me = this,
                    i = 0,
                    segments = this.getInputs('calculate')[0].checked,
                    urls = [],
                    list = [],
                    lines = [];

                me.earth.reset();
                for (i = 0; i < this.files.length; i += 1) {
                    if (this.files[i].checked === true) {
                        if (this.files[i].value === 'textarea') {
                            list = me.add(this.custom.value, list);
                        } else {
                            urls.push(this.files[i].value);
                        }
                    }
                }
                if (urls.length > 0) {
                    this.earth.reset();
                    this.loadAll(0, urls, list, function (items) {
                        if (segments === true) {
                            if (items.length < 500) {
                                lines = me.calculate(items, Number(me.getInputs('maxDistance')[0].value), Number(me.getInputs('minPoints')[0].value), Number(me.getInputs('minLength')[0].value), Number(me.getInputs('maxLength')[0].value), Number(me.getInputs('minBearing')[0].value), Number(me.getInputs('maxBearing')[0].value));
                                if (lines.length < 1000) {
                                    me.output.innerHTML = me.generate(lines, Number(me.getInputs('maxDistance')[0].value), Number(me.getInputs('minPoints')[0].value), Number(me.getInputs('minLength')[0].value), Number(me.getInputs('maxLength')[0].value), Number(me.getInputs('minBearing')[0].value), Number(me.getInputs('maxBearing')[0].value));
                                } else {
                                    me.output.innerHTML = lines.length + ' lines is too many combinations to computer efficiently in the browser';
                                }
                            } else {
                                me.output.innerHTML = items.length + ' points is too many combinations to computer efficiently in the browser';
                            }
                        }
                    });
                }
            }
        },
        loadAll: function (index, urls, list, callback) {
            var me = this;
            this.load(urls[index], function (data) {
                list = me.add(data, list);
                if (index < urls.length - 1) {
                    me.loadAll(index + 1, urls, list, callback);
                } else {
                    callback(list);
                }
            });
        },
        load: function (url, callback) {
            var me = this,
                xhr = new window.XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        callback(xhr.responseText);
                    } else {
                        callback('error');
                    }
                }
            };
            xhr.send();
        },
        add: function (data, list) {
            var i = 0,
                coords = [];
            data = this.stringToXml(data);
            data = this.xmlToJson(data);
            if (data.Folder) {
                data = data.Folder.Placemark;
            } else if (data.Document && data.Document.Folder) {
                if (data.Document.Folder.Placemark) {
                    data = data.Document.Folder.Placemark;
                } else {
                    data = data.Document.Folder;
                }
            } else if (data.Document) {
                data = data.Document.Placemark;
            }
            //console.log('length', data.length);
            for (i = 0; i < data.length; i += 1) {
                coords = (data[i].Point || data[i].Placemark.Point || data[i].Placemark[0].Point).coordinates['#text'].split(',');
                data[i].coords = [Number(coords[0]), Number(coords[1])];
                list.push(data[i]);
                this.earth.addPlace(data[i]);
            }
            return list;
        },
        generate: function (items, maxDistance, minPoints, minLength, maxLength, minBearing, maxBearing) {
            //console.log('generate', items, maxDistance, minPoints, minLength, maxLength, minBearing, maxBearing);
            var i = 0,
                j = 0,
                bearing = 0,
                distance = 0,
                html = '';

            html += '<h1>' + items.length + ' lines between ' + minLength + 'km and ' + maxLength + 'km in length<br/>';
            html += 'each has at least ' + minPoints + ' points less than ' + maxDistance + 'km from the line</h1>';

            for (i = 0; i < items.length; i += 1) {
                html += '<h2>' + items[i].points.length + ' points</h1><ul>';
                
                // because we are resorting the points, we will need to recalculate the bearings and distances
                bearing = 0;
                distance = 0;
                items[i].points.sort(function (a, b) { return b._lat - a._lat; });

                for (j = 0; j < items[i].points.length; j += 1) {
                    html += '<li>' + distance + 'km / ' + bearing + '° / ' + items[i].points[j].name + ' / ';
                    html += items[i].points[j]._lat + ', ' + items[i].points[j]._lon + '</li>';

                    if (j < items[i].points.length - 1) {
                        bearing = items[i].points[j].bearingTo(items[i].points[j + 1]).toFixed(2);
                        distance = items[i].points[j].distanceTo(items[i].points[j + 1]);
                        this.earth.addLine(items[i].points[j].name + '<br />' + items[i].points[j + 1].name + '<br />' + distance + 'km<br />' + bearing + '°', this.generateColor(distance / this.longest), items[i].points[j], items[i].points[j + 1]);
                    }
                }
                html += '</ul>';
            }
            return html;
        },
        generateColor: function (value) {
            var r = Math.round(value * 255),
                g = Math.round((1 - Math.abs(0.5 - value)) * 255),
                b = Math.round((1 - value) * 255);
            return (0xff000000 + (0x00010000 * b) + (0x00000100 * g) + (0x00000001 * r)).toString(16);
        },
        calculate: function (items, maxDeviation, minPoints, minLength, maxLength, minBearing, maxBearing) {
            //console.log('calculate', items, maxDeviation, minPoints, minLength, maxLength);
            var i = 0,
                j = 0,
                k = 0,
                R = 6371,
                deviation = 0,
                lines = [],
                line = {},
                latlon1 = {},
                latlon2 = {},
                latlon3 = {},
                count = 0;
            
            this.longest = 0;
            
            // loop through the start point
            for (i = 0; i < items.length; i += 1) {
                latlon1 = new LatLon(items[i].coords[1], items[i].coords[0]);
                latlon1.name = items[i].name['#text'];
                
                // loop through the end point
                for (j = (i + 1); j < items.length; j += 1) {
                    latlon2 = new LatLon(items[j].coords[1], items[j].coords[0]);
                    latlon2.name = items[j].name['#text'];
                    latlon2.bearing = latlon1.bearingTo(latlon2);
                    latlon2.bearingRad = latlon2.bearing.toRad();
                    latlon2.distance = latlon1.distanceTo(latlon2);

                    // create a line from start point to end point
                    line = {
                        bearing: latlon2.bearing,
                        distance: latlon2.distance,
                        points: [latlon1, latlon2]
                    };
                    
                    // loop through the other points as point three
                    for (k = (j + 1); k < items.length; k += 1) {
                        latlon3 = new LatLon(items[k].coords[1], items[k].coords[0]);
                        latlon3.name = items[k].name['#text'];
                        latlon3.bearing = latlon1.bearingTo(latlon3);
                        latlon3.bearingRad = latlon3.bearing.toRad();
                        latlon3.distance = latlon1.distanceTo(latlon3);
                        latlon3.deviation = Math.abs(Math.asin(Math.sin(latlon3.distance / R) * Math.sin(latlon3.bearingRad - latlon2.bearingRad)) * R);
                        count += 1;

                        // if the third point is close enough to the line segment, then add it as a point on this line
                        if (latlon3.deviation <= maxDeviation) {
                            line.points.push(latlon3);
                            if (latlon3.distance > line.distance) {
                                line.distance = latlon3.distance;
                            }
                        }
                    }
                    
                    // if the line contains enough points and between the min and max length
                    if (line.points.length >= minPoints &&
                        line.distance > minLength && line.distance < maxLength &&
                        line.bearing > minBearing && line.bearing < maxBearing) {
                        lines.push(line);
                        if (line.distance > this.longest) {
                            this.longest = line.distance;
                        }
                    }
                }
            }
            return lines;
        },
        degreesToRadians: function (degrees) {
            return degrees * (Math.PI / 180);
        },
        radiansToDegrees: function (radians) {
            return radians * (180 / Math.PI);
        },
        distToSegment: function (lat1, lon1, lat2, lon2, lat3, lon3) {
            var y = Math.sin(lon3 - lon1) * Math.cos(lat3),
                x = Math.cos(lat1) * Math.sin(lat3) - Math.sin(lat1) * Math.cos(lat3) * Math.cos(lat3 - lat1),
                bearing1 = this.radiansToDegrees(Math.atan2(y, x));
            
            bearing1 = 360 - (bearing1 + 360 % 360);
            var y2 = Math.sin(lon2 - lon1) * Math.cos(lat2);
            var x2 = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lat2 - lat1);
            var bearing2 = this.radiansToDegrees(Math.atan2(y2, x2));
            bearing2 = 360 - (bearing2 + 360 % 360);
            var lat1Rads = this.degreesToRadians(lat1);
            var lat3Rads = this.degreesToRadians(lat3);
            var dLon = this.degreesToRadians(lon3 - lon1);
            
            var distanceAC = Math.acos(Math.sin(lat1Rads) * Math.sin(lat3Rads) + Math.cos(lat1Rads) * Math.cos(lat3Rads) * Math.cos(dLon)) * 6371;
            var min_distance = Math.abs(Math.asin(Math.sin(distanceAC / 6371) * Math.sin(this.degreesToRadians(bearing1) - this.degreesToRadians(bearing2))) * 6371);
            return { distance: min_distance, bearing: bearing1 };
        },
        stringToXml: function (txt) {
            var xmlDoc = null,
                parser = null;
            if (window.DOMParser) {
                parser = new window.DOMParser();
                xmlDoc = parser.parseFromString(txt, "application/xml");
            } else {
                xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
                xmlDoc.async = false;
                xmlDoc.loadXML(txt);
            }
            return xmlDoc.documentElement;
        },
        xmlToJson: function (xml) {
            var obj = {},
                i = 0,
                j = 0,
                attribute = {},
                item = {},
                nodeName = '',
                old = [];
            
            if (xml.nodeType === 1) {
                if (xml.attributes.length > 0) {
                    obj["@attributes"] = {};
                    for (j = 0; j < xml.attributes.length; j += 1) {
                        attribute = xml.attributes.item(j);
                        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
                    }
                }
            } else if (xml.nodeType === 3) { // text
                obj = xml.nodeValue;
            }
            if (xml.hasChildNodes()) {
                for (i = 0; i < xml.childNodes.length; i += 1) {
                    item = xml.childNodes.item(i);
                    nodeName = item.nodeName;
                    if (typeof obj[nodeName] === "undefined") {
                        obj[nodeName] = this.xmlToJson(item);
                    } else {
                        if (typeof obj[nodeName].push === "undefined") {
                            old = obj[nodeName];
                            obj[nodeName] = [];
                            obj[nodeName].push(old);
                        }
                        obj[nodeName].push(this.xmlToJson(item));
                    }
                }
            }
            return obj;
        }
    };
    return module;
};