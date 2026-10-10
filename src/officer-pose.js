import {Vector3} from 'three';

// A moved workstation cannot lengthen a limb or fold it beyond its reach.
export function solveTwoBone(start,target,upperLength,lowerLength,bendHint){
  const axis=target.clone().sub(start);
  const distance=axis.length();
  if(distance<1e-8)axis.set(0,0,1);else axis.divideScalar(distance);
  const reach=Math.max(Math.abs(upperLength-lowerLength)+1e-5,
    Math.min(upperLength+lowerLength-1e-5,distance));
  const along=(upperLength**2-lowerLength**2+reach**2)/(2*reach);
  const height=Math.sqrt(Math.max(0,upperLength**2-along**2));
  const bend=bendHint.clone().addScaledVector(axis,-bendHint.dot(axis));
  if(bend.lengthSq()<1e-8){
    bend.copy(Math.abs(axis.y)<.9?new Vector3(0,1,0):new Vector3(1,0,0));
    bend.addScaledVector(axis,-bend.dot(axis));
  }
  bend.normalize();
  return {
    joint:start.clone().addScaledVector(axis,along).addScaledVector(bend,height),
    end:start.clone().addScaledVector(axis,reach),
  };
}
