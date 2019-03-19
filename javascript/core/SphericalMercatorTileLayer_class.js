import { BaseTileLayer } from "./BaseTileLayer_class";

export class SphericalMercatorTileLayer extends BaseTileLayer {
    // https://jsbin.com/jehatipagu/6/edit?html,css,js,output
    constructor(src, zIndex) {
        super(src, zIndex);
        this.bound = 20037508.342789244;// Math.PI * radius of earth
    }

    topLeftOfVisibleExtentToPxls(opt_zoom){
        // Returns top left of tile in screen pixel coords, so that it can be seen on the monitor.
        let vis = this.map.extent.visible;
        let visPoint = { x: vis.x, y: vis.Y };
        let containerCorner = this.getPxlsFromTopLeftOrigin(visPoint, opt_zoom);
        //console.log("sfd", containerCorner)
        return {
            x: containerCorner.x,
            y: containerCorner.y,
        };
    }

    getPxlsFromTopLeftOrigin(smPoint, opt_zoom) {
        // Returns pixels from 0,0 tile origin aka the top left of the world.
        let bound = 20037508.342789244;
        let pixels = this.tileSize * Math.pow(2, opt_zoom || this.map.zoom )/2;

        var pointXRatio = smPoint.x / (-bound);
        var pointYRatio = smPoint.y / (bound);

        return {
            x: (pixels)  * (1-pointXRatio),
            y: (pixels) * (1-pointYRatio),
        };
    }
}



function Transformation(a, b, c, d) {
    // Transformation constructor copied from Leaflet.js
   
    // if (Util.isArray(a)) {
    //     // use array properties
    //     this._a = a[0];
    //     this._b = a[1];
    //     this._c = a[2];
    //     this._d = a[3];
    //     return;
    // }
    this._a = a;
    this._b = b;
    this._c = c;
    this._d = d;
}

Transformation.prototype = {
    // @method transform(point: Point, scale?: Number): Point
    // Returns a transformed point, optionally multiplied by the given scale.
    // Only accepts actual `L.Point` instances, not arrays.
    transform: function (point, scale) { // (Point, Number) -> Point
        return this._transform(point.clone(), scale);
    },

    // destructive transform (faster)
    _transform: function (point, scale) {
        scale = scale || 1;
        point.x = scale * (this._a * point.x + this._b);
        point.y = scale * (this._c * point.y + this._d);
        return point;
    },

    // @method untransform(point: Point, scale?: Number): Point
    // Returns the reverse transformation of the given point, optionally divided
    // by the given scale. Only accepts actual `L.Point` instances, not arrays.
    untransform: function (point, scale) {
        scale = scale || 1;
        return {
               x: (point.x / scale - this._b) / this._a,
               y: (point.y / scale - this._d) / this._c
        };
    }
};

export let transformation = (function () {
        var scale = 0.5 / (Math.PI * 6378137);
        //console.log(new Transformation(scale, 0.5, -scale, 0.5))
        return new Transformation(scale, 0.5, -scale, 0.5);
    }());
