export function simpleMessageBox(arg_innerHTML, arg_id, arg_width) {
    var message = document.createElement('div');

    message.className = 'simpleMessageBox';

    message.style.width = (arg_width && arg_width + 'px') || '300px';
    message.style.left =
        window.innerWidth / 2 - ((arg_width && arg_width / 2) || 150) + 'px';

    message.id = arg_id || 'simple_message_box';

    message.innerHTML = arg_innerHTML;

    message.onclick = function(e) {
        e.stopPropagation();
        this.parentNode.removeChild(this);
    };

    document.body.appendChild(message);

    return message;
}

export function testProp(props) {
    // Got this from leaflet
    var style = document.documentElement.style;

    for (var i = 0; i < props.length; i++) {
        if (props[i] in style) {
            return props[i];
        }
    }

    return false;
}

export let CSS_TRANSFORM = testProp([
    'transform',
    'WebkitTransform',
    'OTransform',
    'MozTransform',
    'msTransform',
]);
export let CSS_TRANSITION = testProp([
    'transition',
    'WebkitTransition',
    'OTransition',
    'MozTransition',
    'msTransition',
]);

 //https://developer.mozilla.org/en-US/docs/Web/Events/wheel#Browser_compatibility
export let MOUSE_WHEEL_EVT =
    'onwheel' in document.createElement('div')
        ? 'wheel' // Modern browsers support "wheel"
        : document.onmousewheel !== undefined
        ? 'mousewheel' // Webkit and IE support at least "mousewheel"
        : 'DOMMouseScroll'; // let's assume that remaining browsers are older Firefox
