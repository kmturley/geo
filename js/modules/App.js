/**
 * App
 * @class App
 **/

/*globals window, document, Earth, Geo */

(function () {
    'use strict';
    
    var lines = [],
        places = [],
        place = {};
    
    var earth = new Earth();
    earth.init('viewer', {
        onClick: function (item) {
            place = item;
            earth.addLines(lines, place);
            update();
        }
    });

    var geo = new Geo();
    geo.init('results');

    function update(items) {
        var html = '',
            show = document.getElementById('show').checked;
        if (items) {
            places = items;
        }
        lines = geo.calculate(places, place);
        html += '<div class="col w1of3 h1of1 scroll' + (show ? ' line-hide' : ' line-show') + '"><table><tr><th>Name &#x25BE;</th><th>Distance</th><th>Bearing</th></tr>';
        html += geo.createTable(lines.sort(function (a, b) { return (a.name < b.name) ? -1 : 1; }), place);
        html += '</table></div>';
        html += '<div class="col w1of3 h1of1 scroll' + (show ? ' line-hide' : ' line-show') + '"><table><tr><th>Name</th><th>Distance &#x25BE;</th><th>Bearing</th></tr>';
        html += geo.createTable(lines.sort(function (a, b) { return a.distance - b.distance; }), place);
        html += '</table></div>';
        html += '<div class="col w1of3 h1of1 scroll' + (show ? ' line-hide' : ' line-show') + '"><table><tr><th>Name</th><th>Distance</th><th>Bearing &#x25BE;</th></tr>';
        html += geo.createTable(lines.sort(function (a, b) { return a.bearing - b.bearing; }), place);
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
        geo.loadAll(urls, function (places) {
            earth.addPlaces(places);
            update(places);
        });
    }

    function resetInputs() {
        var inputs = document.getElementById('inputs').getElementsByTagName('input');
        for (var i = 0; i < inputs.length; i += 1) {
            inputs[i].checked = false;
        }
        place = null;
        earth.reset();
        update();
    }

    document.getElementById('inputs').addEventListener('click', function (e) {
        if (e.target.value) {
            checkInputs();
        }
    });

    document.getElementById('reset').addEventListener('click', function (e) {
        resetInputs();
    });
    
    document.getElementById('show').addEventListener('click', function (e) {
        update();
    });

    window.setTimeout(function () {
        checkInputs();
    }, 2000);
}());