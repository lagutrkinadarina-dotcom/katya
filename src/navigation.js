import {EYE_HEIGHT,FLOOR_BASES,STAIR_START,STAIR_END,DOWN_STAIR,UP_STAIR,PASSAGE} from './building-layout.js';

const inside=(x,z,a,b,c,d)=>x>=a&&x<=b&&z>=c&&z<=d;
const nearFloor=(eyeY,base)=>Math.abs(eyeY-base-EYE_HEIGHT)<.35;
const stairHeight=(x,stair)=>stair.base+stair.rise*Math.max(0,Math.min(1,(x-STAIR_START)/(STAIR_END-STAIR_START)));
const stairs=[DOWN_STAIR,UP_STAIR];
function matchingStair(x,z,eyeY){
  return stairs.find(stair=>inside(x,z,2.3,STAIR_END,stair.zMin,stair.zMax)&&nearFloor(eyeY,stairHeight(x,stair)));
}
export function floorNumber(eyeY){
  return FLOOR_BASES.reduce((nearest,base,i)=>Math.abs(eyeY-base-EYE_HEIGHT)<Math.abs(eyeY-FLOOR_BASES[nearest]-EYE_HEIGHT)?i:nearest,0)+1;
}
export function canWalk(x,z,eyeY,doorOpen=false){
  if(matchingStair(x,z,eyeY))return true;
  // Overlapping floors only connect at their landings. Leaving a flight halfway
  // cannot snap the player up/down to a different corridor.
  if(nearFloor(eyeY,FLOOR_BASES[2])){
    return inside(x,z,-2.35,2.35,-16.5,6.5)
      ||inside(x,z,2.3,11.95,-3,-.98)
      ||inside(x,z,STAIR_END,11.95,-3,UP_STAIR.zMax);
  }
  if(nearFloor(eyeY,0))return inside(x,z,-2.35,2.35,-16.5,6.5);
  if(!nearFloor(eyeY,FLOOR_BASES[0]))return false;
  if(!doorOpen&&inside(x,z,2.5,3.24,PASSAGE.north+.15,PASSAGE.south-.15))return false;
  if(inside(x,z,STAIR_END,11.95,PASSAGE.north+.25,DOWN_STAIR.zMax)
    ||inside(x,z,2.3,11.95,PASSAGE.north+.25,PASSAGE.south-.26))return true;
  if(!inside(x,z,-2.35,2.5,-3.06,6.5))return false;
  if(x>2.3&&z>PASSAGE.south-.26&&z<DOWN_STAIR.zMin)return false;
  return true;
}
export function floorHeight(x,z,eyeY){
  const stair=matchingStair(x,z,eyeY);
  return stair?stairHeight(x,stair):FLOOR_BASES[floorNumber(eyeY)-1];
}
export function doorwayOccupied(position){
  return nearFloor(position.y,FLOOR_BASES[0])&&inside(position.x,position.z,1.9,4.15,PASSAGE.north-.1,PASSAGE.south+.1);
}
