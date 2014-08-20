/**
 * Geo
 * @class Geo
 * @example var geo = new Geo();
 * @requires LatLon
 **/

/*globals window, document */

var Geo = function () {
    'use strict';
    
    var module = {
        radius: 6371, // earth's mean radius in km
        options: {
            minDistance: 0,
            maxDistance: 40000,
            minBearing: 0,
            maxBearing: 360,
            urls: []
        },
        /**
         * @method init
         */
        init: function (id, options) {
            var me = this,
                html = '';
            this.el = document.getElementById(id);
            /*
            this.loadAll(this.options.urls, function (items) {
                options.onLoad(items);
            });*/
        },
        /**
         * @method loadAll
         */
        loadAll: function (urls, callback, index, list) {
            var me = this;
            if (!index) { index = 0; }
            if (!list) { list = []; }
            if (urls[index]) {
                this.load(urls[index], function (items) {
                    list = me.convertXml(items, list);
                    console.log(urls[index], list.length);
                    if (index < urls.length - 1) {
                        me.loadAll(urls, callback, index + 1, list);
                    } else {
                        callback(list);
                    }
                });
            } else {
                callback([]);
            }
        },
        /**
         * @method load
         */
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
        /**
         * @method convertXml
         */
        convertXml: function (data, list) {
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
            for (i = 0; i < data.length; i += 1) {
                coords = (data[i].Point || data[i].Placemark.Point || data[i].Placemark[0].Point).coordinates['#text'].split(',');
                list.push({
                    name: data[i].name['#text'],
                    lat: Number(coords[1]),
                    lon: Number(coords[0])
                });
            }
            return list;
        },
        /**
         * @method calculate
         */
        calculate: function (items, place) {
            var i = 0,
                j = 0,
                distance = 0,
                bearing = 0,
                selected = false,
                lines = [];
            
            for (i = 0; i < items.length; i += 1) {
                for (j = 0; j < items.length; j += 1) {
                    if (i !== j) {
                        distance = this.distance(items[i], items[j]);
                        if (distance > this.options.minDistance && distance < this.options.maxDistance) {
                            bearing = this.bearing(items[i], items[j]);
                            if (bearing > this.options.minBearing && bearing < this.options.maxBearing) {
                                if (place && (items[i].lat === place.lat && items[i].lon === place.lon) || place && (items[j].lat === place.lat && items[j].lon === place.lon)) {
                                    selected = true;
                                } else {
                                    selected = false;
                                }
                                lines.push({
                                    name: items[i].name + '<br/>' + items[j].name,
                                    distance: distance,
                                    bearing: bearing,
                                    bearing2: (bearing - 180 < 0 ? bearing + 180 : bearing - 180),
                                    color: this.generateColor(distance / this.radius),
                                    start: items[i],
                                    end: items[j],
                                    selected: selected,
                                    duplicate: (i < j) ? true : false
                                });
                            }
                        }
                    }
                }
            }
            return lines;
        },
        generateColor: function (value) {
            var r = Math.round(value * 255),
                g = Math.round((1 - Math.abs(0.5 - value)) * 255),
                b = Math.round((1 - value) * 255);
            return (0xff000000 + (0x00010000 * b) + (0x00000100 * g) + (0x00000001 * r)).toString(16);
        },
        /**
         * @method createTable
         */
        createTable: function (items) {
            var i = 0,
                html = '';
            for (i = 0; i < items.length; i += 1) {
                html += '<tr class="' + (items[i].selected ? 'line-on' : 'line') + '"><td>' + items[i].name + '</td><td>' + items[i].distance.toFixed(2) + 'km</td><td>' + items[i].bearing.toFixed(2) + '°</td></tr>';
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
        },
        /**
         * @method distance
         */
        distance: function (point1, point2) {
            var R = this.radius,
                lat1 = this.toRad(point1.lat),
                lon1 = this.toRad(point1.lon),
                lat2 = this.toRad(point2.lat),
                lon2 = this.toRad(point2.lon),
                dLat = lat2 - lat1,
                dLon = lon2 - lon1,
                a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2),
                c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
                d = R * c;
            return this.toPrecisionFixed(d, 4);
        },
        /**
         * @method bearing
         */
        bearing: function (point1, point2) {
            var lat1 = this.toRad(point1.lat),
                lat2 = this.toRad(point2.lat),
                dLon = this.toRad(point2.lon - point1.lon),
                y = Math.sin(dLon) * Math.cos(lat2),
                x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon),
                brng = Math.atan2(y, x);
            return (this.toDeg(brng) + 360) % 360;
        },
        /**
         * @method toRad
         */
        toRad: function (num) {
            return num * Math.PI / 180;
        },
        /**
         * @method toDeg
         */
        toDeg: function (num) {
            return num * 180 / Math.PI;
        },
        /**
         * @method toPrecisionFixed
         */
        toPrecisionFixed: function (num, precision) {
            var l = 0,
                n = num.toPrecision(precision);
            n = n.replace(/(.+)e\+(.+)/, function (n, sig, exp) {
                sig = sig.replace(/\./, '');
                l = sig.length - 1;
                while (exp-- > l) {
                    sig = sig + '0';
                }
                return sig;
            });
            n = n.replace(/(.+)e-(.+)/, function (n, sig, exp) {
                sig = sig.replace(/\./, '');
                while (exp-- > 1) {
                    sig = '0' + sig;
                }
                return '0.' + sig;
            });
            return Number(n);
        },
        /**
         * @method stringToXml
         */
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
        /**
         * @method xmlToJson
         */
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
                        obj["@attributes"][attribute.nodeName] = attribute.value;
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