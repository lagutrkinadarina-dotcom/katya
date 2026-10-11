import * as THREE from 'three';

// Real aluminium louvers lift into a stack underneath the headrail. The glass
// and outside scene remain visible through the opening; no opaque overlay moves.
export function createWindowBlinds(parent,{width=2.72,height=1.62,floor=3,position=[0,0,0],rotationY=0}={}){
  const root=new THREE.Group();root.name=`metal-window-blinds-floor-${floor}`;
  root.position.fromArray(position);root.rotation.y=rotationY;parent.add(root);
  const steel=new THREE.MeshStandardMaterial({color:'#a3aaa7',metalness:.72,roughness:.39,emissive:'#c7d3cf',emissiveIntensity:0});
  const edge=new THREE.MeshStandardMaterial({color:'#56615f',metalness:.55,roughness:.52});
  const cordMaterial=new THREE.MeshStandardMaterial({color:'#cecec1',roughness:.9});
  const box=(w,h,d,x,y,z,material)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;};
  const top=height/2;
  const headrail=box(width+.075,.065,.095,0,top+.03,0,steel);
  for(const side of [-1,1]){
    box(.07,.08,.12,side*(width/2-.12),top+.025,-.01,edge);
    box(.018,.039,.101,side*(width/2+.031),top+.03,0,edge);
  }
  const count=Math.max(12,Math.round(height/.060)),pitch=height/count;
  // Aluminium slats have a shallow pressed bow and thin rolled edges, rather
  // than looking like thick wooden boards when seen from the side.
  const slatGeometry=new THREE.BufferGeometry(),vertices=[],indices=[];
  const sections=6,depth=pitch+.008;
  for(const x of [-width/2,width/2])for(const sign of [-1,1])for(let i=0;i<=sections;i++){
    const t=i/sections*2-1;vertices.push(x,.0015*(1-t*t)+sign*.0007,t*depth/2);
  }
  const row=sections+1,index=(end,side,i)=>end*row*2+side*row+i;
  for(let i=0;i<sections;i++){
    for(const side of [0,1]){
      const a=index(0,side,i),b=index(1,side,i),c=index(1,side,i+1),d=index(0,side,i+1);
      if(side===0)indices.push(a,b,d,b,c,d);else indices.push(a,d,b,b,d,c);
    }
    for(const end of [0,1]){
      const a=index(end,0,i),b=index(end,0,i+1),c=index(end,1,i+1),d=index(end,1,i);
      if(end===0)indices.push(a,b,d,b,c,d);else indices.push(a,d,b,b,d,c);
    }
  }
  for(const i of [0,sections]){
    const a=index(0,0,i),b=index(0,1,i),c=index(1,1,i),d=index(1,0,i);
    if(i===0)indices.push(a,b,d,b,c,d);else indices.push(a,d,b,b,d,c);
  }
  slatGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));slatGeometry.setIndex(indices);slatGeometry.computeVertexNormals();
  const slats=new THREE.InstancedMesh(slatGeometry,steel,count);slats.name='aluminium-louver-slats';
  slats.castShadow=true;slats.receiveShadow=true;slats.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(slats);
  const bottomRail=box(width+.025,.028,.075,0,-top+.005,0,edge);
  // Two tape ladders support the slats. Their vertical cords shorten with the lift.
  const cords=new THREE.InstancedMesh(new THREE.CylinderGeometry(.003,.003,1,6),cordMaterial,4);
  cords.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(cords);
  const pullX=width/2-.055;
  const chainPoints=[];
  for(let i=0;i<52;i++){
    const angle=i/52*Math.PI*2;
    chainPoints.push(new THREE.Vector3(pullX+Math.cos(angle)*.013,top-.31+Math.sin(angle)*.275,.085));
  }
  const chain=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(chainPoints,true),60,.003,5,true),edge);root.add(chain);
  box(.018,.052,.024,pullX,top-.595,.085,edge);
  const matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3(),point=new THREE.Vector3();
  let progress=0,from=0,to=0,started=0,lastTime=0,animating=false;
  const duration=1.35;
  function pose(value){
    // A lifted blind retains a small, physical stack (4 mm between slats).
    const spacing=THREE.MathUtils.lerp(pitch,.0042,value);
    const tilt=THREE.MathUtils.lerp(-Math.PI/2+.13,0,Math.min(1,value*3.2));
    quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),tilt);
    for(let i=0;i<count;i++){
      point.set(0,top-.028-(i+.5)*spacing,0);
      matrix.compose(point,quaternion,scale.set(1,1,1));slats.setMatrixAt(i,matrix);
    }
    slats.instanceMatrix.needsUpdate=true;slats.computeBoundingSphere();
    const bottom=top-.028-count*spacing;
    bottomRail.position.y=bottom;
    const cordLength=Math.max(.02,top-bottom);
    quaternion.identity();
    let n=0;
    for(const x of [-width*.27,width*.27])for(const z of [-.022,.022]){
      matrix.compose(point.set(x,(top+bottom)/2,z),quaternion,scale.set(1,cordLength,1));cords.setMatrixAt(n++,matrix);
    }
    cords.instanceMatrix.needsUpdate=true;cords.computeBoundingSphere();
    root.userData.openFraction=value;
  }
  const target=new THREE.Mesh(new THREE.BoxGeometry(width+.13,height+.14,.15),new THREE.MeshBasicMaterial({visible:false}));
  target.position.z=.075;target.name=`window-blinds-target-${floor}`;root.add(target);
  target.userData={type:'windowBlinds',floor,label:'Открыть жалюзи',isOpen:false,
    toggle(){
      from=progress;to=to===1?0:1;started=lastTime;animating=true;
      this.isOpen=to===1;this.label=this.isOpen?'Закрыть жалюзи':'Открыть жалюзи';
      return this.isOpen;
    },
    setHighlighted(value){steel.emissiveIntensity=value?.10:0;},
    get openFraction(){return progress;}
  };
  function update(time){
    lastTime=Number.isFinite(time)?time:lastTime;
    if(!animating)return;
    const t=THREE.MathUtils.clamp((lastTime-started)/duration,0,1),smooth=t*t*(3-2*t);
    progress=THREE.MathUtils.lerp(from,to,smooth);pose(progress);
    if(t===1)animating=false;
  }
  pose(0);
  return {root,target,update};
}
