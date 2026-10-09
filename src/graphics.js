import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {Reflector} from 'three/addons/objects/Reflector.js';

// Transparent glass, steam, water and invisible interaction targets must not
// write solid silhouettes into the depth/normal buffer used for contact shadows.
class StationAO extends GTAOPass{
  _renderOverride(renderer,...args){
    const update=renderer.shadowMap.autoUpdate;renderer.shadowMap.autoUpdate=false;
    try{super._renderOverride(renderer,...args);}finally{renderer.shadowMap.autoUpdate=update;}
  }
  _overrideVisibility(){
    super._overrideVisibility();
    this.scene.traverse(object=>{
      if(!object.visible)return;
      const materials=Array.isArray(object.material)?object.material:[object.material];
      if(object.isSprite||materials.some(material=>material&&(material.transparent||material.visible===false))){object.visible=false;this._visibilityCache.push(object);}
    });
  }
}

export function createGraphics(scene,camera,renderer){
  // A small light probe represents the station's warm ceiling strips. Its
  // filtered reflections are shared by tile, wood varnish and painted metal.
  const probe=new THREE.Scene();
  const shell=new THREE.Mesh(new THREE.BoxGeometry(6,3.3,16),new THREE.MeshBasicMaterial({color:'#544b3c',side:THREE.BackSide}));shell.position.y=1.65;probe.add(shell);
  const luminous=new THREE.MeshBasicMaterial({color:new THREE.Color(3.8,3.45,2.8)});
  for(const z of [-5,0,5]){const panel=new THREE.Mesh(new THREE.BoxGeometry(1.45,.035,.28),luminous);panel.position.set(0,3.05,z);probe.add(panel);}
  const generator=new THREE.PMREMGenerator(renderer);scene.environment=generator.fromScene(probe,.04,.1,30).texture;generator.dispose();
  shell.geometry.dispose();shell.material.dispose();probe.children.slice(1).forEach(mesh=>mesh.geometry.dispose());luminous.dispose();
  scene.environmentIntensity=.7;
  let reflecting=false;
  for(const [y,z,length] of [[-3.363, .315,12.93],[.007,-5,24]]){
    const mirror=new Reflector(new THREE.PlaneGeometry(5.7,length),{textureWidth:512,textureHeight:512,multisample:0,clipBias:.002});
    mirror.name=y<0?'lower-floor-reflection':'upper-floor-reflection';mirror.rotation.x=-Math.PI/2;mirror.position.set(0,y,z);mirror.renderOrder=1;
    mirror.material.transparent=true;mirror.material.depthWrite=false;
    mirror.material.fragmentShader=mirror.material.fragmentShader.replace(
      'vec4 base = texture2DProj( tDiffuse, vUv );',
      `vec2 projected=vUv.xy/vUv.w;
       vec3 blurred=vec3(0.0);
       for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)blurred+=texture2D(tDiffuse,projected+vec2(float(x),float(y))*.006).rgb/9.0;
       vec4 base=vec4(blurred,1.0);`
    ).replace('vec4( blendOverlay( base.rgb, color ), 1.0 )','vec4( base.rgb, 0.12 )');
    const renderReflection=mirror.onBeforeRender;
    const previousPosition=new THREE.Vector3(Infinity,Infinity,Infinity),previousRotation=new THREE.Quaternion();
    let renderedAt=-Infinity;
    mirror.onBeforeRender=function(renderer,scene,camera){
      if(reflecting||camera!==mainCamera)return;
      const moved=previousPosition.distanceToSquared(camera.position)>.0001||1-Math.abs(previousRotation.dot(camera.quaternion))>.00001;
      if(!moved&&performance.now()-renderedAt<180)return;
      reflecting=true;try{renderReflection.call(this,renderer,scene,camera);}finally{reflecting=false;}
      previousPosition.copy(camera.position);previousRotation.copy(camera.quaternion);renderedAt=performance.now();
    };
    scene.add(mirror);
  }
  const mainCamera=camera;
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
  const ao=new StationAO(scene,camera,1,1,undefined,{radius:.3,thickness:.8,distanceExponent:1.7,distanceFallOff:.65,scale:1,samples:8},{lumaPhi:10,depthPhi:3,normalPhi:3,radius:4,samples:8});
  ao.blendIntensity=.65;composer.addPass(ao);composer.addPass(new OutputPass());
  function resize(){
    const dimensions=renderer.getSize(new THREE.Vector2()),ratio=renderer.getPixelRatio();
    composer.setPixelRatio(ratio);composer.setSize(dimensions.x,dimensions.y);
    // Half resolution AO retains soft contact shadows without full-size geometry buffers.
    ao.setSize(Math.max(1,Math.round(dimensions.x*ratio*.6)),Math.max(1,Math.round(dimensions.y*ratio*.6)));
  }
  const shadowLights=[];scene.traverse(object=>{if(object.isLight&&object.castShadow)shadowLights.push(object);});
  resize();let width=0,height=0,ratio=0;
  return {ao,composer,resize,render(){
    // Static shadows on the other storey need no repeated rendering.
    scene.updateMatrixWorld();
    for(const light of shadowLights){const y=light.getWorldPosition(new THREE.Vector3()).y;light.shadow.autoUpdate=(camera.position.y<0)===(y<0);}
    const dimensions=renderer.getSize(new THREE.Vector2()),current=renderer.getPixelRatio();
    if(width!==dimensions.x||height!==dimensions.y||ratio!==current){resize();width=dimensions.x;height=dimensions.y;ratio=current;}
    composer.render();
  }};
}
