import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {solveTwoBone} from './officer-pose.js';

const asset=new URL('./assets/officer-duty.glb',import.meta.url).href;
const up=new THREE.Vector3(0,1,0);
const smooth=(a,b,t)=>THREE.MathUtils.smoothstep(t,a,b);

// The approved faceted model is posed through its skeleton, including finger joints.
export function createOfficer({keyboard}={}){
  const root=new THREE.Group();root.name='duty-officer';
  root.userData.headHeight=1.55;
  let animate=()=>{},lastTime=0;
  root.userData.update=time=>{lastTime=time;animate(time);};
  root.ready=new GLTFLoader().loadAsync(asset).then(gltf=>{
    const model=gltf.scene;model.name='lebedev-model';
    const bones=new Map(),rest=new Map();
    model.updateMatrixWorld(true);
    model.traverse(object=>{
      if(object.isBone){
        // GLTFLoader sanitizes dots in bone names for animation track binding.
        object.name=object.name.replace(/^(upper_arm|forearm|hand|thigh|shin|foot|finger\d|thumb)([LR])$/,'$1.$2');
        bones.set(object.name,object);
        rest.set(object.name,{
          position:object.getWorldPosition(new THREE.Vector3()),
          rotation:object.getWorldQuaternion(new THREE.Quaternion()),
          localRotation:object.quaternion.clone(),
        });
      }
      if(object.isMesh){
        object.castShadow=true;object.receiveShadow=true;
        // The idle rig moves outside the standing asset's original bounding box.
        object.frustumCulled=false;
      }
    });
    const required=['hips','spine','head',...['L','R'].flatMap(side=>[
      'upper_arm.'+side,'forearm.'+side,'hand.'+side,
      'thigh.'+side,'shin.'+side,'foot.'+side,
      ...Array.from({length:4},(_,i)=>`finger${i}.${side}`),
    ])];
    for(const name of required)if(!bones.has(name))throw new Error('Officer joint missing: '+name);
    root.add(model);root.updateMatrixWorld(true);

    const modelRotation=new THREE.Quaternion();
    function worldRotation(name,rotation){
      const bone=bones.get(name);
      const parentRotation=bone.parent.getWorldQuaternion(new THREE.Quaternion());
      bone.quaternion.copy(parentRotation.invert()).multiply(modelRotation).multiply(rotation);
      bone.updateMatrixWorld(true);
    }
    function orient(name,restEnd,direction){
      const original=rest.get(restEnd).position.clone().sub(rest.get(name).position).normalize();
      const delta=new THREE.Quaternion().setFromUnitVectors(original,direction.clone().normalize());
      worldRotation(name,delta.multiply(rest.get(name).rotation));
    }
    function turn(name,x,y=0,z=0){
      const delta=new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z));
      worldRotation(name,delta.multiply(rest.get(name).rotation));
    }
    function position(name){return model.worldToLocal(bones.get(name).getWorldPosition(new THREE.Vector3()));}
    function length(a,b){return rest.get(a).position.distanceTo(rest.get(b).position);}
    function limb(upper,lower,end,target,bend){
      const start=position(upper);
      const solved=solveTwoBone(start,target,length(upper,lower),length(lower,end),bend);
      orient(upper,lower,solved.joint.clone().sub(start));
      orient(lower,end,solved.end.clone().sub(solved.joint));
    }

    animate=time=>{
      root.updateMatrixWorld(true);model.getWorldQuaternion(modelRotation);
      // Chair seat at 0.56 m; the hips remain fixed while the spine breathes.
      const hips=bones.get('hips'),seated=rest.get('hips').position.clone().addScaledVector(up,-.23);
      hips.position.copy(hips.parent.worldToLocal(model.localToWorld(seated)));
      hips.quaternion.copy(rest.get('hips').localRotation);hips.updateMatrixWorld(true);
      turn('spine',.008*Math.sin(time*1.7));
      turn('neck',.012*Math.sin(time*.8));

      const phase=time%14;
      const pause=smooth(9,9.8,phase)*(1-smooth(13.2,14,phase));
      const monitor=smooth(9.5,10.2,phase)*(1-smooth(11.5,12.2,phase));
      turn('head',.12*(1-pause)+.018*Math.sin(time*1.1),.42*monitor+.035*Math.sin(time*.5),.008*Math.sin(time*.7));

      keyboard?.updateWorldMatrix(true,false);
      for(const [side,sign] of [['L',-1],['R',1]]){
        // Feet stay on the floor; two-bone solving preserves thigh/shin lengths.
        limb('thigh.'+side,'shin.'+side,'foot.'+side,
          new THREE.Vector3(sign*.103,.12,.34),new THREE.Vector3(0,0,1));
        worldRotation('foot.'+side,rest.get('foot.'+side).rotation);

        const tap=(1-pause)*(.5+.5*Math.sin(time*9+sign*1.4));
        // The fingertip pads reach the 0.0215 m key tops at the deepest press.
        const point=new THREE.Vector3(sign*.105,.079+.004*tap,-.115);
        const wrist=keyboard?model.worldToLocal(keyboard.localToWorld(point)):
          new THREE.Vector3(sign*.105,1.122+.004*tap,.42);
        limb('upper_arm.'+side,'forearm.'+side,'hand.'+side,wrist,
          new THREE.Vector3(sign*.2,-1,0));
        // Palms slope gently toward the keys; no stretching or detached hands.
        orient('hand.'+side,`finger1.${side}`,new THREE.Vector3(0,-.32,1));
        for(let i=0;i<4;i++){
          const finger=bones.get(`finger${i}.${side}`);
          const press=(1-pause)*Math.pow(Math.max(0,Math.sin(time*12+i*1.9+sign*2.2)),3);
          finger.quaternion.copy(rest.get(finger.name).localRotation)
            .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.16*press));
          finger.updateMatrixWorld(true);
        }
      }
      root.updateMatrixWorld(true);
      root.userData.activity=pause>.5?'glancing':'typing';
    };
    root.userData.bones=bones;
    animate(lastTime);
    return root;
  });
  return root;
}
