import * as THREE from 'three';

// Shared batches keep detailed trim inexpensive. Door gaps and stair openings
// are never bridged by rails, skirting or the thin floor border.
export function createCorridorDetails(scene,{floorNumber=2,base=0,xMin=-3,xMax=3,zMin=-17,zMax=7,leftGaps=[],rightGaps=[],materials={}}={}){
  const root=new THREE.Group();root.name=`station-floor-${floorNumber}-architectural-details`;scene.add(root);
  const mat=(color,metalness=0,roughness=.8)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
  const trim=materials.trim??mat(floorNumber===3?'#7d9698':'#66705d'),metal=materials.metal??mat('#929d97',.5,.5);
  const dark=mat('#45524d'),grout=mat(floorNumber===3?'#597b80':'#727e68'),paintChip=mat('#a8a78e'),cream=mat(floorNumber===3?'#c1cecb':'#b7b6a1');
  const batches=new Map(),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new THREE.Vector3(),s=new THREE.Vector3();
  function box(w,h,d,x,y,z,material=trim){
    if(!batches.has(material))batches.set(material,[]);
    matrix.compose(p.set(x,base+y,z),q.identity(),s.set(w,h,d));batches.get(material).push(matrix.clone());
  }
  function spans(gaps){
    const ordered=gaps.map(([a,b])=>[Math.max(zMin,a),Math.min(zMax,b)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
    const result=[];let begin=zMin;
    for(const [a,b]of ordered){if(a>begin)result.push([begin,a]);begin=Math.max(begin,b);}if(begin<zMax)result.push([begin,zMax]);return result;
  }
  for(const [x,side,gaps]of [[xMin,1,leftGaps],[xMax,-1,rightGaps]]){
    for(const [a,b]of spans(gaps)){
      const length=b-a,center=(a+b)/2;
      if(floorNumber===1)box(.022,.12,length,x+side*.094,.06,center,dark);
      box(.024,.018,length,x+side*.112,1.28,center,trim);
      box(.012,.012,length,x+side*.098,1.308,center,cream);
      box(.10,.002,length,x+side*.21,.010,center,grout);
      // Power/data raceway follows the wall above door height.
      box(.035,.043,length,x+side*.098,2.73,center,cream);
      box(.039,.008,length,x+side*.098,2.75,center,trim);
      for(let z=Math.ceil(a/2.4)*2.4;z<b-.1;z+=2.4){
        box(.025,.045,.012,x+side*.109,2.73,z,metal);
        box(.004,1.12,.004,x+side*.100,.68,z,grout);
      }
      if(floorNumber!==3)for(let z=Math.ceil(a/3.7)*3.7;z<b-.22;z+=3.7){
        box(.004,.024,.09,x+side*.099,.185,z,paintChip);
        box(.004,.013,.028,x+side*.100,.224,z+.052,paintChip);
      }
    }
  }
  const gapsForSide=side=>side===1?leftGaps:rightGaps;
  const clear=(z,side)=>!gapsForSide(side).some(([a,b])=>z+.3>a&&z-.3<b);
  function vent(side,z){
    if(!clear(z,side))return;
    const x=side===1?xMin:xMax,face=x+side*.116;
    box(.028,.245,.52,face,2.35,z,metal);box(.032,.192,.458,face+side*.017,2.35,z,dark);
    for(let row=0;row<7;row++)box(.012,.012,.448,face+side*.036,2.272+row*.026,z,cream);
    for(const offset of [-.235,.235])for(const y of [2.245,2.455])box(.009,.01,.012,face+side*.033,y,z+offset,dark);
  }
  vent(1,floorNumber===1?-2.0:-5.8);vent(-1,floorNumber===1?5.9:-13.6);
  const cabinetZ=floorNumber===1?2.98:-15.5,side=-1,x=xMax;
  if(clear(cabinetZ,side)){
    box(.10,.40,.26,x-.155,1.68,cabinetZ,metal);box(.015,.354,.218,x-.212,1.68,cabinetZ,cream);
    box(.021,.055,.017,x-.23,1.68,cabinetZ+.072,dark);box(.014,.79,.014,x-.105,2.155,cabinetZ,metal);
    box(.018,.011,.05,x-.214,1.785,cabinetZ,grout);
  }
  for(const material of batches.keys()){
    const transforms=batches.get(material),mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,transforms.length);
    transforms.forEach((transform,i)=>mesh.setMatrixAt(i,transform));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.receiveShadow=true;root.add(mesh);
  }
  return root;
}
