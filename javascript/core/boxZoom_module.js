import {NewMap} from './Main_class';

Object.assign(NewMap.prototype, {
    boxZoom_mouseDown,
    boxZoom_mouseUp,
    boxZoom_doZoom,
    boxZoom_mouseMove,
    boxZoomCenter_mouseMove,
});

function boxZoom_mouseDown(e) {
    if (this.boxZoom) {
        this.boxZoom = null;
        this.boxZoom.parentElement.removeChild(boxZoom);
        return;
    }

    this.panning_module.disablePanning();

    e.preventDefault();
    e.stopPropagation();

    // TODO: Make boxZoom it's own object with a element property, instead of
    //       adding properties to the html element itself.
    this.boxZoom = document.createElement('div');
    this.boxZoom.id = 'boxZoom';
    this.boxZoom.className = 'boxZoom';

    this.boxZoomCenter = document.createElement('div');
    this.boxZoomCenter.id = 'boxZoomCenter';
    this.boxZoomCenter.className = 'boxZoomCenter';
    this.boxZoomCenter.style.cssText =
        'position:absolute; top:0px; left:0px; width: 5px; height: 5px; border: 1px solid red;';

    this.boxZoom.appendChild(this.boxZoomCenter);

    this.mainContainer.element.insertBefore(
        this.boxZoom,
        this.markerContainer.element,
    );

    this.boxZoom.offset = {
        x: this.mapContainer.left + this.mainContainer.left,
        y: this.mapContainer.top + this.mainContainer.top,
    };

    this.boxZoom.style.left = e.clientX - boxZoom.offset.x + 'px';
    this.boxZoom.style.top = e.clientY - boxZoom.offset.y + 'px';
    this.boxZoom.style.zIndex = 500;

    this.boxZoom.start = {
        x: e.clientX,
        y: e.clientY,
    };

    this.pageHasFocus = true;

    // TODO: Change name of mouse move and mouse up eventlisteners.
    this.boxZoom.mv = e => this.boxZoom_mouseMove(e);
    this.boxZoom.mup = e => this.boxZoom_mouseUp(e);

    document.addEventListener('mousemove', this.boxZoom.mv);
    document.addEventListener('mouseup', this.boxZoom.mup);
}

function boxZoom_mouseMove(e) {
    if (e.clientX > this.boxZoom.start.x) {
        this.boxZoom.style.left =
            this.boxZoom.start.x - this.boxZoom.offset.x + 'px';
        if (e.clientY > this.boxZoom.start.y) {
            this.boxZoom.style.top =
                this.boxZoom.start.y - this.boxZoom.offset.y + 'px';
            this.boxZoom.style.width = e.clientX - this.boxZoom.start.x + 'px';
            this.boxZoom.style.height = e.clientY - this.boxZoom.start.y + 'px';
        } else {
            this.boxZoom.style.top = e.clientY - this.boxZoom.offset.y + 'px';
            this.boxZoom.style.width = e.clientX - this.boxZoom.start.x + 'px';
            this.boxZoom.style.height = this.boxZoom.start.y - e.clientY + 'px';
        }
    } else if (this.boxZoom.start.x > e.clientX) {
        this.boxZoom.style.left = e.clientX - this.boxZoom.offset.x + 'px';
        if (e.clientY > this.boxZoom.start.y) {
            this.boxZoom.style.top =
                this.boxZoom.start.y - this.boxZoom.offset.y + 'px';
            this.boxZoom.style.width = this.boxZoom.start.x - e.clientX + 'px';
            this.boxZoom.style.height = e.clientY - this.boxZoom.start.y + 'px';
        } else {
            this.boxZoom.style.top = e.clientY - this.boxZoom.offset.y + 'px';
            this.boxZoom.style.width = this.boxZoom.start.x - e.clientX + 'px';
            this.boxZoom.style.height = this.boxZoom.start.y - e.clientY + 'px';
        }
    }
    this.boxZoomCenter_mouseMove(
        this.boxZoom.style.height,
        this.boxZoom.style.width,
    );
}

function boxZoom_mouseUp(e) {
    var width = Math.abs(e.clientX - this.boxZoom.start.x);
    var height = Math.abs(e.clientY - this.boxZoom.start.y);
    var x = e.clientX > this.boxZoom.start.x ? e.clientX : boxZoom.start.x;
    var y = e.clientY > this.boxZoom.start.y ? e.clientY : boxZoom.start.y;
    var center = this.getPixelPointInMapContainer(
        this.toPoint(x - width / 2, y - height / 2),
    );

    document.removeEventListener('mousemove', this.boxZoom.mv);
    document.removeEventListener('mouseup', this.boxZoom.mup);

    this.boxZoom.style[this.CSS_TRANSITION] = 'opacity 0.15s ease-in-out';
    this.boxZoom.style.opacity = 0;

    this.panning_module.enablePanning();

    this.boxZoom.parentElement.removeChild(boxZoom);

    if (
        e.clientX === this.boxZoom.start.clientX &&
        e.clientY === this.boxZoom.start.clientY
    ) {
        this.boxZoom = null;
        return;
    }

    this.boxZoom = null;

    this.boxZoom_doZoom({
        height,
        width,
        center,
    });
}

function boxZoom_doZoom(obj) {
    let projectedCenter = this.screenPointToProjection(obj.center);
    let height = null;
    let width = null;
    let multiplier = null;

    for (let h = 0; h < 50 /*prevent endless loop*/; h++) {
        multiplier = Math.pow(2, h);
        width = obj.width * multiplier;
        height = obj.height * multiplier;

        if (
            height > this.mapContainer.height ||
            width > this.mapContainer.width
        ) {
            h -= 1;
            this.zoomTo(projectedCenter, this.zoom + h);
            break;
        }
    }
}

function boxZoomCenter_mouseMove(height, width) {
    height = height.replace('px', '');
    width = width.replace('px', '');
    this.boxZoomCenter.style.transform =
        'translate(' + (width / 2 - 3) + 'px, ' + (height / 2 - 3) + 'px)';
}
