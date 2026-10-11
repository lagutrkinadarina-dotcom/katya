import * as THREE from 'three';

// Shared mitered footprints keep adjoining storeys flush at bends.
export function createWallStrip(scene,points,baseY,bands){
  const offsets=points.map(([x,z],i)=>{
    const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
    const before=new THREE.Vector2(x-prev[0],z-prev[1]),after=new THREE.Vector2(next[0]-x,next[1]-z);
    if(before.lengthSq()===0)before.copy(after);if(after.lengthSq()===0)after.copy(before);
    before.normalize();after.normalize();
    const n1=new THREE.Vector2(-before.y,before.x),n2=new THREE.Vector2(-after.y,after.x),direction=n1.clone().add(n2).normalize();
    const offset=direction.multiplyScalar(.08/Math.max(.2,n1.dot(direction)));
    return [[x+offset.x,z+offset.y],[x-offset.x,z-offset.y]];
  });
  const boundary=[...offsets.map(pair=>pair[0]),...offsets.map(pair=>pair[1]).reverse()],footprint=new THREE.Shape();
  boundary.forEach(([x,z],i)=>i?footprint.lineTo(x,-z):footprint.moveTo(x,-z));footprint.closePath();
  const walls=[];let y=baseY;
  for(const [height,material]of bands){
    const geometry=new THREE.ExtrudeGeometry(footprint,{depth:height,steps:1,bevelEnabled:false});
    // Adjacent bands/storeys use the same world-height texture phase at the seam.
    const position=geometry.attributes.position,normal=geometry.attributes.normal,uv=geometry.attributes.uv;
    for(let i=0;i<position.count;i++)if(Math.abs(normal.getZ(i))<.5){
      const horizontal=Math.abs(normal.getX(i))>Math.abs(normal.getY(i))?-position.getY(i):position.getX(i);
      uv.setXY(i,horizontal,1-position.getZ(i)-y);
    }
    uv.needsUpdate=true;
    const wall=new THREE.Mesh(geometry,material);
    wall.rotation.x=-Math.PI/2;wall.position.y=y;wall.castShadow=true;wall.receiveShadow=true;scene.add(wall);walls.push(wall);y+=height;
  }
  return walls;
}

// Box wall bands share a one-metre texture grid with the mitered wall strips.
export function alignWallTexture(mesh){
  mesh.updateMatrixWorld(true);
  const position=mesh.geometry.attributes.position,normal=mesh.geometry.attributes.normal,uv=mesh.geometry.attributes.uv;
  const point=new THREE.Vector3(),direction=new THREE.Vector3(),normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  for(let i=0;i<position.count;i++){
    direction.fromBufferAttribute(normal,i).applyMatrix3(normalMatrix);if(Math.abs(direction.y)>.5)continue;
    point.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);
    uv.setXY(i,Math.abs(direction.x)>Math.abs(direction.z)?point.z:point.x,1-point.y);
  }
  uv.needsUpdate=true;return mesh;
}

// One metre per tile, with a shared world-space grid across separate floor meshes.
export function alignFloorTiles(mesh){
  mesh.updateMatrixWorld(true);
  const position=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv,point=new THREE.Vector3();
  for(let i=0;i<position.count;i++){
    point.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);
    uv.setXY(i,point.x,point.z);
  }
  uv.needsUpdate=true;
  return mesh;
}
