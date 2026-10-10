import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {solveTwoBone} from './officer-pose.js';

const assets={
  hoodie:new URL('./assets/detainee-hoodie.glb',import.meta.url).href,
  shirt:new URL('./assets/detainee-shirt.glb',import.meta.url).href,
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
      ...Array.from({length:4},(_,i)=>`finger${i}.${side}`),
    ])])if(!bones.has(name))throw new Error('Detainee joint missing: '+name);
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
    function position(name){return model.worldToLocal(bones.get(name).getWorldPosition(new THREE.Vector3()));}
    function limb(upper,lower,end,target,bend){
      const start=position(upper),a=rest.get(upper).position.distanceTo(rest.get(lower).position),b=rest.get(lower).position.distanceTo(rest.get(end).position);
      const pose=solveTwoBone(start,target,a,b,bend);
      orient(upper,lower,pose.joint.clone().sub(start));orient(lower,end,pose.end.clone().sub(pose.joint));
    }
    animate=time=>{
      root.updateMatrixWorld(true);model.getWorldQuaternion(modelRotation);
      const t=time+index*4.3,hips=bones.get('hips');
      const seated=rest.get('hips').position.clone();seated.y=.5525;
      hips.position.copy(hips.parent.worldToLocal(model.localToWorld(seated)));
      hips.quaternion.copy(rest.get('hips').localRotation);hips.updateMatrixWorld(true);
      const hoodie=kind==='hoodie',cycle=t%(hoodie?15:19);
      const glance=THREE.MathUtils.smoothstep(cycle,6,7)*(1-THREE.MathUtils.smoothstep(cycle,10,11));
      turn('spine',.023+.012*Math.sin(t*(hoodie?.55:.42)),.008*Math.sin(t*.35),.009*Math.sin(t*.47));
      turn('neck',.008*Math.sin(t*1.5));
      turn('head',.035+.025*Math.sin(t*.7),
        (hoodie?-.21:.24)*glance+.055*Math.sin(t*.37),.015*Math.sin(t*.44));
      const blinkPhase=(t+.4)%4.6,blink=blinkPhase<.16?1-Math.abs(blinkPhase-.08)/.08:0;
      for(const mesh of blinkMeshes)mesh.morphTargetInfluences[mesh.morphTargetDictionary.Blink]=blink;
      for(const [side,sign] of [['L',-1],['R',1]]){
        limb('thigh.'+side,'shin.'+side,'foot.'+side,new THREE.Vector3(sign*.103,.12,.31),new THREE.Vector3(0,0,1));
        rotation('foot.'+side,rest.get('foot.'+side).rotation);
        const fidget=.5+.5*Math.sin(t*(hoodie?.85:1.1)+sign*1.7);
        const wrist=new THREE.Vector3(sign*.125,.707+.005*fidget,.145+.006*Math.sin(t*.48+sign));
        limb('upper_arm.'+side,'forearm.'+side,'hand.'+side,wrist,new THREE.Vector3(sign*.3,-.2,-1));
        orient('hand.'+side,`finger1.${side}`,new THREE.Vector3(0,-.66,.75));
        for(let i=0;i<4;i++){
          const finger=bones.get(`finger${i}.${side}`),curl=.04+.045*Math.max(0,Math.sin(t*(hoodie?1.4:.8)+i*.7+sign));
          finger.quaternion.copy(rest.get(finger.name).localRotation)
            .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),curl));
          finger.updateMatrixWorld(true);
        }
      }
      root.updateMatrixWorld(true);
      root.userData.activity=glance>.5?'glancing':'fidgeting';
    };
    root.userData.bones=bones;
    animate(lastTime);
    return root;
  });
  return root;
}
