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
    let adaptedReference=false,universalReference=false;
    model.updateMatrixWorld(true);
    model.traverse(object=>{
      if(object.userData.visualStyle==='adapted-uploaded-model')adaptedReference=true;
      if(object.userData.visualStyle==='universal-reference')universalReference=true;
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
    function supportMinimumY(name){
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
          // The source pelvis blends with the thighs and spine; it has no
          // vertices fully assigned to hips. Include its dominant support skin.
          if(amount<(universalReference&&name==='hips'?.40:.9999))continue;
          const vertex=object.getVertexPosition(i,new THREE.Vector3());
          object.localToWorld(vertex);model.worldToLocal(vertex);
          minimum=Math.min(minimum,vertex.y);
        }
      });
      if(!Number.isFinite(minimum))throw new Error('Detainee rigid surface missing: '+name);
      return minimum;
    }
    const seatHeight=.4925,floorClearance=.012;
    const seatedHipHeight=seatHeight+rest.get('hips').position.y-supportMinimumY('hips');
    const ankleHeight=Object.fromEntries(['L','R'].map(side=>[side,
      rest.get('foot.'+side).position.y+floorClearance-supportMinimumY('foot.'+side)]));
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
    function placePalm(name,direction,normal){
      const sourceAxis=new THREE.Vector3(0,1,0).applyQuaternion(rest.get(name).rotation).normalize();
      function basis(axis,surfaceNormal){
        const y=axis.clone().normalize(),z=surfaceNormal.clone().addScaledVector(y,-surfaceNormal.dot(y)).normalize();
        const x=y.clone().cross(z).normalize();return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
      }
      const q=basis(direction,normal).multiply(basis(sourceAxis,new THREE.Vector3(0,1,0)).invert()).multiply(rest.get(name).rotation);
      rotation(name,q);
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
        (woman?-.21:.24)*glance+.055*Math.sin(t*.37),((adaptedReference||universalReference&&!woman)?-.20:0)+.015*Math.sin(t*.44));
      const blinkPhase=(t+.4)%4.6,blink=blinkPhase<.16?1-Math.abs(blinkPhase-.08)/.08:0;
      for(const mesh of blinkMeshes)mesh.morphTargetInfluences[mesh.morphTargetDictionary.Blink]=blink;
      for(const [side,sign] of [['L',-1],['R',1]]){
        const hipWidth=Math.abs(rest.get('thigh.'+side).position.x);
        limb('thigh.'+side,'shin.'+side,'foot.'+side,new THREE.Vector3(sign*hipWidth,ankleHeight[side],universalReference?.48:.31),new THREE.Vector3(0,0,1));
        rotation('foot.'+side,rest.get('foot.'+side).rotation);
        const fidget=.5+.5*Math.sin(t*(woman?.85:1.1)+sign*1.7);
        // The new female pose crosses the forearms; the male pose rests on
        // the thighs. Both targets use the adapted skeleton's seated height.
        const crossed=universalReference&&woman;
        const wrist=crossed?new THREE.Vector3(-sign*.115,seatedHipHeight+(side==='L'?.335:.265)+.002*fidget,side==='L'?.275:.315):new THREE.Vector3(sign*(hipWidth+(universalReference?-.010:.040)),
          (universalReference?seatedHipHeight+.130:woman?.710:.648)+.003*fidget,(universalReference?.29:woman?.130:.160)+.004*Math.sin(t*.48+sign));
        limb('upper_arm.'+side,'forearm.'+side,'hand.'+side,wrist,new THREE.Vector3(sign*.75,-.45,crossed?.35:-.60));
        // Specify both finger direction and palm plane to control wrist roll
        // when moving the source T-pose into crossed arms or hands on the lap.
        if(crossed)placePalm('hand.'+side,new THREE.Vector3(-sign*.94,.18,-.29),new THREE.Vector3(0,0,1));
        else if(universalReference)placePalm('hand.'+side,new THREE.Vector3(0,-.15,.9887),new THREE.Vector3(0,1,.15));
        else orientAxis('hand.'+side,new THREE.Vector3(0,-.50,.8660254));
        for(let i=0;i<4;i++){
          const finger=bones.get(`finger${i}.${side}`),curl=(universalReference&&woman?.35:.03)+.025*Math.max(0,Math.sin(t*(woman?1.4:.8)+i*.7+sign));
          finger.quaternion.copy(rest.get(finger.name).localRotation)
            .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-curl));
          finger.updateMatrixWorld(true);
          if(universalReference){
            const source=['index','middle','ring','pinky'][i],suffix=side.toLowerCase();
            for(const [part,angle] of [['02',woman?.55:.06],['03',woman?.35:.03]]){
              const name=source+'_'+part+'_'+suffix,phalange=bones.get(name);
              phalange.quaternion.copy(rest.get(name).localRotation).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-angle));
              phalange.updateMatrixWorld(true);
            }
          }
        }
      }
      root.updateMatrixWorld(true);
      root.userData.activity=glance>.5?'glancing':'fidgeting';
    };
    root.userData.bones=bones;
    root.userData.sourceProfile=universalReference?'universal-base':'previous';
    root.userData.rigMetrics={lengths,seatedHipHeight,seatHeight,floorClearance,ankleHeight};
    animate(lastTime);
    return root;
  });
  return root;
}
