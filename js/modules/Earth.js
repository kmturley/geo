/*
    Earth
    by kmturley
*/

/*global window, document, google*/

var Earth = function () {
    'use strict';
    
    var module = {
        init: function (id, options) {
            var me = this;
            this.el = document.getElementById(id);
            this.options = options || { maxPlaces: 1000, maxLines: 1000 };
            google.load("earth", "1", {
                "other_params": "sensor=false"
            });
            google.setOnLoadCallback(function () {
                google.earth.createInstance(id, function (event) {
                    me.ge = event;
                    me.ge.getWindow().setVisibility(true);
                    me.ge.getNavigationControl().setVisibility(me.ge.VISIBILITY_SHOW);
                    var lookAt = me.ge.createLookAt('');
                    lookAt.setLatitude(41.26);
                    lookAt.setLongitude(-100.00);
                    lookAt.setRange(8000000.0);
                    me.ge.getView().setAbstractView(lookAt);
                    google.earth.addEventListener(me.ge.getWindow(), 'mousedown', function (e) {
                        if (e.getTarget().getType() === 'KmlPlacemark' && e.getTarget().getGeometry().getType() === 'KmlPoint') {
                            var point = e.getTarget().getGeometry();
                            me.options.onClick({
                                lat: point.getLatitude(),
                                lon: point.getLongitude()
                            });
                        }
                    });
                    options.onLoad();
                });
            });
        },
        reset: function () {
            var features = this.ge.getFeatures();
            while (features.getLastChild() !== null) {
                features.removeChild(features.getLastChild());
            }
        },
        addPlaces: function (items) {
            var i = 0,
                total = items.length < this.options.maxPlaces ? items.length : this.options.maxPlaces;
            for (i = 0; i < total; i += 1) {
                this.addPlace(items[i]);
            }
        },
        addPlace: function (item) {
            var placemark = this.ge.createPlacemark(''),
                point = this.ge.createPoint('');
            point.setLatitude(item.lat);
            point.setLongitude(item.lon);
            placemark.setName(item.name);
            placemark.setDescription(item.lat.toFixed(2) + ', ' + item.lon.toFixed(2));
            placemark.setGeometry(point);
            this.ge.getFeatures().appendChild(placemark);
        },
        addLines: function (items, filter) {
            var i = 0,
                total = items.length < this.options.maxLines ? items.length : this.options.maxLines;
            for (i = 0; i < items.length; i += 1) {
                if (filter) {
                    if (filter.lat === items[i].start.lat && filter.lon === items[i].start.lon) {
                        this.addLine(items[i]);
                    } else if (filter.lat === items[i].end.lat && filter.lon === items[i].end.lon) {
                        this.addLine(items[i]);
                    }
                } else if (items[i].duplicate !== true) {
                    this.addLine(items[i]);
                    if (i > total) {
                        return false;
                    }
                }
            }
        },
        addLine: function (item) {
            var placemark = this.ge.createPlacemark(''),
                line = this.ge.createLineString(''),
                lineStyle;
            
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
        }
    };
    return module;
};