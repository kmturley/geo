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
            this.range = document.getElementById('range');
            this.minimum = document.getElementById('minimum');
            this.inputs = this.el.getElementsByTagName('input');
            this.output = document.getElementById('output');
            this.textarea = this.el.getElementsByTagName('textarea')[0];
            this.earth = new Earth();
            this.earth.init();
            this.addEvent('click', this.el, function (e) { me.onClick(e); });
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
        onClick: function (e) {
            if (!e) { e = window.event; }
            if (e.target.nodeName === 'INPUT') {
                var me = this,
                    i = 0,
                    segments = false,
                    urls = [],
                    list = [],
                    lines = [];

                me.earth.reset();
                for (i = 0; i < this.inputs.length; i += 1) {
                    if (this.inputs[i].checked === true) {
                        if (this.inputs[i].value === 'textarea') {
                            list = me.add(this.textarea.value, list);
                        } else if (this.inputs[i].value === 'segments') {
                            segments = true;
                        } else {
                            urls.push(this.inputs[i].value);
                        }
                    }
                }
                if (urls.length > 0) {
                    this.earth.reset();
                    this.loadAll(0, urls, list, function (items) {
                        if (segments === true) {
                            if (items.length < 250) {
                                lines = me.calculate(items, Number(me.range.value), Number(me.minimum.value));
                                if (lines.length < 500) {
                                    me.output.innerHTML = me.generate(lines, Number(me.range.value), Number(me.minimum.value));
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
            console.log('length', data.length);
            for (i = 0; i < data.length; i += 1) {
                coords = (data[i].Point || data[i].Placemark.Point || data[i].Placemark[0].Point).coordinates['#text'].split(',');
                data[i].coords = [Number(coords[0]), Number(coords[1])];
                list.push(data[i]);
                this.earth.addPlace(data[i]);
            }
            return list;
        },
        generate: function (items, range, min) {
            var i = 0,
                j = 0,
                html = '';

            html += '<h1>' + items.length + ' lines <br/>';
            html += 'each with at least ' + min + ' points <br/>';
            html += 'within ' + range + 'km of the line</h1>';

            for (i = 0; i < items.length; i += 1) {
                html += '<h2>' + items[i].points.length + ' points - ' + items[i].distance + 'km</h1><ul>';

                for (j = 0; j < items[i].points.length; j += 1) {
                    html += '<li>' + Math.round(items[i].points[j].distance || 0) + 'km - ' + items[i].points[j].name['#text'] + ' - ' + Math.round(items[i].points[j].deviation || 0) + 'km</li>';
                    // don't draw a line for the first point, and limit number of lines to max of 300
                    if (j > 0 && i < 300) {
                        this.earth.addLine(Math.round(items[i].points[j].distance || 0) + 'km<br />' + items[i].points[0].name['#text'] + '<br />' + items[i].points[j].name['#text'], this.generateColor(items[i].points[j].distance / this.longest), items[i].points[0], items[i].points[j]);
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
        calculate: function (items, maxDistance, minPoints) {
            var i = 0,
                j = 0,
                k = 0,
                R = 6371,
                deviation = 0,
                lines = [],
                line = {},
                point1 = {},
                point2 = {},
                point3 = {},
                latlon1 = {},
                latlon2 = {},
                latlon3 = {},
                count = 0;
            
            this.longest = 0;
            
            // loop through the start point
            for (i = 0; i < items.length; i += 1) {
                latlon1 = new LatLon(items[i].coords[1], items[i].coords[0]);
                point1 = this.cloneObject(items[i]);
                point1.distance = 0;
                point1.deviation = 0;
                
                // loop through the end point
                for (j = (i + 1); j < items.length; j += 1) {
                    latlon2 = new LatLon(items[j].coords[1], items[j].coords[0]);
                    point2 = this.cloneObject(items[j]);
                    point2.distance = latlon1.distanceTo(latlon2);
                    point2.deviation = 0;
                    
                    // create a line from start point to end point
                    line = {
                        distance: latlon1.distanceTo(latlon2),
                        points: [point1, point2]
                    };
                    
                    // loop through the other points as point three
                    for (k = (j + 1); k < items.length; k += 1) {
                        latlon3 = new LatLon(items[k].coords[1], items[k].coords[0]);
                        point3 = this.cloneObject(items[k]);
                        point3.distance = latlon1.distanceTo(latlon3);
                        point3.deviation = Math.abs(Math.asin(Math.sin(point3.distance / R) * Math.sin(latlon1.bearingTo(latlon3).toRad() - latlon1.bearingTo(latlon2).toRad())) * R);
                        count += 1;
                        
                        // if the third point is close enough to the line segment, then add it as a point on this line
                        if (point3.distance >= maxDistance && point3.deviation <= maxDistance) {
                            line.points.push(point3);
                            if (point3.distance > line.distance) {
                                line.distance = point3.distance;
                            }
                        }
                    }
                    
                    // if the line contains several points then shortlist the line
                    if (line.points.length >= minPoints) {
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
        cloneObject: function (obj) {
            var key = '',
                temp = null;
            
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }
            temp = obj.constructor(); // give temp the original obj's constructor
            for (key in obj) {
                temp[key] = this.cloneObject(obj[key]);
            }
            return temp;
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