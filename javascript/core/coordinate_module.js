import {NewMap} from './Main_class';
import {transformation} from './SphericalMercatorTileLayer_class.js';

Object.assign(NewMap.prototype, {
    toPoint,
    convertProjPointToPixelPoint,
    convertProjPointToOffsetPixelPoint,
    screenPointToProjection,
    convertSPToWGS84,
    convertWGS84ProjectionToWGS84LatLon,
    minutes,
    updateStatePlaneCoordsByDistance,
    updateStatePlaneCoordsByOrigin,
    updateVisExtentByOriginAndResolution,
    getPixelPointInMapContainer,
    getPanOffsetPoint,
    distanceBetween,
    convertSPToWGS84Proj,
    getResolution,
});

export function toPoint(x, y) {
    if (Array.isArray(x)) {
        return {
            x: x[0],
            y: x[1],
        };
    }
    if (x === Object(x)) {
        //https://stackoverflow.com/questions/8511281/check-if-a-value-is-an-object-in-javascript
        return {
            x: x.x || x.X,
            y: x.y || x.Y,
        };
    }
    return {
        x: x,
        y: y,
    };
}

function convertProjPointToPixelPoint(spPoint) {
    var xRatio =
            this.mapContainer.width /
            (this.extent.visible.X - this.extent.visible.x), // For paths.
        yRatio =
            this.mapContainer.height /
            (this.extent.visible.Y - this.extent.visible.y); // For paths.
    //var resolution = this.zoomIndex[this.zoom].resolution;

    //console.log(xRatio, resolution, (spPoint.x - this.extent.visible.x) * xRatio)

    return {
        x: (spPoint.x - this.extent.visible.x) * xRatio,
        y: (this.extent.visible.Y - spPoint.y) * yRatio,
    };
}

function convertProjPointToOffsetPixelPoint(point) {
    var screenPoint = this.convertProjPointToPixelPoint(point);

    return {
        x: screenPoint.x - this.mainContainer.left,
        y: screenPoint.y - this.mainContainer.top,
    };
}

function screenPointToProjection(point) {
    var spWidth = this.extent.visible.X - this.extent.visible.x;
    var spHeight = this.extent.visible.Y - this.extent.visible.y;

    var originLR = point.x / this.mapContainer.width;
    var originTB = point.y / this.mapContainer.height;

    return {
        x: this.extent.visible.x + spWidth * originLR,
        y: this.extent.visible.Y - spHeight * originTB,
    };
}

// Convert state plane coordinates to wgs 84 coordinates...I'm guessing anyway, not sure.
export function convertSPToWGS84(spPoint) {
    var uX = spPoint.x,
        uY = spPoint.y;
    // Copied from scopi! How about that!
    var sqrt = window.Math.sqrt,
        pow = window.Math.pow,
        atan = window.Math.atan,
        sin = window.Math.sin,
        abs = window.Math.abs,
        part1 = undefined,
        rho = undefined,
        theta = undefined,
        txy = undefined,
        lon = undefined,
        lat0 = undefined,
        lat1 = undefined,
        Lat = undefined,
        Lon = undefined;

    uX = uX - 1640416.666666667;
    uY = uY - 0;
    rho = sqrt(pow(uX, 2) + pow(19205309.96888484 - uY, 2));
    theta = atan(uX / (19205309.96888484 - uY));
    txy = pow(rho / (20925646.0 * 1.8297521088829285), 1 / 0.7445203265542939);
    lon = theta / 0.7445203265542939 + -2.1089395128333326;
    uX = uX + 1640416.666666667;
    lat0 = 1.5707963267948966 - 2 * atan(txy);
    part1 = (1 - 0.08181905782 * sin(lat0)) / (1 + 0.08181905782 * sin(lat0));
    lat1 = 1.5707963267948966 - 2 * atan(txy * pow(part1, 0.08181905782 / 2));
    while (abs(lat1 - lat0) > 0.000000002) {
        lat0 = lat1;
        part1 =
            (1 - 0.08181905782 * sin(lat0)) / (1 + 0.08181905782 * sin(lat0));
        lat1 =
            1.5707963267948966 - 2 * atan(txy * pow(part1, 0.08181905782 / 2));
    }
    Lat = lat1 / 0.01745329252;
    Lon = lon / 0.01745329252;
    return {lat: Lat, lng: Lon};
}

/*
function convertSP(uX, uY) {
    // Copied from SCOPI for future use. Has not been modified from SCOPI.

    //=20925604.00;         // major radius of ellipsoid, map units (NAD 83) in feet?
    a = 20925646.0; // see http://dbwww.essc.psu.edu/lasdoc/overview/geomreg/appe.html
    //=20925604.48;         // more accurate ?
    //=20855486.59;         // minor radius
    ec = 0.08181905782; // eccentricity of ellipsoid (NAD 83)
    // = 0.0066943496;      // see http://dbwww.essc.psu.edu/lasdoc/overview/geomreg/appe.html
    angRad = 0.01745329252; // number of radians in a degree
    pi4 = Math.PI / 4;
    //Boulder County, CO
    //p0 = 39.333333 * angRad;  // latitude of origin
    //p1 = 39.716667 * angRad;  // latitude of first standard parallel (aka standard parallel-south?)
    //p2 = 40.783333 * angRad;  // latitude of second standard parallel  (aka standard parallel-north?)
    //m0 = -105.5 * angRad;     // central meridian (aka longitude of origin)
    //x0 = 3000000.000000;      // false easting of central meridian, map units
    //y0 = 1000000.000000;      // false northing
    //Snohomish County, WA
    p0 = 47.0 * angRad; // latitude of origin
    p1 = 47.5 * angRad; // latitude of first standard parallel (aka standard parallel-south?)
    p2 = 48.73333333333333 * angRad; // latitude of second standard parallel  (aka standard parallel-north?)
    m0 = -120.8333333333333 * angRad; // central meridian (aka longitude of origin)
    x0 = 1640416.666666667; // false easting of central meridian, map units
    y0 = 0.0; // false northing

    // Calculate the coordinate system constants.
    with (Math) {
        m1 = cos(p1) / sqrt(1 - pow(ec, 2) * pow(sin(p1), 2));
        m2 = cos(p2) / sqrt(1 - pow(ec, 2) * pow(sin(p2), 2));
        t0 = tan(pi4 - p0 / 2);
        t1 = tan(pi4 - p1 / 2);
        t2 = tan(pi4 - p2 / 2);
        t0 = t0 / pow((1 - ec * sin(p0)) / (1 + ec * sin(p0)), ec / 2);
        t1 = t1 / pow((1 - ec * sin(p1)) / (1 + ec * sin(p1)), ec / 2);
        t2 = t2 / pow((1 - ec * sin(p2)) / (1 + ec * sin(p2)), ec / 2);
        n = log(m1 / m2) / log(t1 / t2);
        f = m1 / (n * pow(t1, n));
        rho0 = a * f * pow(t0, n);

        // Convert the coordinate to Latitude/Longitude.

        // Calculate the Longitude.
        uX = uX - x0;
        uY = uY - y0; // mes added false northing applies in 0501 (?)
        pi2 = pi4 * 2;

        rho = sqrt(pow(uX, 2) + pow(rho0 - uY, 2));
        theta = atan(uX / (rho0 - uY));
        txy = pow(rho / (a * f), 1 / n);
        lon = theta / n + m0;
        uX = uX + x0;

        // Estimate the Latitude
        lat0 = pi2 - 2 * atan(txy);

        // Substitute the estimate into the iterative calculation that
        // converges on the correct Latitude value.
        part1 = (1 - ec * sin(lat0)) / (1 + ec * sin(lat0));
        lat1 = pi2 - 2 * atan(txy * pow(part1, ec / 2));

        while (abs(lat1 - lat0) > 0.000000002) {
            lat0 = lat1;
            part1 = (1 - ec * sin(lat0)) / (1 + ec * sin(lat0));
            lat1 = pi2 - 2 * atan(txy * pow(part1, ec / 2));
        }

        // Convert from radians to degrees.
        Lat = lat1 / angRad;
        Lon = lon / angRad;

        //turn "   Longitude: "+Lon+"   Latitude: "+Lat;
        return "Latitude: " + minutes(Lat) + " N   Longitude: -" + minutes(Lon) + " W (approximate coordinates)";
    }
}

*/

function convertWGS84ProjectionToWGS84LatLon(mercator) {
    // https://gis.stackexchange.com/questions/69208/trying-to-convert-coordinates-from-wgs84-web-mercator-auxiliary-sphere-to-wgs84
    // https://wiki.openstreetmap.org/wiki/Mercator#Java
    //         if (Math.abs(mercator[0]) < 180 && Math.Abs(mercator[1]) < 90)
    //             return;

    //         if ((Math.Abs(mercator[0]) > 20037508.3427892) || (Math.Abs(mercator[1]) > 20037508.3427892))
    //             return;

    var x = mercator[0];
    var y = mercator[1];
    var num3 = x / 6378137.0;
    var num4 = num3 * 57.295779513082323;
    var num5 = Math.floor((num4 + 180.0) / 360.0);
    var num6 = num4 - num5 * 360.0;
    var num7 =
        1.5707963267948966 - 2.0 * Math.atan(Math.exp((-1.0 * y) / 6378137.0));
    mercator[0] = num6;
    mercator[1] = num7 * 57.295779513082323;
}

function minutes(num) {
    // For converting convertSPToWGS84(x,y) points to minutes, also borrowed from Scopi!
    num = Math.abs(num);
    var floor = Math.floor(num);
    var decimal = num - floor;
    var minutes = 60 * decimal;
    var floor2 = Math.floor(minutes);
    decimal = minutes - floor2;
    var seconds = 60 * decimal;
    //r floor3 = Math.round(seconds);
    seconds *= 100;
    seconds = Math.round(seconds);
    seconds /= 100; // accurate to 2 decimal places
    return floor + '\u00B0 ' + floor2 + '\u2032 ' + seconds + '\u2033';
}

function updateStatePlaneCoordsByDistance(distanceX, distanceY, spCoords) {
    var spWidth = this.extent.visible.X - this.extent.visible.x;
    var spHeight = this.extent.visible.Y - this.extent.visible.y;

    var xRatio = spWidth / this.mapContainer.width;
    var yRatio = spHeight / this.mapContainer.height;

    var left = distanceX * xRatio;
    var top = 0 - distanceY * yRatio;

    if (spCoords) {
        this.extent.visible.x = spCoords.x -= left;
        this.extent.visible.X = spCoords.X -= left;
        this.extent.visible.y = spCoords.y -= top;
        this.extent.visible.Y = spCoords.Y -= top;
        return;
    }

    this.extent.visible.x -= left;
    this.extent.visible.X -= left;
    this.extent.visible.y -= top;
    this.extent.visible.Y -= top;
}

function updateStatePlaneCoordsByOrigin(p_origin, p_scale) {
    var spWidth = this.extent.visible.X - this.extent.visible.x;
    var spHeight = this.extent.visible.Y - this.extent.visible.y;

    if (p_scale === 2) {
        spWidth = spWidth * -(1 / p_scale);
        spHeight = spHeight * -(1 / p_scale);
    }

    this.extent.visible.x -= spWidth * p_origin.x;
    this.extent.visible.X += spWidth * (1 - p_origin.x);
    this.extent.visible.y -= spHeight * p_origin.y;
    this.extent.visible.Y += spHeight * (1 - p_origin.y);
    console.log(this.extent.visible);
}

function updateVisExtentByOriginAndResolution(p_origin, p_scale, p_resolution) {
    let vis = this.extent.visible;
    let spWidth = this.mapContainer.width * p_resolution;
    let spHeight = this.mapContainer.height * p_resolution;

    let ratioX = (vis.X - p_origin.x) / (vis.X - vis.x);
    let ratioY = (vis.Y - p_origin.y) / (vis.Y - vis.y);

    if (p_scale >= 1) {
        p_scale = p_scale - 1;
    } else {
        p_scale = -(1 - p_scale);
    }

    vis.X -= spWidth * p_scale * ratioX;
    vis.x = vis.X - spWidth;
    vis.Y -= spHeight * p_scale * ratioY;
    vis.y = vis.Y - spHeight;
}

function getPixelPointInMapContainer(point) {
    return {
        x: point.x - this.mapContainer.left,
        y: point.y - this.mapContainer.top,
    };
}

function getPanOffsetPoint(point) {
    var panOffsetX = this.mainContainer.left; //+ this.mapImg.left; // Should be zero if not panning.
    var panOffsetY = this.mainContainer.top; //+ this.mapImg.top;

    return {
        x: point.x - panOffsetX, // This will set the origin to)/2the center -> - this.mapContainer.width / 2;
        y: point.y - panOffsetY,
    };
}

function distanceBetween(a, b) {
    // Good old pythagorean theorem.
    return Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2));
}

function convertSPToWGS84Proj(spPoint) {
    let wsg85LatLon = this.convertSPToWGS84(spPoint);
    return this.LeafletSphericalMercator.projectFromWSG84Geo(wsg85LatLon);
}

function getResolution(zoom) {
    if (this.zoomIndex) {
        return this.zoomIndex[zoom].resolution;
    }
    // WSG84 Spherical Mercator.
    // let EarthRadius = 6378137;
    // let RadiusxPi = Math.PI * EarthRadius;
    // let PixelsAtZoom = 256 * Math.pow(2, zoom);
    // let degPerMeter = RadiusxPi * 2 / EarthRadius;
    // let degPerPixel = EarthRadius / PixelsAtZoom * degPerMeter;
    var pixels = (256 * Math.pow(2, zoom)) / 2;
    var extent = 20037508.342789244;
    var res = extent / pixels;

    return res;
}

NewMap.prototype.LeafletSphericalMercator = {
    // https://github.com/Leaflet/Leaflet/blob/master/src/geo/projection/Projection.SphericalMercator.js
    // https://gis.stackexchange.com/questions/92907/re-project-raster-image-from-mercator-to-equirectangular
    // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
    RADIUS: 6378137,
    MAX_LATITUDE: 85.0511287798,
    BOUND: 20037508.342789244, //20037508.342789244 TODO: "BOUND" is probably not the correct term.

    projectFromWSG84Geo: function(latlng) {
        var d = Math.PI / 180,
            max = this.MAX_LATITUDE,
            lat = Math.max(Math.min(max, latlng.lat), -max),
            sin = Math.sin(lat * d);

        return {
            x: this.RADIUS * latlng.lng * d,
            y: (this.RADIUS * Math.log((1 + sin) / (1 - sin))) / 2,
        };
    },

    projectToWSG84Geo: function(point) {
        var d = 180 / Math.PI,
            R = this.RADIUS;

        return {
            lat: (2 * Math.atan(Math.exp(point.y / R)) - Math.PI / 2) * d,
            lng: (point.x * d) / R,
        };
    },
};

/*
https://leafletjs.com/examples/quick-start/example.html

var dvi = document.getElementById('mapid').cloneNode();
document.getElementById('mapid').parentElement.removeChild(document.getElementById('mapid'));
document.body.appendChild(dvi);

var scriptt = document.createElement('script');
    scriptt.src = 'https://unpkg.com/leaflet@1.3.4/dist/leaflet-src.js';
    scriptt.crossOrigin = true;
document.head.appendChild(scriptt);



mymap = L.map('mapid').setView([0, 0], 13);
mymap.on('click', onMapClick)

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
    }).addTo(mymap);

    L.marker([0, 0]).addTo(mymap)
        .bindPopup("<b>Hello world!</b><br />I am a popup.").openPopup();



popup = L.popup();

    function onMapClick(e) {
        popup
            .setLatLng(e.latlng)
            .setContent("You clicked the map at " + e.latlng.toString())
            .openOn(mymap);
    }



*/
