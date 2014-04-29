/*
    Earth
    by kmturley
*/

/*global window, document, google*/

var Earth = function () {
    'use strict';
    
    var module = {
        defaults: {
            id: 'map3d'
        },
        init: function () {
            var me = this;

            google.load("earth", "1", {
                "other_params": "sensor=false"
            });
            google.setOnLoadCallback(function () {
                google.earth.createInstance(me.defaults.id, function (e) {
                    me.ge = e;
                    me.ge.getWindow().setVisibility(true);
                    me.ge.getNavigationControl().setVisibility(me.ge.VISIBILITY_SHOW);
                    
                    var lookAt = me.ge.createLookAt('');
                    lookAt.setLatitude(41.26);
                    lookAt.setLongitude(-100.00);
                    lookAt.setRange(8000000.0);
                    me.ge.getView().setAbstractView(lookAt);
                    //me.ge.getNavigationControl().setVisibility(this.ge.VISIBILITY_AUTO);
                    
                    //me.addLine('test', 'ff000000', { coords: [-77.08611455269688, 38.70796969852373]}, {coords: [-83.431027, 39.026381]});
                }, function (e) {
                    console.log('error', e);
                });
            });
        },
        load: function (items) {
            var i = 0,
                j = 0,
                index = false;

            this.lines = items;
            for (i = 0; i < this.lines.length; i += 1) {
                index = this.lines[i].center;
                for (j = 0; j < this.lines[i].places.length; j += 1) {
                    if (index !== false) {
                        this.addLine(this.lines[i], this.lines[i].places[index], this.lines[i].places[j]);
                    } else {
                        this.addPlace(this.lines[i].places[j]);
                        this.addLine(this.lines[i], this.lines[i].places[j - 1], this.lines[i].places[j]);
                    }
                }
            }
        },
        reset: function () {
            var features = this.ge.getFeatures();
            while (features.getLastChild() !== null) {
                features.removeChild(features.getLastChild());
            }
        },
        addKml: function (url) {
            var me = this;
            google.earth.fetchKml(this.ge, url, function (data) {
                console.log('addKml', url, data);
                me.ge.getFeatures().appendChild(data);
            });
        },
        addPlace: function (item) {
            var placemark = this.ge.createPlacemark(''),
                point = this.ge.createPoint(''),
                itempoint = item.Point || item.Placemark.Point || item.Placemark[0].Point,
                longlat = itempoint.coordinates['#text'].split(',');
   
            placemark.setName(item.name['#text']);
            point.setLatitude(Number(longlat[1]));
            point.setLongitude(Number(longlat[0]));
            placemark.setGeometry(point);
            this.ge.getFeatures().appendChild(placemark);
        },
        addLine: function (name, color, item, item2) {
            var i = 0,
                mark = this.ge.createPlacemark(''),
                line = this.ge.createLineString(''),
                lineStyle;
            
            if (color.length !== 8) {
                console.log('invalid color', color);
            }
            line.setTessellate(true);
            line.setAltitudeMode(this.ge.ALTITUDE_CLAMP_TO_GROUND);
            line.getCoordinates().pushLatLngAlt(item.coords[1], item.coords[0], 0);
            line.getCoordinates().pushLatLngAlt(item2.coords[1], item2.coords[0], 0);
            mark.setName(name);
            //mark.setDescription(item.desc);
            mark.setGeometry(line);

            // styling
            mark.setStyleSelector(this.ge.createStyle(''));
            lineStyle = mark.getStyleSelector().getLineStyle();
            lineStyle.setWidth(2);
            lineStyle.getColor().set(color);
            this.ge.getFeatures().appendChild(mark);
        }
    };
    return module;
};