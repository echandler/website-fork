export function boxZoom_module(thisMap) {
    var boxZoom = undefined;
    var boxZoomCenter = undefined;

    // TODO: Re-factor these 'box' functions.
    function boxZoom_mouseDown(e) {
        if (boxZoom) {
            boxZoom = null;
            boxZoom.parentElement.removeChild(boxZoom);
            return;
        }

        thisMap.panning_module.disablePanning();

        e.preventDefault();
        e.stopPropagation();

        boxZoom = document.createElement("div");
        boxZoom.id = "boxZoom";
        boxZoom.className = "boxZoom";

        boxZoomCenter = document.createElement("div");
        boxZoomCenter.id = "boxZoomCenter";
        boxZoomCenter.className = "boxZoomCenter";
        boxZoomCenter.style.cssText = "position:absolute; top:0px; left:0px; width: 5px; height: 5px; border: 1px solid red;";

        boxZoom.appendChild(boxZoomCenter);

        thisMap.mainContainer.element.insertBefore(boxZoom, thisMap.markerContainer.element);

        boxZoom.offset = {
            x: thisMap.mapContainer.left + thisMap.mainContainer.left,
            y: thisMap.mapContainer.top + thisMap.mainContainer.top
        };

        boxZoom.style.left = e.clientX - boxZoom.offset.x + "px";
        boxZoom.style.top = e.clientY - boxZoom.offset.y + "px";
        boxZoom.style.zIndex = 500;

        boxZoom.start = {
            x: e.clientX,
            y: e.clientY
        };

        thisMap.pageHasFocus = true;

        document.addEventListener("mousemove", private_boxZoom_mouseMove);
        document.addEventListener("mouseup", private_boxZoom_mouseUp);
    }

    function private_boxZoom_mouseUp(e) {
        var width = Math.abs(e.clientX - boxZoom.start.x);
        var height = Math.abs(e.clientY - boxZoom.start.y);
        var x = e.clientX > boxZoom.start.x ? e.clientX : boxZoom.start.x;
        var y = e.clientY > boxZoom.start.y ? e.clientY : boxZoom.start.y;
        var center = thisMap.getPixelPointInMapContainer(thisMap.toPoint(x - width / 2, y - height / 2));

        document.removeEventListener("mousemove", private_boxZoom_mouseMove);
        document.removeEventListener("mouseup", private_boxZoom_mouseUp);

        boxZoom.style[thisMap.CSS_TRANSITION] = "opacity 0.15s ease-in-out";
        boxZoom.style.opacity = 0;

        thisMap.panning_module.enablePanning();

        boxZoom.parentElement.removeChild(boxZoom);

        if (e.clientX === boxZoom.start.clientX && e.clientY === boxZoom.start.clientY) {
            boxZoom = null;
            return;
        }

        boxZoom = null;

        doZoom({
            height,
            width,
            center
        });
        //thisMap.Zoom_class.zoomToBox(center, width, height);
    }

    function private_boxZoom_mouseMove(e) {
        if (e.clientX > boxZoom.start.x) {
            boxZoom.style.left = boxZoom.start.x - boxZoom.offset.x + "px";
            if (e.clientY > boxZoom.start.y) {
                boxZoom.style.top = boxZoom.start.y - boxZoom.offset.y + "px";
                boxZoom.style.width = e.clientX - boxZoom.start.x + "px";
                boxZoom.style.height = e.clientY - boxZoom.start.y + "px";
            } else {
                boxZoom.style.top = e.clientY - boxZoom.offset.y + "px";
                boxZoom.style.width = e.clientX - boxZoom.start.x + "px";
                boxZoom.style.height = boxZoom.start.y - e.clientY + "px";
            }
        } else if (boxZoom.start.x > e.clientX) {
            boxZoom.style.left = e.clientX - boxZoom.offset.x + "px";
            if (e.clientY > boxZoom.start.y) {
                boxZoom.style.top = boxZoom.start.y - boxZoom.offset.y + "px";
                boxZoom.style.width = boxZoom.start.x - e.clientX + "px";
                boxZoom.style.height = e.clientY - boxZoom.start.y + "px";
            } else {
                boxZoom.style.top = e.clientY - boxZoom.offset.y + "px";
                boxZoom.style.width = boxZoom.start.x - e.clientX + "px";
                boxZoom.style.height = boxZoom.start.y - e.clientY + "px";
            }
        }
        private_boxZoomCenter_mouseMove(boxZoom.style.height, boxZoom.style.width);
    }

    function private_boxZoomCenter_mouseMove(height, width) {
        height = height.replace("px", "");
        width = width.replace("px", "");
        boxZoomCenter.style.transform = "translate(" + (width / 2 - 3) + "px, " + (height / 2 - 3) + "px)";
    }

    function doZoom(obj) {
        let projectedCenter = thisMap.screenPointToProjection(obj.center);
        let height = null;
        let width = null;
        let multiplier = null;

        for (let h = 0; h < 50 /*prevent endless loop*/; h++) {
            multiplier = Math.pow(2, h);
            width = obj.width * multiplier;
            height = obj.height * multiplier;

            if (height > thisMap.mapContainer.height || width > thisMap.mapContainer.width) {
                h -= 1;
                thisMap.zoomTo(projectedCenter, thisMap.zoom + h);
                // let zoom = Math.min(thisMap.zoom + h, thisMap.maxZoom);
                //thisMap.setView(projectedCenter, zoom);
                break;
            }
        }
    }

    return {
        boxZoom_mouseDown: boxZoom_mouseDown
    };
}
