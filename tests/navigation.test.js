import test from 'node:test';
import assert from 'node:assert/strict';
import {canWalk,floorHeight,floorNumber,doorwayOccupied} from '../src/navigation.js';
import {BASEMENT_LAYOUT,BASEMENT_STAIR,EYE_HEIGHT,FLOOR_BASES} from '../src/building-layout.js';

// Sample complete routes at walking speed. Each accepted position determines the
// next eye height, as it does in the game, rather than teleporting between floors.
function walk(points,initialEye,doorOpen=true){
  let eye=initialEye;
  for(let i=1;i<points.length;i++){
    const [ax,az]=points[i-1],[bx,bz]=points[i];
    const steps=Math.ceil(Math.hypot(bx-ax,bz-az)/.04);
    for(let j=1;j<=steps;j++){
      const x=ax+(bx-ax)*j/steps,z=az+(bz-az)*j/steps;
      assert.ok(canWalk(x,z,eye,doorOpen),`Blocked at ${x},${eye},${z}`);
      const next=floorHeight(x,z,eye)+1.65;
      assert.ok(Math.abs(next-eye)<.05,'A route must not jump between storeys');
      eye=next;
    }
  }
  return eye;
}
const firstToSecond=[[0,1.33],[10.7,1.33],[10.7,4],[0,4]];
const secondToThird=[[0,.7],[10.7,.7],[10.7,-2],[0,-2]];
test('walk from first to third floor and return using both real stair flights',()=>{
  assert.ok(Math.abs(walk(firstToSecond,-1.715)-1.65)<1e-8);
  assert.ok(Math.abs(walk(secondToThird,1.65)-5.13)<1e-8);
  assert.ok(Math.abs(walk([...secondToThird].reverse(),5.13)-1.65)<1e-8);
  assert.ok(Math.abs(walk([...firstToSecond].reverse(),1.65)+1.715)<1e-8);
});
test('the enlarged first-floor doorway is gated across both leaves',()=>{
  for(const z of [.4,1.33,2.25]){
    assert.equal(canWalk(2.9,z,-1.715,false),false);
    assert.equal(canWalk(2.9,z,-1.715,true),true);
    assert.equal(doorwayOccupied({x:2.9,y:-1.715,z}),true);
  }
  for(const z of [.5,2.2])assert.equal(doorwayOccupied({x:3.8,y:-1.715,z}),true,'Protect the whole leaf sweep, including its far edge');
  assert.equal(doorwayOccupied({x:4.4,y:-1.715,z:1.33}),false);
  assert.equal(doorwayOccupied({x:2.9,y:1.65,z:1.33}),false);
});
test('cannot leave either flight halfway to jump into an overlapping floor',()=>{
  const upEye=floorHeight(7,.7,1.65+3.48*(7-5.05)/4.45)+1.65;
  const downEye=floorHeight(7,4,1.65-3.365*(7-5.05)/4.45)+1.65;
  for(const eye of [upEye,downEye]){
    assert.equal(canWalk(7,-2,eye,true),false);
    assert.equal(canWalk(7,2.4,eye,true),false);
    assert.equal(canWalk(0,0,eye,true),false);
  }
  assert.equal(canWalk(7,4,upEye,true),false);
  assert.equal(canWalk(7,.7,downEye,true),false);
});
test('existing save locations and the third-floor corridor remain valid',()=>{
  for(const [x,eye,z,floor] of [[.25,-1.715,-2.4,1],[6,-1.715,1.905,1],[0,1.65,5,2],[0,5.13,-7,3]]){
    assert.ok(canWalk(x,z,eye,true));
    assert.equal(floorNumber(eye),floor);
    assert.ok(Math.abs(floorHeight(x,z,eye)+1.65-eye)<1e-8);
  }
  assert.equal(canWalk(4,.7,5.13,true),false,'Upper floor cannot lead into the open stair shaft');
});
test('continue straight from reception down the real basement flight and return',()=>{
  const route=[[0,BASEMENT_LAYOUT.center],[12.65,BASEMENT_LAYOUT.center],[20.35,BASEMENT_LAYOUT.center]];
  const eye=walk(route,FLOOR_BASES[0]+EYE_HEIGHT);
  assert.ok(Math.abs(eye-(BASEMENT_LAYOUT.base+EYE_HEIGHT))<1e-8);
  assert.equal(floorNumber(eye),0);
  assert.ok(Math.abs(walk([...route].reverse(),eye)-(FLOOR_BASES[0]+EYE_HEIGHT))<1e-8);
  assert.throws(()=>walk(route,FLOOR_BASES[0]+EYE_HEIGHT,false),/Blocked/,'The existing reception access door still gates both stair routes');
});
test('basement cannot snap sideways into another storey or be reached through its ceiling',()=>{
  const x=(BASEMENT_STAIR.start+BASEMENT_STAIR.end)/2;
  const eye=BASEMENT_STAIR.base+BASEMENT_STAIR.rise/2+EYE_HEIGHT;
  assert.equal(canWalk(x,BASEMENT_STAIR.zMin-.1,eye,true),false);
  assert.equal(canWalk(x,BASEMENT_STAIR.zMax+.1,eye,true),false);
  assert.equal(canWalk(11,BASEMENT_LAYOUT.center,eye,true),false);
  assert.equal(canWalk(20.35,BASEMENT_LAYOUT.center,FLOOR_BASES[0]+EYE_HEIGHT,true),false);
  assert.equal(canWalk(14,BASEMENT_LAYOUT.center,BASEMENT_LAYOUT.base+EYE_HEIGHT,true),false);
  assert.equal(canWalk(12.65,BASEMENT_LAYOUT.center,FLOOR_BASES[1]+EYE_HEIGHT,true),false);
  assert.equal(canWalk(BASEMENT_LAYOUT.landingEnd+.01,BASEMENT_LAYOUT.center,BASEMENT_LAYOUT.base+EYE_HEIGHT,true),false);
  assert.equal(canWalk(BASEMENT_LAYOUT.doorX+.01,BASEMENT_LAYOUT.center,BASEMENT_LAYOUT.base+EYE_HEIGHT,true),false,'A closed medical door is entered by interaction, not by walking through its leaf');
});
