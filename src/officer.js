import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {solveTwoBone} from './officer-pose.js';

const asset=new URL('./assets/officer-duty.glb',import.meta.url).href;
const smooth=(a,b,t)=>THREE.MathUtils.smoothstep(t,a,b);

// Continuous Universal anatomy uses the same rounded style as the cell NPCs.
export function createOfficer({keyboard}={}){
  const root=new THREE.Group();root.name='duty-officer';
  root.userData.headHeight=1.55;
  let animate=()=>{},lastTime=0;
  root.userData.update=time=>{lastTime=time;animate(time);};
  root.ready=new GLTFLoader().loadAsync(asset).then(gltf=>{
    const model=gltf.scene;model.name='lebedev-model';
    const bones=new Map(),rest=new Map(),blinkMeshes=[];
    let hipSupportHeight;
    model.updateMatrixWorld(true);
    model.traverse(object=>{
      if(Number.isFinite(object.userData.restHipSupportHeight))hipSupportHeight=object.userData.restHipSupportHeight;
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
      if(object.morphTargetDictionary?.Blink!==undefined)blinkMeshes.push(object);
    });
    const required=['hips','spine','neck','head',...['L','R'].flatMap(side=>[
      'upper_arm.'+side,'forearm.'+side,'hand.'+side,
      'thigh.'+side,'shin.'+side,'foot.'+side,
      ...Array.from({length:4},(_,i)=>`finger${i}.${side}`),
    ])];
    for(const name of required)if(!bones.has(name))throw new Error('Officer joint missing: '+name);
    if(bones.size!==65)throw new Error('Officer must preserve the original 65-joint Universal hierarchy');
    function supportMinimumY(name){
      let minimum=Infinity;
      model.traverse(object=>{
        if(!object.isSkinnedMesh)return;
        let marker=object;
        while(marker&&!marker.userData.supportSurface)marker=marker.parent;
        if(!marker)return;
        object.skeleton.update();
        const indices=object.geometry.attributes.skinIndex,weights=object.geometry.attributes.skinWeight;
        for(let i=0;i<indices.count;i++){
          let amount=0;
          for(let c=0;c<4;c++)if(object.skeleton.bones[indices.getComponent(i,c)]?.name===name)amount+=weights.getComponent(i,c);
          if(amount<.99)continue;
          const vertex=object.getVertexPosition(i,new THREE.Vector3());
          object.localToWorld(vertex);model.worldToLocal(vertex);minimum=Math.min(minimum,vertex.y);
        }
      });
      if(!Number.isFinite(minimum))throw new Error('Officer source support missing: '+name);
      return minimum;
    }
    const seatedHipHeight=.56+rest.get('hips').position.y-hipSupportHeight;
    if(!Number.isFinite(seatedHipHeight))throw new Error('Officer source pelvis support missing');
    const ankleHeight=Object.fromEntries(['L','R'].map(side=>[side,
      rest.get('foot.'+side).position.y+.012-supportMinimumY('foot.'+side)]));
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
    function orientAxis(name,direction){
      const original=new THREE.Vector3(0,1,0).applyQuaternion(rest.get(name).rotation);
      const delta=new THREE.Quaternion().setFromUnitVectors(original,direction.clone().normalize());
      worldRotation(name,delta.multiply(rest.get(name).rotation));
    }
    function turn(name,x,y=0,z=0){
      const delta=new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z));
      worldRotation(name,delta.multiply(rest.get(name).rotation));
    }
    function curlFinger(name,amount){
      const bone=bones.get(name);
      if(!bone)return;
      bone.quaternion.copy(rest.get(name).localRotation);bone.updateMatrixWorld(true);
      // Curl across the keyboard, regardless of the uploaded bone's roll.
      // The local Z axes of this rig spread fingers instead of flexing them.
      const axis=new THREE.Vector3(1,0,0).applyQuaternion(modelRotation)
        .applyQuaternion(bone.getWorldQuaternion(new THREE.Quaternion()).invert());
      bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axis,.02*amount));
      bone.updateMatrixWorld(true);
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
      const hips=bones.get('hips'),seated=rest.get('hips').position.clone();seated.y=seatedHipHeight;
      hips.position.copy(hips.parent.worldToLocal(model.localToWorld(seated)));
      hips.quaternion.copy(rest.get('hips').localRotation);hips.updateMatrixWorld(true);
      turn('spine',.008*Math.sin(time*1.7));
      turn('neck',.012*Math.sin(time*.8));

      const phase=time%14;
      const pause=smooth(9,9.8,phase)*(1-smooth(13.2,14,phase));
      const monitor=smooth(9.5,10.2,phase)*(1-smooth(11.5,12.2,phase));
      turn('head',.12*(1-pause)+.018*Math.sin(time*1.1),.42*monitor+.035*Math.sin(time*.5),.008*Math.sin(time*.7));
      const blinkPhase=time%4.9;
      const blink=blinkPhase<.17?Math.sin(Math.PI*blinkPhase/.17):0;
      for(const mesh of blinkMeshes)mesh.morphTargetInfluences[mesh.morphTargetDictionary.Blink]=blink;

      keyboard?.updateWorldMatrix(true,false);
      for(const [side,sign] of [['L',-1],['R',1]]){
        // Feet stay on the floor; two-bone solving preserves thigh/shin lengths.
        limb('thigh.'+side,'shin.'+side,'foot.'+side,
          new THREE.Vector3(sign*.13,ankleHeight[side],.32),new THREE.Vector3(0,0,1));
        worldRotation('foot.'+side,rest.get('foot.'+side).rotation);

        const tap=(1-pause)*(.5+.5*Math.sin(time*9+sign*1.4));
        // The fingertip pads reach the 0.0215 m key tops at the deepest press.
        const point=new THREE.Vector3(sign*.105,.103-.001*tap,-.147);
        const wrist=keyboard?model.worldToLocal(keyboard.localToWorld(point)):
          new THREE.Vector3(sign*.105,1.145-.001*tap,.40);
        limb('upper_arm.'+side,'forearm.'+side,'hand.'+side,wrist,
          new THREE.Vector3(sign*.2,-1,0));
        // Palms slope gently toward the keys; no stretching or detached hands.
        // Use the longitudinal source hand axis, not an off-centre finger base.
        orientAxis('hand.'+side,new THREE.Vector3(0,-.31,1));
        for(let i=0;i<4;i++){
          const press=(1-pause)*Math.pow(Math.max(0,Math.sin(time*12+i*1.9+sign*2.2)),3);
          curlFinger(`finger${i}.${side}`,press);
          const prefix=['index','middle','ring','pinky'][i],suffix=side.toLowerCase();
          for(const segment of ['02','03']){
            curlFinger(`${prefix}_${segment}_${suffix}`,.60*press);
          }
        }
      }
      root.updateMatrixWorld(true);
      root.userData.activity=pause>.5?'glancing':'typing';
    };
    root.userData.bones=bones;
    root.userData.rigMetrics={seatedHipHeight,ankleHeight,lengths:Object.fromEntries(['L','R'].flatMap(side=>[
      ['upper_arm','forearm'],['forearm','hand'],['thigh','shin'],['shin','foot'],
    ].map(([a,b])=>[a+'.'+side,length(a+'.'+side,b+'.'+side)])))};
    animate(lastTime);
    return root;
  });
  return root;
}
