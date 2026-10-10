import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {solveTwoBone} from './officer-pose.js';

const assets={
  woman:new URL('./assets/detainee-woman.glb',import.meta.url).href,
  man:new URL('./assets/detainee-man.glb',import.meta.url).href,
};

export function createDetainee(kind,index){
  const root=new THREE.Group();root.name='detainee-'+kind;
  let animate=()=>{},lastTime=0;
  root.userData.update=time=>{lastTime=time;animate(time);};
  root.ready=new GLTFLoader().loadAsync(assets[kind]).then(gltf=>{
    const model=gltf.scene;model.name=kind+'-model';
    const bones=new Map(),rest=new Map(),blinkMeshes=[];
    model.updateMatrixWorld(true);
    model.traverse(object=>{
      if(object.isBone){
        object.name=object.name.replace(/^(upper_arm|forearm|hand|thigh|shin|foot|finger\d|thumb)([LR])$/,'$1.$2');
        bones.set(object.name,object);
        rest.set(object.name,{
          position:object.getWorldPosition(new THREE.Vector3()),
          rotation:object.getWorldQuaternion(new THREE.Quaternion()),
          localRotation:object.quaternion.clone(),
        });
      }
      if(object.isMesh){object.castShadow=true;object.receiveShadow=true;object.frustumCulled=false;}
      if(object.morphTargetDictionary?.Blink!==undefined)blinkMeshes.push(object);
    });
    for(const name of ['hips','spine','neck','head',...['L','R'].flatMap(side=>[
      'upper_arm.'+side,'forearm.'+side,'hand.'+side,'thigh.'+side,'shin.'+side,'foot.'+side,
      ...Array.from({length:4},(_,i)=>`finger${i}.${side}`),'thumb.'+side,
    ])])if(!bones.has(name))throw new Error('Detainee joint missing: '+name);
    // Fit the newly built mesh, rather than retaining the proportions of the
    // officer that older civilians were assembled from. Positions here are in
    // the glTF's Y-up model space; the bench itself has not moved.
    function rigidMinimumY(name){
      let minimum=Infinity;
      model.traverse(object=>{
        if(!object.isSkinnedMesh)return;
        object.skeleton.update();
        const ids=object.geometry.attributes.skinIndex,weights=object.geometry.attributes.skinWeight;
        for(let i=0;i<ids.count;i++){
          let amount=0;
          for(let component=0;component<4;component++){
            if(object.skeleton.bones[ids.getComponent(i,component)]?.name===name)
              amount+=weights.getComponent(i,component);
          }
          if(amount<.9999)continue;
          const vertex=object.getVertexPosition(i,new THREE.Vector3());
          object.localToWorld(vertex);model.worldToLocal(vertex);
          minimum=Math.min(minimum,vertex.y);
        }
      });
      if(!Number.isFinite(minimum))throw new Error('Detainee rigid surface missing: '+name);
      return minimum;
    }
    const seatHeight=.4925,floorClearance=.012;
    const seatedHipHeight=seatHeight+rest.get('hips').position.y-rigidMinimumY('hips');
    const ankleHeight=Object.fromEntries(['L','R'].map(side=>[side,
      rest.get('foot.'+side).position.y+floorClearance-rigidMinimumY('foot.'+side)]));
    const lengths=Object.fromEntries(['L','R'].flatMap(side=>[
      ['upper_arm','forearm'],['forearm','hand'],['thigh','shin'],['shin','foot'],
    ].map(([start,end])=>[start+'.'+side,rest.get(start+'.'+side).position.distanceTo(rest.get(end+'.'+side).position)])));
    root.add(model);root.updateMatrixWorld(true);
    const modelRotation=new THREE.Quaternion();
    function rotation(name,q){
      const bone=bones.get(name),parent=bone.parent.getWorldQuaternion(new THREE.Quaternion());
      bone.quaternion.copy(parent.invert()).multiply(modelRotation).multiply(q);bone.updateMatrixWorld(true);
    }
    function turn(name,x,y=0,z=0){
      rotation(name,new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z)).multiply(rest.get(name).rotation));
    }
    function orient(name,end,direction){
      const original=rest.get(end).position.clone().sub(rest.get(name).position).normalize();
      rotation(name,new THREE.Quaternion().setFromUnitVectors(original,direction.clone().normalize()).multiply(rest.get(name).rotation));
    }
    function orientAxis(name,direction){
      // A finger base sits to one side of the palm centre. Use the bone's actual
      // longitudinal axis so this offset cannot skew the complete wrist.
      const original=new THREE.Vector3(0,1,0).applyQuaternion(rest.get(name).rotation);
      rotation(name,new THREE.Quaternion().setFromUnitVectors(original,direction.clone().normalize()).multiply(rest.get(name).rotation));
    }
    function position(name){return model.worldToLocal(bones.get(name).getWorldPosition(new THREE.Vector3()));}
    function limb(upper,lower,end,target,bend){
      const start=position(upper),a=lengths[upper],b=lengths[lower];
      const pose=solveTwoBone(start,target,a,b,bend);
      orient(upper,lower,pose.joint.clone().sub(start));orient(lower,end,pose.end.clone().sub(pose.joint));
    }
    animate=time=>{
      root.updateMatrixWorld(true);model.getWorldQuaternion(modelRotation);
      const t=time+index*4.3,hips=bones.get('hips');
      const seated=rest.get('hips').position.clone();seated.y=seatedHipHeight;
      hips.position.copy(hips.parent.worldToLocal(model.localToWorld(seated)));
      hips.quaternion.copy(rest.get('hips').localRotation);hips.updateMatrixWorld(true);
      const woman=kind==='woman',cycle=t%(woman?15:19);
      const glance=THREE.MathUtils.smoothstep(cycle,6,7)*(1-THREE.MathUtils.smoothstep(cycle,10,11));
      turn('spine',.023+.012*Math.sin(t*(woman?.55:.42)),.008*Math.sin(t*.35),.009*Math.sin(t*.47));
      turn('neck',.008*Math.sin(t*1.5));
      turn('head',.035+.025*Math.sin(t*.7),
        (woman?-.21:.24)*glance+.055*Math.sin(t*.37),.015*Math.sin(t*.44));
      const blinkPhase=(t+.4)%4.6,blink=blinkPhase<.16?1-Math.abs(blinkPhase-.08)/.08:0;
      for(const mesh of blinkMeshes)mesh.morphTargetInfluences[mesh.morphTargetDictionary.Blink]=blink;
      for(const [side,sign] of [['L',-1],['R',1]]){
        const hipWidth=Math.abs(rest.get('thigh.'+side).position.x);
        limb('thigh.'+side,'shin.'+side,'foot.'+side,new THREE.Vector3(sign*hipWidth,ankleHeight[side],.31),new THREE.Vector3(0,0,1));
        rotation('foot.'+side,rest.get('foot.'+side).rotation);
        const fidget=.5+.5*Math.sin(t*(woman?.85:1.1)+sign*1.7);
        // The dress lies higher than the man's trousers. Keep the woman's
        // palms on its hem and the man's on his thighs, rather than hovering.
        const wrist=new THREE.Vector3(sign*(hipWidth+.040),
          (woman?.703:.648)+.003*fidget,(woman?.130:.160)+.004*Math.sin(t*.48+sign));
        limb('upper_arm.'+side,'forearm.'+side,'hand.'+side,wrist,new THREE.Vector3(sign*.75,-.45,-.60));
        // The fresh bind pose already has palms facing back. This single swing
        // lays them on the lap without twisting the shared wrist rings.
        orientAxis('hand.'+side,new THREE.Vector3(0,-.50,.8660254));
        for(let i=0;i<4;i++){
          const finger=bones.get(`finger${i}.${side}`),curl=.04+.045*Math.max(0,Math.sin(t*(woman?1.4:.8)+i*.7+sign));
          finger.quaternion.copy(rest.get(finger.name).localRotation)
            .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),curl));
          finger.updateMatrixWorld(true);
        }
      }
      root.updateMatrixWorld(true);
      root.userData.activity=glance>.5?'glancing':'fidgeting';
    };
    root.userData.bones=bones;
    root.userData.rigMetrics={lengths,seatedHipHeight,seatHeight,floorClearance,ankleHeight};
    animate(lastTime);
    return root;
  });
  return root;
}
