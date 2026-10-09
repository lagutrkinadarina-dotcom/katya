// Camera height distinguishes the two overlapping floors; stairs join them continuously.
const inside=(x,z,a,b,c,d)=>x>=a&&x<=b&&z>=c&&z<=d;
export function canWalk(x,z,eyeY){
  if(inside(x,z,2.3,9.5,2.98,5.02))return Math.abs(eyeY-(stairHeight(x)+1.65))<.35;
  if(eyeY>.9)return inside(x,z,-2.35,2.35,-16.5,6.5)&&!(Math.abs(x)<1.43&&z<-15.03);
  if(inside(x,z,9.3,11.95,2.98,6.5)||inside(x,z,2.3,11.95,5.78,6.5))return true;
  if(!inside(x,z,-2.35,2.5,-5.9,6.5))return false;
  // The reception desk and officer have solid footprints.
  return !(inside(x,z,-1.6,1.6,-4.45,-3.1)||inside(x,z,-.5,.7,-5.25,-4.3)||inside(x,z,-2.6,-1.8,.65,1.8));
}
const stairHeight=x=>-3.365*Math.max(0,Math.min(1,(x-5.05)/4.45));
export function floorHeight(x,z,eyeY){
  if(inside(x,z,2.3,9.5,2.98,5.02)&&Math.abs(eyeY-(stairHeight(x)+1.65))<.35)return stairHeight(x);
  return eyeY>.9?0:-3.365;
}
