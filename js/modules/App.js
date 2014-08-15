/**
 * App
 * @class App
 **/

/*globals window, document, Earth, Geo */

(function () {
    'use strict';
    
    var place = {},
        places = [],
        lines = [];

    var earth = new Earth();
    earth.init('viewer', {
        maxPlaces: 1000,
        maxLines: 1000,
        onLoad: function (e) {
            //earth.addPlaces(places);
        },
        onClick: function (item) {
            place = item;
            earth.addLines(lines, place);
        }
    });

    var geo = new Geo();
    geo.init('results', {
        minDistance: 0,
        maxDistance: 40000,
        minBearing: 0,
        maxBearing: 360,
        urls: [
            //'kml/landmarks.kml',
            //'kml/monoliths.kml',
            //'kml/pyramids.kml',
            //'kml/structures.kml',
            //'kml/us-state-capitals.kml',
            //'kml/worship.kml'
        ],
        onLoad: function (items) {
            update(items);
        }
    });

    function update(items) {
        var html = '';
        places = items;
        lines = geo.calculate(items);
        html += '<div class="col w1of3 h1of1 scroll"><table><tr><th>Name &#x25BE;</th><th>Distance</th><th>Bearing</th></tr>';
        html += geo.createTable(lines.sort(function (a, b) { return (a.name < b.name) ? -1 : 1; }));
        html += '</table></div>';
        html += '<div class="col w1of3 h1of1 scroll"><table><tr><th>Name</th><th>Distance &#x25BE;</th><th>Bearing</th></tr>';
        html += geo.createTable(lines.sort(function (a, b) { return a.distance - b.distance; }));
        html += '</table></div>';
        html += '<div class="col w1of3 h1of1 scroll"><table><tr><th>Name</th><th>Distance</th><th>Bearing &#x25BE;</th></tr>';
        html += geo.createTable(lines.sort(function (a, b) { return a.bearing - b.bearing; }));
        html += '</table></div>';
        geo.el.innerHTML = html;
    }

    function checkInputs() {
        var inputs = document.getElementById('inputs').getElementsByTagName('input'),
            urls = [];
        for (var i = 0; i < inputs.length; i += 1) {
            if (inputs[i].checked === true) {
                urls.push(inputs[i].value);
            }
        }
        earth.reset();
        geo.loadAll(urls, function (items) {
            earth.addPlaces(items);
            update(items);
        });
    }

    function resetInputs() {
        var inputs = document.getElementById('inputs').getElementsByTagName('input');
        for (var i = 0; i < inputs.length; i += 1) {
            inputs[i].checked = false;
        }
        earth.reset();
    }

    document.getElementById('inputs').addEventListener('click', function (e) {
        if (e.target.value) {
            checkInputs();
        }
    });

    document.getElementById('reset').addEventListener('click', function (e) {
        resetInputs();
    });

    window.setTimeout(function () {
        checkInputs();
    }, 2000);
}());