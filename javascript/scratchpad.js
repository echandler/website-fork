/*
 * This is a JavaScript Scratchpad.
 *
 * Enter some JavaScript, then Right Click or choose from the Execute Menu:
 * 1. Run to evaluate the selected text (Ctrl+r),
 * 2. Inspect to bring up an Object Inspector on the result (Ctrl+i), or,
 * 3. Display to insert the result in a comment after the selection. (Ctrl+l)
 */

function map2012() {
     var theMap = window.$('theMap');
        paddleCoords = { top: 0, bottom: theMap.newImgHeight, left: 0, right: theMap.newImgWidth},
        topBottomDivParams = { "height": 20, width: (theMap.newImgWidth * 0.1) }; //width = 10%;
        leftRightDivParams = { height: (theMap.newImgHeight * 0.1), width: 20 }; //height = 10%;
    try{ document.getElementById('auxMapContainer').parentNode.removeChild(document.getElementById('auxMapContainer')); } catch(e) { console.log(e); };
    var map2012Container = document.createElement('div');
        map2012Container.id = 'auxMapContainer';
        map2012Container.style.position = 'absolute'
        map2012Container.style.top = '0px';
        map2012Container.style.left= '0px';
        map2012Container.style.width = '100%';
        map2012Container.style.height = '100%';
        map2012Container.style.clip ='rect(300px, '+ (paddleCoords.right-300) +'px, '+ (paddleCoords.bottom-300) +'px, 300px)';// TODO: The height and width are hard coded, they need to be flexible.
        map2012Container.style.transition = 'clip 1s ease';
    var map2012Img = document.createElement('img');
        map2012Img.src = window.theMap.src;
        map2012Img.style.width = '100%';
        map2012Img.style.height = '100%';
    var leftDragDiv = document.createElement('div');
        leftDragDiv.id = 'leftDragDiv';
        leftDragDiv.style.position = 'absolute';
        leftDragDiv.style.top = ((theMap.newImgHeight / 2) - (leftRightDivParams.height / 2)) + 'px';//TODO: This needs to be 1/2 the container height.
        leftDragDiv.style.left = paddleCoords +'px';
        leftDragDiv.style.width = leftRightDivParams.width +'px';
        leftDragDiv.style.height = leftRightDivParams.height +'px';
        leftDragDiv.style.borderRadius = '50px';
        //leftDragDiv.style.border = '1px solid red';
        leftDragDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        leftDragDiv.container = map2012Container;
        leftDragDiv.addEventListener('mousedown', function (e) {
             window.addEventListener('mousemove', leftDragDivMouseMove);
             window.addEventListener('mouseup', dragDivMouseUp);
             e.preventDefault();
             e.stopImmediatePropagation();
         });
    var topDragDiv = document.createElement('div');
        topDragDiv.id = 'topDragDiv';
        topDragDiv.style.position = 'absolute';
        topDragDiv.style.top = paddleCoords.top +'px';//TODO: This needs to be 1/2 the container height.
        //console.log(((theMap.newImgWidth / 2) - (topBottomDivParams.width / 2)));
        topDragDiv.style.left = ((paddleCoords.right / 2) - (topBottomDivParams.width / 2)) + 'px';
        topDragDiv.style.width = topBottomDivParams.width +'px';
        topDragDiv.style.height = topBottomDivParams.height +'px';
        topDragDiv.style.borderRadius = '50px';
        //topDragDiv.style.border = '1px solid red';
        topDragDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        topDragDiv.container = map2012Container;
        topDragDiv.addEventListener('mousedown', function (e) {
             window.addEventListener('mousemove', topDragDivMouseMove);
             window.addEventListener('mouseup', dragDivMouseUp);
             e.preventDefault();
             e.stopImmediatePropagation();
         });
    //console.dir(topDragDiv);
    var rightDragDiv = document.createElement('div');
        rightDragDiv.id = 'rightDragDiv';
        rightDragDiv.style.position = 'absolute';
        rightDragDiv.style.width = leftRightDivParams.width +'px';;
        rightDragDiv.style.height = leftRightDivParams.height +'px';;
        rightDragDiv.style.top = ((theMap.newImgHeight / 2) - (leftRightDivParams.height / 2)) + 'px';//TODO: This needs to be 1/2 the container height.
        rightDragDiv.style.left = paddleCoords.right - 20 +'px';
        rightDragDiv.style.borderRadius = '50px';
        //rightDragDiv.style.border = '1px solid red';
        rightDragDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        rightDragDiv.container = map2012Container;
        rightDragDiv.addEventListener('mousedown', function (e) {
             window.addEventListener('mousemove', rightDragDivMouseMove);
             window.addEventListener('mouseup', dragDivMouseUp);
             e.preventDefault();
             e.stopImmediatePropagation();
         });
    var bottomDragDiv = document.createElement('div');
        bottomDragDiv.id = 'bottomDragDiv';
        bottomDragDiv.style.position = 'absolute';
        bottomDragDiv.style.width = topBottomDivParams.width +'px';
        bottomDragDiv.style.height = topBottomDivParams.height +'px';
        bottomDragDiv.style.top = paddleCoords.bottom - 20 +'px';//TODO: This needs to be 1/2 the container height.
        bottomDragDiv.style.left = ((theMap.newImgWidth / 2) - (topBottomDivParams.width / 2)) + 'px';
        bottomDragDiv.style.borderRadius = '50px';
        //bottomDragDiv.style.border = '1px solid red';
        bottomDragDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        bottomDragDiv.container = map2012Container;
        bottomDragDiv.addEventListener('mousedown', function (e) {
             window.addEventListener('mousemove', bottomDragDivMouseMove);
             window.addEventListener('mouseup', dragDivMouseUp);
             e.preventDefault();
             e.stopImmediatePropagation();
         });

    map2012Container.appendChild(map2012Img);
    map2012Container.appendChild(leftDragDiv);
    map2012Container.appendChild(topDragDiv);
    map2012Container.appendChild(rightDragDiv);
    map2012Container.appendChild(bottomDragDiv);
    document.getElementById('theMap_container').appendChild(map2012Container);

    var  leftDragDivMouseMove = function (e) {
        var temp = (e.clientX - this.theMap.mapContainer._left)-10;
        if (temp < 0) { return; }
        if (temp > paddleCoords.right - 42) { return; }
        this.paddleCoords.left = temp;
        this.div.style.left = temp +'px';
        this.div.container.style.clip = this.div.container.style.clip.replace(/-?\d+px(?:\))$/, ~~temp+'px');
    }.bind({theMap: theMap, div: leftDragDiv, paddleCoords: paddleCoords });

    var  topDragDivMouseMove = function (e) {
        var temp = (e.clientY - this.theMap.mapContainer._top) - 10;
        if (temp < 0) { return; }
        if (temp > this.paddleCoords.bottom - 42) { return; }
        if (temp > paddleCoords.bottom - 42) { return; }
        this.paddleCoords.top = temp;
        this.div.style.top = temp +'px';
        this.div.container.style.clip = this.div.container.style.clip.replace(/(^rect\()-?\d+/, '$1'+ ~~temp);
    }.bind({theMap: theMap, div: topDragDiv, paddleCoords: paddleCoords });

    var  rightDragDivMouseMove = function (e) {
         var temp = e.clientX - theMap.mapContainer._left + 10;
         if (temp > theMap.newImgWidth) { return; }
         if (temp < paddleCoords.left + 42) { return; }
         this.paddleCoords.right = temp;
         this.div.style.left = temp - 20 +'px';
         this.div.container.style.clip = this.div.container.style.clip.replace(/(^rect\(-?\d+px,?\s?)-?\d+/, '$1'+ ~~temp);
    }.bind({ theMap: theMap, div: rightDragDiv, paddleCoords: paddleCoords });

    var  bottomDragDivMouseMove = function (e) {
         var temp = e.clientY - theMap.mapContainer._top + 10;
         if (temp > theMap.newImgHeight) { return; }
         if (temp < paddleCoords.top + 42) { return; }
         this.paddleCoords.bottom = temp;
         this.div.style.top = temp - 20 +'px';
         this.div.container.style.clip = this.div.container.style.clip.replace(/(^rect\(-?\d+px,?\s?-?\d+px,?\s?)-?\d+/, '$1'+ ~~temp);
    }.bind({ theMap: theMap, div: bottomDragDiv, paddleCoords: paddleCoords });

    function dragDivMouseUp(e) {
            window.removeEventListener('mousemove', leftDragDivMouseMove);
            window.removeEventListener('mousemove', topDragDivMouseMove);
            window.removeEventListener('mousemove', rightDragDivMouseMove);
            window.removeEventListener('mousemove', bottomDragDivMouseMove);
        }
     //map2012Container.style.transition = 'clip 1s ease';
     window.setTimeout(function (mapContainer) {
         mapContainer.style.clip ='rect(0px, '+ paddleCoords.right +'px, '+ paddleCoords.bottom +'px, 0px)';
         window.setTimeout(function (mapContainer) { mapContainer.style.transition = ''; }, 1200, mapContainer);

     }, 0, map2012Container)// TODO: The height and width are hard coded, they need to be flexible.

}


map2012();