import * as THREE from 'three';
import {alignFloorTiles} from './architecture.js';
import {BASEMENT_LAYOUT,BASEMENT_STAIR,FLOOR_BASES} from './building-layout.js';

// Real, continuously connected geometry: the existing right turn upstairs stays
// open, while the straight passage descends to the medical department doorway.
export function createBasement(scene,{materials={}}={}){
  const layout=BASEMENT_LAYOUT,upper=FLOOR_BASES[0],lower=layout.base;
  const root=new THREE.Group();root.name='basement-medical-stair';scene.add(root);
  const material=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const concrete=materials.concrete?.clone()??material('#79807b');
  const plaster=materials.plaster?.clone()??material('#bbc3b5');
  const paint=material('#566f69',.68),steel=material('#849993',.37,.62),dark=material('#263a37');
  const rubber=material('#303c3a',.95),frame=material('#bbc9c0',.45,.25),doorMaterial=material('#738d83',.55,.28);
  const floorMaterial=material('#a9b8af',.64),tileMaterial=material('#c7d1c7',.48);
  // A metre-based tile grid follows the slope, with no stretched UVs at joints.
  function tileTexture(kind){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d');ctx.fillStyle=kind==='floor'?'#aab8ae':'#c5cec4';ctx.fillRect(0,0,256,256);
    ctx.strokeStyle=kind==='floor'?'#8c9a91':'#a5afa5';ctx.lineWidth=2;
    const size=kind==='floor'?128:64;
    for(let i=0;i<=256;i+=size){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,256);ctx.moveTo(0,i);ctx.lineTo(256,i);ctx.stroke();}
    // Fixed deterministic flecks keep medical tiles quiet rather than noisy.
    for(let i=0;i<350;i++){
      const x=(i*73+19)%256,y=(i*113+41)%256;
      ctx.fillStyle=i%3?'rgba(40,65,56,.018)':'rgba(255,255,236,.09)';ctx.fillRect(x,y,1,1);
    }
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    map.wrapS=map.wrapT=THREE.RepeatWrapping;return map;
  }
  floorMaterial.map=tileTexture('floor');floorMaterial.bumpMap=floorMaterial.map;floorMaterial.bumpScale=.002;
  tileMaterial.map=tileTexture('wall');tileMaterial.bumpMap=tileMaterial.map;tileMaterial.bumpScale=.001;
  function box(w,h,d,x,y,z,mat,parent=root){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);
    mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function pipe(a,b,r,mat,parent=root){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,direction.length(),12),mat);
    mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
    mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function sign(text,w,h,x,y,z,rotation=-Math.PI/2,parent=root){
    const canvas=document.createElement('canvas');canvas.width=Math.round(256*w/h);canvas.height=256;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#314f4c';ctx.fillRect(0,0,canvas.width,256);
    ctx.strokeStyle='#cad8c4';ctx.lineWidth=5;ctx.strokeRect(12,12,canvas.width-24,232);
    ctx.fillStyle='#f0f1df';ctx.font='bold 60px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,canvas.width/2,128,canvas.width-48);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,roughness:.65}));
    mesh.position.set(x,y,z);mesh.rotation.y=rotation;parent.add(mesh);return mesh;
  }
  const width=layout.south-layout.north,center=layout.center;
  const extensionLength=layout.stairStart-layout.passageStart;
  alignFloorTiles(box(extensionLength,.16,width,(layout.passageStart+layout.stairStart)/2,upper-.08,center,floorMaterial));
  alignFloorTiles(box(layout.landingEnd-layout.stairEnd,.16,width,(layout.stairEnd+layout.landingEnd)/2,lower-.08,center,floorMaterial));

  // Closed sloped concrete foundation and ordinary 160 mm risers support every
  // tread. Navigation uses the same dimensions, maintaining a constant eye height.
  const steps=20,run=(layout.stairEnd-layout.stairStart)/steps,rise=(upper-lower)/steps;
  for(let i=0;i<steps;i++){
    const x=layout.stairStart+(i+.5)*run,y=upper-(i+1)*rise;
    box(run+.003,rise,width-.16,x,y-rise/2,center,concrete);
    alignFloorTiles(box(run-.024,.012,width-.18,x,y+.006,center,floorMaterial));
    box(.046,.013,width-.18,x-run/2+.025,y+.013,center,rubber);
    for(const z of [layout.north+.15,layout.south-.15]){
      if(i%3===0||i===steps-1){
        // Tread centres sit half a riser below the smooth walking slope. Match
        // the rail at its continuous slope height so every post really joins it.
        const postTop=upper-(i+.5)*rise+1.04;
        pipe([x,y+.017,z],[x,postTop,z],.021,steel);
        box(.09,.012,.09,x,y+.017,z,steel);
        for(const offset of [-.027,.027])box(.012,.008,.012,x+offset,y+.027,z+.023,dark);
      }
    }
  }
  const flightLength=layout.stairEnd-layout.stairStart,angle=Math.atan2(lower-upper,flightLength);
  const slab=box(Math.hypot(flightLength,lower-upper),.18,width,(layout.stairStart+layout.stairEnd)/2,(upper+lower)/2-.2,center,concrete);slab.rotation.z=angle;
  for(const z of [layout.north+.15,layout.south-.15]){
    pipe([layout.passageStart,upper+1.04,z],[layout.stairStart,upper+1.04,z],.029,steel);
    pipe([layout.stairStart,upper+1.04,z],[layout.stairEnd,lower+1.04,z],.029,steel);
    pipe([layout.stairEnd,lower+1.04,z],[layout.stairEnd+.66,lower+1.04,z],.029,steel);
    // Rails terminate against the landing walls with a round, supported return.
    pipe([layout.stairEnd+.66,lower+1.04,z],[layout.stairEnd+.66,lower+.83,z],.029,steel);
    pipe([layout.stairStart-.54,upper+.012,z],[layout.stairStart-.54,upper+1.04,z],.021,steel);
    pipe([layout.stairEnd+.52,lower+.012,z],[layout.stairEnd+.52,lower+1.04,z],.021,steel);
    box(.09,.012,.09,layout.stairStart-.54,upper+.006,z,steel);
    box(.09,.012,.09,layout.stairEnd+.52,lower+.006,z,steel);
  }
  function wallSegment(x0,x1,y0,y1,z,wallHeight=layout.height){
    let offset=0;
    for(const [height,mat]of [[.10,dark],[1.12,paint],[wallHeight-1.22,tileMaterial]]){
      const shape=new THREE.Shape();shape.moveTo(x0,y0+offset);shape.lineTo(x1,y1+offset);shape.lineTo(x1,y1+offset+height);shape.lineTo(x0,y0+offset+height);shape.closePath();
      const geometry=new THREE.ExtrudeGeometry(shape,{depth:.16,steps:1,bevelEnabled:false});
      const uv=geometry.attributes.uv,position=geometry.attributes.position;
      for(let i=0;i<position.count;i++)uv.setXY(i,position.getX(i),position.getY(i));
      const mesh=new THREE.Mesh(geometry,mat);mesh.position.z=z-.08;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);offset+=height;
    }
    pipe([x0,y0+1.24,z],[x1,y1+1.24,z],.018,frame);
  }
  for(const z of [layout.north,layout.south]){
    wallSegment(layout.passageStart,layout.stairStart,upper,upper,z);
    wallSegment(layout.stairStart,layout.stairEnd,upper-.19,lower-.19,z,layout.height+.19);
    wallSegment(layout.stairEnd,layout.landingEnd,lower,lower,z);
  }
  // The continuous ceiling slopes with the flight, preserving full headroom.
  box(extensionLength,.10,width,(layout.passageStart+layout.stairStart)/2,upper+layout.height+.02,center,plaster);
  const ceiling=box(Math.hypot(flightLength,lower-upper),.10,width,(layout.stairStart+layout.stairEnd)/2,(upper+lower)/2+layout.height+.02,center,plaster);ceiling.rotation.z=angle;
  box(layout.landingEnd-layout.stairEnd,.10,width,(layout.stairEnd+layout.landingEnd)/2,lower+layout.height+.02,center,plaster);
  // Narrow clinical fixtures and conduit are fitted to the ceiling, not hovering.
  const glow=new THREE.MeshStandardMaterial({color:'#e0eeee',emissive:'#c1e7e2',emissiveIntensity:1.6,roughness:.4});
  for(const x of [12.66,15.68,19.7]){
    const onFlight=x>layout.stairStart&&x<layout.stairEnd;
    const slope=onFlight?angle:0;
    const progress=Math.max(0,Math.min(1,(x-layout.stairStart)/flightLength));
    const floorY=upper+(lower-upper)*progress;
    // Ceiling centre is floor+height+.02. Offset along its actual normal so
    // the fixture's back meets the ceiling underside, including on the slope.
    const fixture=new THREE.Group();fixture.position.set(x+Math.sin(slope)*.084,floorY+layout.height+.02-Math.cos(slope)*.084,center);fixture.rotation.z=slope;root.add(fixture);
    box(.9,.065,.31,0,0,0,frame,fixture);box(.76,.018,.23,0,-.041,0,glow,fixture);
    for(const u of [-.42,.42])box(.025,.08,.32,u,-.006,0,dark,fixture);
    const light=new THREE.PointLight(0xc9e6dc,14,6.5,2);light.position.copy(fixture.position);light.position.y-=.25;root.add(light);
  }
  const conduitZ=layout.north+.12;
  pipe([layout.passageStart,upper+2.96,conduitZ],[layout.stairStart,upper+2.96,conduitZ],.024,steel);
  pipe([layout.stairStart,upper+2.96,conduitZ],[layout.stairEnd,lower+2.96,conduitZ],.024,steel);
  pipe([layout.stairEnd,lower+2.96,conduitZ],[layout.landingEnd-.1,lower+2.96,conduitZ],.024,steel);
  sign('↓ МОРГ · СУДМЕДЭКСПЕРТИЗА',2.1,.28,12.52,upper+2.56,layout.north+.095,0);
  const hangingSignX=layout.stairStart-.16;
  for(const z of [center-.85,center+.85])box(.024,.36,.024,hangingSignX,upper+3.10,z,steel);
  box(.03,.28,2.08,hangingSignX+.018,upper+2.80,center,dark);
  sign('МОРГ ↓',2.05,.26,hangingSignX,upper+2.80,center,-Math.PI/2);
  sign('↑ ПРИЁМНАЯ · 1 ЭТАЖ',1.6,.25,19.52,lower+2.26,layout.south-.095,Math.PI);

  // A recessed steel door with a real aperture; no opaque backing covers it.
  const doorway=new THREE.Group();doorway.name='morgue-basement-doorway';doorway.position.set(layout.doorX,lower,center);doorway.rotation.y=-Math.PI/2;root.add(doorway);
  const aperture=layout.doorWidth/2;
  for(const side of [-1,1]){
    const remainder=(width-layout.doorWidth)/2;
    box(remainder,layout.height,.16,side*(aperture+remainder/2),layout.height/2,0,tileMaterial,doorway);
    box(.09,2.52,.20,side*(aperture+.025),1.26,.055,frame,doorway);
  }
  box(width,layout.height-2.48,.16,0,(layout.height+2.48)/2,0,tileMaterial,doorway);
  box(layout.doorWidth+.16,.09,.20,0,2.49,.055,frame,doorway);
  box(layout.doorWidth,.018,.31,0,.013,.025,steel,doorway);
  const hinge=new THREE.Group();hinge.position.set(-aperture+.025,0,.05);doorway.add(hinge);
  const leaf=box(layout.doorWidth-.065,2.44,.055,(layout.doorWidth-.065)/2,1.23,0,doorMaterial,hinge);leaf.name='morgue-basement-door';
  // Door skins, kickplate, hinge barrels and latch follow the same leaf transform.
  for(const face of [-1,1]){
    box(layout.doorWidth-.18,.27,.014,(layout.doorWidth-.065)/2,.19,face*.036,steel,hinge);
    box(.075,.24,.018,layout.doorWidth-.21,1.13,face*.04,steel,hinge);
    pipe([layout.doorWidth-.20,1.20,face*.05],[layout.doorWidth-.20,1.20,face*.12],.018,steel,hinge);
    pipe([layout.doorWidth-.20,1.20,face*.12],[layout.doorWidth-.36,1.20,face*.12],.018,steel,hinge);
  }
  for(const y of [.31,1.23,2.13])pipe([.006,y-.06,.006],[.006,y+.06,.006],.025,steel,hinge);
  sign('МОРГ',1.22,.26,0,2.84,.107,0,doorway);
  sign('МОРГ',.94,.22,(layout.doorWidth-.065)/2,1.94,.034,0,hinge);
  sign('СУДЕБНО-МЕДИЦИНСКИЙ ОТДЕЛ',1.23,.12,(layout.doorWidth-.065)/2,1.70,.034,0,hinge);
  // A shallow dark alcove remains behind the opening during the transition to
  // the fully modelled morgue room; the door can be aimed at from either side.
  box(.12,layout.height,width,layout.landingEnd,lower+layout.height/2,center,dark);
  const target=new THREE.Mesh(new THREE.BoxGeometry(.18,2.46,layout.doorWidth),new THREE.MeshBasicMaterial({visible:false}));
  target.position.set(layout.doorX,lower+1.23,center);root.add(target);
  const interaction={type:'morgueDoor',roomType:'morgue',floor:layout.floor,hinge,label:'Морг',openAngle:Math.PI*.48};
  leaf.userData=interaction;target.userData={...interaction};
  let desiredAngle=null;
  function setDoorOpen(open){desiredAngle=open?Math.PI*.48:0;}
  function update(time,dt=0){
    // Exponential easing is independent of frame rate; an already-running door
    // transition can safely resume after a pause or a slower frame.
    if(desiredAngle!==null&&dt>0&&dt<1)hinge.rotation.y=THREE.MathUtils.damp(hinge.rotation.y,desiredAngle,10,dt);
  }
  return {root,interactables:[leaf,target],doorway,door:leaf,doorTarget:target,layout,update,setDoorOpen,toggleDoor:()=>setDoorOpen(desiredAngle==null?Math.abs(hinge.rotation.y)<.6:desiredAngle===0),isDoorOpen:()=>Math.abs(hinge.rotation.y)>.6};
}
