// The staircase joins two overlapping floors. Its lower exit turns left (towards -z).
const inside=(x,z,a,b,c,d)=>x>=a&&x<=b&&z>=c&&z<=d;
export function canWalk(x,z,eyeY,doorOpen=false){
  if(inside(x,z,2.3,9.5,2.98,5.02))return Math.abs(eyeY-(stairHeight(x)+1.65))<.35;
  if(eyeY>.9)return inside(x,z,-2.35,2.35,-16.5,6.5)&&!(Math.abs(x)<1.43&&z<-15.03);
  if(!doorOpen&&inside(x,z,2.5,3.24,1.52,2.25))return false;
  if(inside(x,z,9.5,11.95,1.52,5.02)||inside(x,z,2.3,11.95,1.52,2.25))return true;
  if(!inside(x,z,-2.35,2.5,-3.06,6.5))return false;
  if(x>2.3&&z>2.25&&z<2.98)return false;
  return !inside(x,z,-2.8,-2.12,-.36,1.96);
}
const stairHeight=x=>-3.365*Math.max(0,Math.min(1,(x-5.05)/4.45));
export function floorHeight(x,z,eyeY){
  if(inside(x,z,2.3,9.5,2.98,5.02)&&Math.abs(eyeY-(stairHeight(x)+1.65))<.35)return stairHeight(x);
  return eyeY>.9?0:-3.365;
}

export function doorwayOccupied(position){return position.y<.9&&inside(position.x,position.z,1.58,3.24,1.13,2.66);}
