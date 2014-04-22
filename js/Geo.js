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
            var me = this,
                i = 0,
                segments = false,
                urls = [],
                list = [];
            
            if (!e) { e = window.event; }
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
                        me.output.innerHTML = me.generate(items, Number(me.range.value), Number(me.minimum.value));
                    }
                });
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
            var i = 0;
            data = this.stringToXml(data);
            data = this.xmlToJson(data);
            data = data.Document.Folder ? data.Document.Folder.Placemark : data.Document.Placemark;
            for (i = 0; i < data.length; i += 1) {
                list.push(data[i]);
                this.earth.addPlace(data[i]);
            }
            return list;
        },
        generate: function (places, range, min) {
            console.log('generate start', places, range, min);

            var i = 0,
                j = 0,
                html = '',
                items = this.calculate(places, range, min); // distance allowed points to be from the line, min number of matches for line to be outputted
            
            console.log('generate end', items);
            
            html += '<h1>' + items.length + ' lines <br/>';
            html += 'each with at least ' + min + ' points <br/>';
            html += 'within ' + range + 'km of the line</h1>';

            for (i = 0; i < items.length; i += 1) {
                html += '<h2>' + items[i].points.length + ' points - ' + items[i].bearing + '° - ' + items[i].distance + 'km</h1><ul>';
                this.earth.addLine(items[i].bearing + '° - ' + items[i].distance + 'km', this.generateColor(items[i].distance / this.longest), items[i].points[0], items[i].points[1]);
                
                for (j = 0; j < items[i].points.length; j += 1) {
                    html += '<li>' + Math.round(items[i].points[j].deviation || 0) + 'km - ' + items[i].points[j].name['#text'] + ' ' + Math.round(items[i].points[j].bearing || 0) + '</li>';
                }
                html += '</ul>';
            }
            return html;
        },
        generateColor: function (value) {
            var r = Math.round(value * 255),
                g = Math.round((1 - Math.abs(0.5 - value)) * 255),
                b = Math.round((1 - value) * 255);
            r = r.toString(16);
            g = g.toString(16);
            b = b.toString(16);
            if (r === 0) {
                r = '00';
            }
            if (g === 0) {
                g = '00';
            }
            if (b === 0) {
                b = '00';
            }
            return 'ff' + b + g + r;
        },
        calculate: function (items, maxDistance, minPoints) {
            var i = 0,
                j = 0,
                k = 0,
                c1 = [],
                c2 = [],
                c3 = [],
                p1 = {},
                p2 = {},
                p3 = {},
                R = 6371,
                distance = 0,
                point = {},
                line = {},
                lines = [];
            
            this.longest = 0;
            
            if (typeof maxDistance === undefined) { maxDistance = 0.2; } // 1km
            if (typeof minPoints === undefined) { minPoints = 3; } // 3 = start point, end point and at least one other point in line
            
            // loop through points to start line segment
            for (i = 0; i < items.length; i += 1) {
                c1 = items[i].Point.coordinates['#text'].split(',');
                p1 = new LatLon(c1[1], c1[0]);
                
                // loop through points to end the line segment
                for (j = (i + 1); j < items.length; j += 1) {
                    c2 = items[j].Point.coordinates['#text'].split(',');
                    p2 = new LatLon(c2[1], c2[0]);
                    line = {
                        name: 'Line ' + (lines.length + 1),
                        points: [items[i], items[j]],
                        bearing: Math.round(p1.bearingTo(p2)),
                        distance: Math.round(p1.distanceTo(p2))
                    };

                    // loop through all other points and check minimum distance to line segment
                    for (k = 0; k < items.length; k += 1) {
                        if (k !== i && k !== j) {
                            c3 = items[k].Point.coordinates['#text'].split(',');
                            p3 = new LatLon(c3[1], c3[0]);
                            distance = Math.abs(Math.asin(Math.sin(p1.distanceTo(p3) / R) * Math.sin(p1.bearingTo(p3).toRad() - p1.bearingTo(p2).toRad())) * R);

                            // if point is close enough to line segment then shortlist
                            if (distance <= maxDistance) {
                                point = this.cloneObject(items[k]);
                                point.lat = c3[1];
                                point.long = c3[0];
                                point.deviation = distance;
                                line.points.push(point);
                            }
                        }
                    }
                    // if the number of matches is enough then save the line
                    if (line.points.length >= minPoints) {
                        lines.push(line);
                        
                        // update the longest line matched with points
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