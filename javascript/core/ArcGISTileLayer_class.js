import { BaseTileLayer } from "./BaseTileLayer_class";

export class ArcGISTileLayer extends BaseTileLayer {
    constructor(src, zIndex) {
        super(src, zIndex);
    }

    getTileInfo() {
        // Override this for WSG84.
        let vis = this.map.extent.visible;
        let corner = this.getContainingArcTileCoords(this.map.zoom, { x: vis.x, y: vis.Y });

        return corner;

        /*
        return:
            {
                row: undefined, // Tile number x coordinate.
                col: undefined, // Tile number y coordinate.
                spX: undefined, // Tile top left corner x coord in default coordinate system (state plane or WSG84 sherical mercator)
                spY: undefined  // Tile top left corner y coord " " ".
            }
        */
    }

    getTilePxls(point) {
        // Override this for WSG84.
        return this.map.convertProjPointToPixelPoint(point);
    }

    getContainingArcTileCoords(z, b) {
        let d = { x: -1.171043e8, y: 1.379498e8 }; // This needs to be changed.
        let zoomI = this.zoomIndex[z];

        let colRow = {
            row: Math.floor((d.y - b.y) / (this.tileSize * zoomI.resolution)),
            col: Math.floor((b.x - d.x) / (this.tileSize * zoomI.resolution)),
            spX: undefined,
            spY: undefined
        };

        colRow.spX = colRow.col * (this.tileSize * zoomI.resolution) + d.x;
        colRow.spY = d.y - colRow.row * (this.tileSize * zoomI.resolution);
        //colRow.percentX = colRow.col - (b.x - d.x) / (this.tileSize * zoomI.Resolution);
        //colRow.percentY = colRow.row - (d.y - b.y) / (this.tileSize * zoomI.Resolution);

        return colRow;
    }
}
