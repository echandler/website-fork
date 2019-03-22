import {BasicEventSystem} from './BasicEventSystem_class';

export class BasicInteractiveElement extends BasicEventSystem {
    constructor(elem) {
        super();
        this.element = elem;
        this.deleted = false;

        elem._marker_obj = this;
    }
}
