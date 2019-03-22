import {BasicLayer} from './BasicLayer_class';

export class BaseTileLayer extends BasicLayer {
    constructor(src, zIndex) {
        super();
        this.__zoom = null;
        this.tileSrc = null;
        this.tileSize = 256;
        this.tilesCache = {};
        this.tileInfo = null;
        this.tileLoadOrder = [];
        this.delTilesTimer = null;
        this.lvlLoadTime = {start: 0, finish: 1};
        this.viewPortTopLeftWorldPxls = {x: 0, y: 0};
        this.makeTile = makeTile;

        this.setZindex(zIndex);

        this.setTileSrc(src);

        this.on('add event listeners', () => {
            this.on('appended to map', () => {
                this.makeTileGrid();
                this.zoomEnd();
            });

            this.on('update everything', () => {
                this.makeTileGrid();
                this.resetTiles();
                this.swapContainer();
                this.zoomEnd();
                this.update();
            });

            this.on('zoom delay end', this.zoomEnd, this);
            this.on('pre zoom end', () => this.swapContainer(), this);
            this.on('post zoom end', () => {
                this.resetTiles();
                this.update();
            });

            this.map.event.on(
                'pan',
                e => {
                    if ((e.clientX + e.clientY) % 7 === 0) {
                        // TODO: Better throttling, this was just a thought experiment.
                        this.update();
                    }
                },
                this,
            );
            this.map.event.on('pan initial', () => {
                clearTimeout(this.zoomTimer);
                clearTimeout(this.delTilesTimer);
            });
            this.map.event.on('pan end', () => {
                this.update();
                if (this.__zoom !== this.map.zoom) {
                    this.zoomEnd();
                }
                this.delTilesTimer = setTimeout(
                    this.clearHiddenTiles.bind(this),
                    1100,
                );
            });
        });
    }

    getTileInfo() {
        console.log(
            "The method 'getTileInfo' in " +
                this.constructor.name +
                " wasn't implimented",
            this,
        );
        return 'Override this';
    }

    getTilePxls() {
        console.log(
            "The method 'getTilePxls' in " +
                this.constructor.name +
                " wasn't implimented",
            this,
        );
        return 'Override this';
    }

    setTileSrc(src) {
        this.tileSrc = src;
        return this;
    }

    updateContainer() {
        this.swapContainer();
        this.resetTiles();
        this.update();
    }

    clearHiddenTiles() {
        // TODO: This is hack, think of something better.
        let keys = Object.keys(this.tilesCache);
        let mainRect = this.map.mapContainer.element.getBoundingClientRect();
        mainRect.X = mainRect.x + mainRect.width;
        mainRect.Y = mainRect.y + mainRect.height;

        keys.forEach(key => {
            let tile = this.tilesCache[key];
            let rect = tile.getBoundingClientRect();

            if (!tile.loaded) {
                return;
            }

            // prettier-ignore
            if (!(rect.x < mainRect.X && rect.x + rect.width > mainRect.x &&
                rect.y < mainRect.Y && rect.y + rect.height > mainRect.y)) {

                tile.parentElement.removeChild(tile);
                delete this.tilesCache[key];
            }
        });
    }

    resetTiles() {
        this.viewPortTopLeftWorldPxls = this.topLeftOfVisibleExtentToPxls();

        this.viewPortTopLeftWorldPxls.x = Math.floor(
            this.viewPortTopLeftWorldPxls.x,
        );
        this.viewPortTopLeftWorldPxls.y = Math.floor(
            this.viewPortTopLeftWorldPxls.y,
        );

        this.tilesCache = {};
    }

    makeTileGrid() {
        let numTiles = {
            x: Math.ceil(this.map.mapContainer.width / this.tileSize) + 1,
            y: Math.ceil(this.map.mapContainer.height / this.tileSize) + 1,
        };

        let ary = [];
        let vry = [];

        for (let x = 0; x <= numTiles.x; x++) {
            for (let y = 0; y <= numTiles.y; y++) {
                ary.push({x: x, y: y});
            }
        }

        for (let x = 0; x <= numTiles.x; x++) {
            for (let y = 0; y <= numTiles.y; y++) {
                if (y % 2 === 0) {
                    vry.push(ary.splice(0, 1)[0]);
                    continue;
                }
                vry.push(ary.splice(-1, 1)[0]);
            }
        }

        this.tileLoadOrder = vry;

        /*
        let gridCenter = {
            x: numTiles.x / 2,
            y: numTiles.y / 2
        };

        // prettier-ignore
        this.tileLoadOrder = ary.sort((a,b) => {
            // Copy leaflets idea and have the tiles start loading from the center..
            let distA = Math.sqrt((gridCenter.x - a.x)**2 + (gridCenter.y - a.y)**2);
            let distB = Math.sqrt((gridCenter.x - b.x)**2 + (gridCenter.y - b.y)**2);

            return distB - distA;
        });
        */
    }

    calcLvlLoadTime() {
        //console.log((this.lvlLoadTime.finish - this.tileStart))
        return this.lvlLoadTime.finish - this.lvlLoadTime.start || 0;
    }

    update() {
        let srcObj = {'{z}': this.__zoom, '{y}': null, '{x}': null};
        let srcXYString = undefined;
        let fragment = document.createDocumentFragment();
        let tileImg = null;
        let tileX = undefined;
        let tileY = undefined;

        this.tileStart = Date.now();

        // prettier-ignore
        let extent = (this.zoomIndex && this.zoomIndex[this.__zoom] &&
                      this.zoomIndex[this.__zoom].extent) || {};

        let panLeft = this.container.left + this.map.mainContainer.left;
        let panTop = this.container.top + this.map.mainContainer.top;

        let topLeftTile = {
            x: Math.floor(
                (this.viewPortTopLeftWorldPxls.x - panLeft) / this.tileSize,
            ),
            y: Math.floor(
                (this.viewPortTopLeftWorldPxls.y - panTop) / this.tileSize,
            ),
        };

        let topLeftTilePxls = {
            x: topLeftTile.x * this.tileSize - this.viewPortTopLeftWorldPxls.x,
            y: topLeftTile.y * this.tileSize - this.viewPortTopLeftWorldPxls.y,
        };

        for (let m = 0; m < this.tileLoadOrder.length; m++) {
            srcObj['{x}'] = topLeftTile.x + this.tileLoadOrder[m].x;
            srcObj['{y}'] = topLeftTile.y + this.tileLoadOrder[m].y;

            srcXYString = srcObj['{x}'] + ',' + srcObj['{y}'];

            // prettier-ignore
            if (this.tilesCache[srcXYString] ||
                (srcObj["{x}"] < extent.x || srcObj["{x}"] > extent.X ||
                 srcObj["{y}"] > extent.Y || srcObj["{y}"] < extent.y)) {

                continue;
            }

            tileX = topLeftTilePxls.x + this.tileLoadOrder[m].x * this.tileSize;
            tileY = topLeftTilePxls.y + this.tileLoadOrder[m].y * this.tileSize;

            tileImg = this.makeTile({
                x: tileX,
                y: tileY,
                src: this.tileSrc.replace(/{.}/g, arg => srcObj[arg]),
            });

            this.tilesCache[srcXYString] = tileImg;

            fragment.appendChild(tileImg);
        }

        this.container.element.appendChild(fragment);
    }
}

function makeTile(obj) {
    let tileImg = document.createElement('img');
    tileImg.className = 'tileImg';
    //tileImg.style.cssText = "position: absolute; top: " + tileY + "px; left: " + tileX + "px; opacity: 0;";
    tileImg.style.cssText = 'position: absolute; opacity: 0;';
    tileImg.style.transform =
        'translate3d(' + obj.x + 'px,' + obj.y + 'px, 0px)';
    //tileImg.style.boxShadow = "0px 0px 0px 1px red";
    tileImg.onload = makeTileOnLoad;
    tileImg.onerror = makeTileOnError;
    tileImg.src = obj.src;

    return tileImg;
}

function makeTileOnLoad(e) {
    this.loaded = true;
    this.style.opacity = 1;
    // ___that.tileFinish = Date.now();
    // ___that.map.event.fire('tile loaded', this);// Todo: testing this idea.
}

function makeTileOnError(e) {
    console.error('Tile did not load', e);
}
