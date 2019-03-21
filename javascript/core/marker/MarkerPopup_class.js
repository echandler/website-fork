import {BaseMarkerClass} from "./BaseMarker_class";
import {toPoint} from './../coordinate_module';

export class MakePopup extends BaseMarkerClass {
    constructor(opt_message, opt_spPoint, opt_anchorOffset = [0, 0]) {
        let el = document.createElement('div');
        super(el);

        this.init(opt_message, opt_spPoint, opt_anchorOffset);
    }

    init(opt_message, opt_spPoint, opt_anchorOffset) {
        this.options = {
            message: opt_message,
            point: opt_spPoint,
            anchorOffset: opt_anchorOffset,
        };

        this.message = this.options.message;

        this.offsetPos = toPoint(this.options.anchorOffset);

        this.makePopup();
        this.addEventListeners();
        this.setMessage(this.message);

        if (this.options.point) {
            this.setCoords(toPoint(this.options.point));
        }

        if (this.init.initArr) {
            let ary = this.init.initArr;

            for (let n = 0; n < ary.length; n++) {
                // Call additional init functions an extension
                // might have added.
                ary[n].fn.call(ary[n].ctx || this);
            }
        }
    }

    static onInitDone(fn, ctx) {
        // Testing an idea about how to extend the init function.
        let ary = this.prototype.init.initarr;
        if (!ary) {
            ary = this.prototype.init.initArr = [];
        }
        ary.push({fn, ctx});
    }

    addEventListeners() {
        this.on('appendedToMap', e => {
            this.on(this.map.MOUSE_WHEEL_EVT, function(e) {
                e.stopPropagation();
            });
        });

        this.on('preUpdatePos', e => {
            this.setOffSetLeftTop();
        });
    }

    setOffSetLeftTop() {
        let el = this.element;
        el.style.left = -(el.offsetWidth / 2) + 'px';
        el.style.bottom = this.arrow.offsetHeight + 'px';

        return this;
    }

    setMessage(opt_message = '') {
        this.messageContainer.innerHTML = '';

        if (typeof opt_message === 'string') {
            this.messageContainer.innerHTML = opt_message;
        } else {
            this.messageContainer.appendChild(opt_message);
        }

        this.message = opt_message;

        this.updatePos();

        return this;
    }

    makePopup() {
        this.element.className = 'popupParent';

        this.deleteBtn = this.makeDeleteBtn();
        this.element.appendChild(this.deleteBtn);

        this.messageContainer = this.makeMessageContainer();
        this.element.appendChild(this.messageContainer);

        this.arrow = this.makeArrow();
        this.element.appendChild(this.arrow);

        return this;
    }

    makeDeleteBtn() {
        let deleteButton = document.createElement('div');
        deleteButton.className = 'markerDeleteButton';
        deleteButton.innerHTML = '&#215;';
        deleteButton.popup = this;
        deleteButton.addEventListener('click', this.delete.bind(this));
        return deleteButton;
    }

    makeMessageContainer() {
        let messageContainer = document.createElement('div');
        messageContainer.innerHTML = '';
        messageContainer.className = 'messageContainer';
        messageContainer.style.color = 'black';
        messageContainer.popup = this;
        return messageContainer;
    }

    makeArrow() {
        let arrow = document.createElement('div');
        arrow.className = 'markerArrow';

        let innerArrow = document.createElement('div');
        innerArrow.className = 'markerInnerArrow';
        arrow.appendChild(innerArrow);
        return arrow;
    }
}

export function makePopup(opt_message, opt_spPoint, opt_anchorOffset = [0, 0]) {
    return new MakePopup(opt_message, opt_spPoint, opt_anchorOffset);
}
