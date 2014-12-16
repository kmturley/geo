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
            minDeviation: 0,
            maxDeviation: 0.5,
            minDistance: 0,
            maxDistance: 10000,
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
                    me.ge.getNavigationControl().setVisibility(me.ge.VISIBILITY_SHOW);
                }, function (e) {
                    window.alert('error: ' + e);
                });
            });
        },
        /**
         * @method load
         */
        load: function (url, callback) {
            var me = this;
            console.log('add', url);
            google.earth.fetchKml(me.ge, window.location.origin + '/geo/' + url, function (kml) {
                if (kml) {
                    me.current[url] = kml;
                    callback(kml);
                }
                if (kml.getAbstractView() !== null) {
                    me.ge.getView().setAbstractView(kml.getAbstractView());
                }
            });
        },
        /**
         * @method add
         */
        add: function () {
            var url;
            for (url in this.current) {
                this.ge.getFeatures().appendChild(this.current[url]);
            }
        },
        /**
         * @method remove
         */
        remove: function (url) {
            console.log('remove', url);
            if (this.current[url]) {
                this.ge.getFeatures().removeChild(this.current[url]);
                delete this.current[url];
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
        calculate: function () {
            var placemarks = [],
                place = {},
                items = [],
                i = 0,
                length = 0,
                url = '';
            
            // put all kml files into one array ready for calculation
            for (url in this.current) {
                placemarks = this.current[url].getElementsByType('KmlPlacemark');
                length = placemarks.getLength();
                for (i = 0; i < length; i += 1) {
                    place = placemarks.item(i);
                    items.push({
                        name: place.getName(),
                        lat: place.getGeometry().getLatitude(),
                        lon: place.getGeometry().getLongitude()
                    });
                }
                console.log(url, items.length);
            }
            length = items.length;
            
            var j = 0,
                k = 0,
                places = [],
                lines = [],
                line = {},
                match = false,
                distance1 = 0,
                distance2 = 0,
                distance3 = 0,
                bearing1 = 0,
                bearing2 = 0,
                bearing2reverse = 0,
                bearing3 = 0,
                deviation = 0;
            
            for (i = 0; i < length; i += 1) {
                distance1 = 0;
                bearing1 = 0;
                for (j = i + 1; j < length; j += 1) {
                    distance2 = this.distance(items[i], items[j]);
                    if (distance2 > this.options.minDistance && distance2 < this.options.maxDistance) {
                        bearing2 = this.bearing(items[i], items[j]);
                        bearing2reverse = (bearing2 - 180 < 0 ? bearing2 + 180 : bearing2 - 180);
                        if ((bearing2 > this.options.minBearing && bearing2 < this.options.maxBearing) || (bearing2reverse > this.options.minBearing && bearing2reverse < this.options.maxBearing)) {
                            match = false;
                            for (k = 0; k < length; k += 1) {
                                if (k !== i && k !== j) {
                                    distance3 = this.distance(items[i], items[k]);
                                    bearing3 = this.bearing(items[i], items[k]);
                                    deviation = Math.abs(Math.asin(Math.sin(distance3 / this.radius) * Math.sin(this.toRad(bearing3) - this.toRad(bearing2))) * this.radius);
                                    if (deviation > this.options.minDeviation && deviation < this.options.maxDeviation) {
                                        //console.log(items[i].name + ' to ' + items[j].name + ' is ' + distance2 + 'km / ' + bearing2 + '°');
                                        //console.log(items[i].name + ' to ' + items[k].name + ' is ' + distance3 + 'km / ' + bearing3 + '°');
                                        match = true;
                                    }
                                }
                            }
                            if (match === true) {
                                lines.push({
                                    bearing: bearing2,
                                    bearing2: (bearing2 - 180 < 0 ? bearing2 + 180 : bearing2 - 180),
                                    color: this.generateColor(distance2 / this.radius),
                                    distance: distance2,
                                    name: items[i].name + '<br/>' + items[j].name,
                                    start: items[i],
                                    end: items[j]
                                });
                            }
                        }
                    }
                }
            }
            console.log('calculate.success', lines);
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
         * @method reset
         */
        reset: function () {
            var features = this.ge.getFeatures();
            while (features.getLastChild() !== null) {
                features.removeChild(features.getLastChild());
            }
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
         * @method deviation
         */
        deviation: function (bearing1, bearing2, distance) {
            return Math.abs(Math.asin(Math.sin(distance / this.radius) * Math.sin(this.toRad(bearing2) - this.toRad(bearing1))) * this.radius);
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