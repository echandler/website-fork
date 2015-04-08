//http://www.w3schools.com/SVG/tryit.asp?filename=trysvg_polygon

var makePointMouseMove = function( e ){
    
    var z = this.ownerSVGElement.createSVGPoint();
    z.x = e.clientX;
    z.y = e.clientY;

    this.points.replaceItem( z,this.points.numberOfItems-1 );
}.bind( document.getElementById('b') );

var makePointMouseDown = function ( e ){
var z = this.ownerSVGElement.createSVGPoint();
z.x = e.clientX;
z.y = e.clientY;
    this.points.appendItem( z );
z = this.ownerSVGElement.createSVGPoint();
z.x = e.clientX;
z.y = e.clientY;
this.points.appendItem( z );
console.log( this.points.numberOfItems);
    document.addEventListener('mousemove', makePointMouseMove );
    document.addEventListener('mouseup', makePointMouseUp);
}.bind( document.getElementById('b') );

function makePointMouseUp(){
    document.removeEventListener('mousemove', makePointMouseMove );
    document.removeEventListener('mouseup', makePointMouseUp);
}
document.addEventListener('mousedown', makePointMouseDown ); 
