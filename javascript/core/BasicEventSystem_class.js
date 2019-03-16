export class BasicEventSystem {
    constructor() {
        this.eventsObj = {};
    }

    on(p_type, p_func, opt_this) {
        if (!this.eventsObj.hasOwnProperty(p_type)) {
            this.eventsObj[p_type] = [];
        }

        this.eventsObj[p_type].push({ fn: p_func, _this: opt_this });

        return true;
    }

    off(p_type, p_func, opt_this) {

        if (!this.eventsObj.hasOwnProperty(p_type)) {
            return false;
        }
        let evtArray = this.eventsObj[p_type];

        for (var n = 0; n < evtArray.length; n++) {
            if (evtArray[n].fn === p_func && evtArray[n]._this === opt_this) {
                evtArray[n].fn = this._zombieFn;
            }
        }

        this.clean(p_type);
    }

    _zombieFn() {
        return "Zombie callback works real hard.";
    }

    clean(p_type) {
        if (this._delZombies) {
            this._delZombies(p_type);
        } else {
            setTimeout(this.clean.bind(this, p_type), 1000);
        }
    }

    _delZombies(p_type) {
        if (!this.eventsObj.hasOwnProperty(p_type)) {
            return false;
        }

        for (var n = 0; n < this.eventsObj[p_type].length; n++) {
            if (this.eventsObj[p_type][n].fn === this._zombieFn) {
                this.eventsObj[p_type].splice(n, 1);
                --n;
            }
        }
    }

    allOff(p_this) {
        var evtObj = this.eventsObj;
        var types = Object.keys(evtObj);

        for (var m = 0; m < types.length; m++) {
            for (var n = evtObj[types[m]].length - 1; n >= 0; n--) {
                if (evtObj[types[m]][n]._this === p_this) {
                    evtObj[types[m]][n].fn = this._zombieFn;
                }

                this.clean(types[m]);
            }
        }
    }

    fire(p_type, opt_evt) {
        if (!this.eventsObj.hasOwnProperty(p_type)) {
            return false;
        }

        let evtArray = this.eventsObj[p_type];
        let pointerTo_delZombies = this._delZombies;
        this._delZombies = false;

        for (let n = 0; n < evtArray.length; n++) {
            evtArray[n].fn.call(evtArray[n]._this, opt_evt);
        }

        this._delZombies = pointerTo_delZombies;
    }
}
