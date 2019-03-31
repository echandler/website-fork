export class Zoom_btn {
    constructor(elem) {
        let ns = 'http://www.w3.org/2000/svg';
        this.element = this.makeGroup();

        this.element.addEventListener('mousedown', this.mousedown.bind(this));
        this.element.addEventListener("mouseup", this.mouseup.bind(this));
        document.body.addEventListener("mouseup", this.mouseup.bind(this));

        this.mousedown_color = "blue";
        this.mouseup_color = "black"
    }

    makeGroup() {
        let ns = 'http://www.w3.org/2000/svg';

        let group = document.createElementNS(ns, 'g');

        group._instance = this;

        return group;
    }

    setPos(x, y) {
        this.element.setAttribute('transform', `translate(${x}, ${y})`);
    }

    mousedown() {
        this.element.setAttribute('fill', this.mousedown_color);
    }

    mouseup() {
        this.element.setAttribute('fill', this.mouseup_color);
    }
}

export class Zoom_in_btn extends Zoom_btn {
    constructor(width = 100, height = 100) {
        super();

        this.ns = 'http://www.w3.org/2000/svg';
        this.rect = document.createElementNS(this.ns, 'rect');
        this.element.appendChild(this.rect);
        this.makeGraphic();
        this.element.appendChild(this.ns_line);
        this.element.appendChild(this.ew_line);
    }

    makeGraphic() {
        this.ns_line = document.createElementNS(this.ns, 'line');
        this.ew_line = document.createElementNS(this.ns, 'line');

        this.ns_line.setAttribute('stroke', 'white');
        this.ew_line.setAttribute('stroke', 'white');
    }

    setSize(height, width) {
        let box = {
            top: height * 0.3,
            right: width * 0.3,
            left: width * 0.7,
            bottom: height * 0.7,
        };

        this.rect.setAttribute('height', height);
        this.rect.setAttribute('width', width);

        this.ns_line.setAttribute('x1', width / 2);
        this.ns_line.setAttribute('y1', box.top);
        this.ns_line.setAttribute('x2', width / 2);
        this.ns_line.setAttribute('y2', box.bottom);

        this.ew_line.setAttribute('x1', box.left);
        this.ew_line.setAttribute('y1', height / 2);
        this.ew_line.setAttribute('x2', box.right);
        this.ew_line.setAttribute('y2', height / 2);
    }
}

export class Zoom_out_btn extends Zoom_btn {
    constructor(width = 100, height = 100) {
        super();

        this.ns = 'http://www.w3.org/2000/svg';
        this.rect = document.createElementNS(this.ns, 'rect');
        this.element.appendChild(this.rect);

        this.makeGraphic();

        this.element.appendChild(this.ew_line);

        this.setPos(0, 110);
    }

    makeGraphic() {
        this.ew_line = document.createElementNS(this.ns, 'line');
        this.ew_line.setAttribute('stroke', 'white');
    }

    setSize(height, width) {
        let box = {
            right: width * 0.3,
            left: width * 0.7,
        };

        this.rect.setAttribute('height', height);
        this.rect.setAttribute('width', width);

        this.ew_line.setAttribute('x1', box.left);
        this.ew_line.setAttribute('y1', height / 2);
        this.ew_line.setAttribute('x2', box.right);
        this.ew_line.setAttribute('y2', height / 2);
    }
}

export class ZoomCntrl_svg {
    constructor(x, y, height, width, map) {
        this.container = this.makeSVGContainer(height, width);
        this.zoomInBtn = new this.Zoom_in_btn();
        this.zoomOutBtn = new this.Zoom_out_btn();

        this.zoomInBtn.element._zoom_dir = 'in';
        this.zoomOutBtn.element._zoom_dir = 'out';

        this.container.appendChild(this.zoomInBtn.element);
        this.container.appendChild(this.zoomOutBtn.element);

        this.container.addEventListener('mousedown', this);
        this.container.addEventListener('mouseup', this);

        if (height && width) this.setSize(height, width);
        if (x && y) this.setPos(x, y);
        if (map) this.addToMap(map);
    }

    addToMap(map) {
        this.map = map;

        map.addTo(this.container, map.mapContainer.element, () => {
            this.map.event.on('updateContainerSize', this.update);
        });

        return this;
    }

    update(map) {
        console.log('[Zoom control] Update method needs to be implimented');
    }

    makeSVGContainer(height, width) {
        let ns = 'http://www.w3.org/2000/svg';
        let el = document.createElementNS(ns, 'svg');

        el.style.width = width + 'px';
        el.style.height = height + 'px';
        el.style.position = 'absolute';

        return el;
    }

    setSize(height, width) {
        this.height = height || this.height || 0;
        this.width = width || this.height || 0;

        this.container.style.width = this.width + 'px';
        this.container.style.height = this.height + 2 + 'px';

        this.zoomInBtn.setSize(this.height / 2, this.width);
        this.zoomOutBtn.setSize(this.height / 2, this.width);
        this.zoomOutBtn.setPos(0, this.height / 2 + 2);

        return this;
    }

    setPos(x, y) {
        this.x = x || this.x || 0;
        this.y = y || this.y || 0;

        this.container.style.left = this.x + 'px';
        this.container.style.top = this.y + 'px';
    }

    handleEvent(evt) {
        let el = evt.target;
      
        evt.stopImmediatePropagation();
        evt.stopPropagation();
        evt.preventDefault();

        for (var i = 0; ; i++) {
            if (el._zoom_dir) {
                break;
            }

            if (el === this.container) break;

            el = el.parentElement;
        }
        if (el === this.container){
            return;
        }

        if (evt.type === 'mousedown'){
            let center = this.map.getCenterCoords();

            if (el._zoom_dir == 'in') {
                this.map.zoomTo(center, this.map.zoom + (evt.shiftKey? 2:1));
                return;
            }

            this.map.zoomTo(center, this.map.zoom - (evt.shiftKey? 2:1));
        } 
    }
}

ZoomCntrl_svg.prototype.Zoom_in_btn = Zoom_in_btn;
ZoomCntrl_svg.prototype.Zoom_out_btn = Zoom_out_btn;
