/*
    Geo
    by kmturley
*/

/*global window, document, google*/

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
        current: {},
        /**
         * @method init
         */
        init: function () {
            var me = this;
            google.load('earth', '1', {'other_params': 'sensor=false'});
            google.setOnLoadCallback(function () {
                google.earth.createInstance('viewer', function (instance) {
                    me.ge = instance;
                    me.ge.getWindow().setVisibility(true);
                }, function (e) {
                    window.alert('error: ' + e);
                });
            });
        },
        /**
         * @method add
         */
        add: function (url, callback) {
            var me = this;
            console.log('add', url);
            google.earth.fetchKml(me.ge, window.location.origin + '/geo/' + url, function (kml) {
                console.log('add.success', kml);
                if (kml) {
                    me.current[url] = kml;
                    me.ge.getFeatures().appendChild(kml);
                    callback(kml);
                }
                if (kml.getAbstractView() !== null) {
                    me.ge.getView().setAbstractView(kml.getAbstractView());
                }
            });
        },
        /**
         * @method remove
         */
        remove: function (url) {
            console.log('remove', url);
            var kml = this.current[url];
            if (kml) {
                console.log('remove.success', kml);
                this.ge.getFeatures().removeChild(kml);
            }
        },
        /**
         * @method getCache
         */
        getCache: function (i, places, items) {
            if (places[i]) {
                return places[i];
            } else {
                var item = items.item(i);
                places[i] = {
                    name: item.getName(),
                    lat: item.getGeometry().getLatitude(),
                    lon: item.getGeometry().getLongitude()
                };
                return places[i];
            }
        },
        /**
         * @method calculate
         */
        calculate: function (kml) {
            var i = 0,
                j = 0,
                items = kml.getElementsByType('KmlPlacemark'),
                length = items.getLength(),
                places = [],
                lines = [],
                line = {};

            for (i = 0; i < length; i += 1) {
                line = { start: this.getCache(i, places, items) };
                for (j = i + 1; j < length; j += 1) {
                    line.end = this.getCache(j, places, items);
                    line.distance = this.distance(line.start, line.end);
                    if (line.distance > this.options.minDistance && line.distance < this.options.maxDistance) {
                        line.bearing = this.bearing(line.start, line.end);
                        line.bearing2 = (line.bearing - 180 < 0 ? line.bearing + 180 : line.bearing - 180);
                        if (line.bearing > this.options.minBearing && line.bearing < this.options.maxBearing) {
                            line.color = this.generateColor(line.distance / this.radius);
                            line.name = line.start.name + '<br/>' + line.end.name;
                            lines.push({
                                bearing: line.bearing,
                                bearing2: line.bearing2,
                                color: line.color,
                                distance: line.distance,
                                name: line.name,
                                start: line.start,
                                end: line.end
                            });
                            this.addLine(line);
                        }
                    }
                }
            }
            console.log('calculate.success', lines.length);
            return lines;
        },
        /**
         * @method addLine
         */
        addLine: function (item) {
            var placemark = this.ge.createPlacemark(''),
                line = this.ge.createLineString(''),
                lineStyle;
            
            //console.log('addLine', item);
            
            line.setTessellate(true);
            line.setAltitudeMode(this.ge.ALTITUDE_CLAMP_TO_GROUND);
            line.getCoordinates().pushLatLngAlt(item.start.lat, item.start.lon, 0);
            line.getCoordinates().pushLatLngAlt(item.end.lat, item.end.lon, 0);
            placemark.setName(item.name);
            placemark.setDescription(item.distance.toFixed(2) + 'km<br/>' + item.bearing.toFixed(2) + '° / ' + item.bearing2.toFixed(2) + '°');
            placemark.setGeometry(line);
            placemark.setStyleSelector(this.ge.createStyle(''));
            lineStyle = placemark.getStyleSelector().getLineStyle();
            lineStyle.setWidth(2);
            lineStyle.getColor().set(item.color);
            this.ge.getFeatures().appendChild(placemark);
        },
        /**
         * @method generateColor
         */
        generateColor: function (value) {
            var r = Math.round(value * 255),
                g = Math.round((1 - Math.abs(0.5 - value)) * 255),
                b = Math.round((1 - value) * 255);
            return (0xff000000 + (0x00010000 * b) + (0x00000100 * g) + (0x00000001 * r)).toString(16);
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
        }
    };
    return module;
};