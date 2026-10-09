import * as THREE from 'three';
import atlasUrl from './assets/station-materials.png';

const size=512;
const definitions={
  plaster:{cell:[0,0],fallback:'#b6aa91',roughness:.96,relief:.26,repeat:.65},
  paint:{cell:[1,0],fallback:'#344337',roughness:.79,relief:.18,repeat:.65},
  floor:{cell:[2,0],fallback:'#a59c88',roughness:.62,relief:.16,repeat:1},
  wood:{cell:[0,1],fallback:'#5b402a',roughness:.64,relief:.12,repeat:1},
  steel:{cell:[1,1],fallback:'#63685c',roughness:.65,relief:.1,repeat:1},
  enamel:{cell:[2,1],fallback:'#dbd2bc',roughness:.66,relief:.07,repeat:1},
};
const surfaces=new Map();
let atlas;

function canvas(){const c=document.createElement('canvas');c.width=c.height=size;return c;}
function texture(source,repeat,color=false){
  const map=new THREE.CanvasTexture(source);map.wrapS=map.wrapT=THREE.RepeatWrapping;
  map.repeat.setScalar(repeat);map.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
  return map;
}

function drawSurface(surface){
  const {definition:d,albedo,normal,roughness}=surface,ctx=albedo.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle=d.fallback;ctx.fillRect(0,0,size,size);
  if(atlas){
    const w=atlas.naturalWidth/3,h=atlas.naturalHeight/2;
    ctx.drawImage(atlas,d.cell[0]*w+4,d.cell[1]*h+4,w-8,h-8,0,0,size,size);
  }else{
    let seed=937;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<12000;i++){ctx.fillStyle=`rgba(${rand()>.5?'240,230,205':'35,31,24'},${rand()*.09})`;ctx.fillRect(rand()*size,rand()*size,1,surface.kind==='wood'?20+rand()*60:2);}
  }
  // Blend opposite borders symmetrically so a texture can repeat without a seam.
  const pixels=ctx.getImageData(0,0,size,size),data=pixels.data,band=20;
  for(let n=0;n<band;n++)for(let i=0;i<size;i++)for(let channel=0;channel<3;channel++){
    const weight=(1-n/band)*.5,a=(i*size+n)*4+channel,b=(i*size+size-1-n)*4+channel;
    const left=data[a],right=data[b];data[a]=left*(1-weight)+right*weight;data[b]=right*(1-weight)+left*weight;
    const c=(n*size+i)*4+channel,e=((size-1-n)*size+i)*4+channel,top=data[c],bottom=data[e];
    data[c]=top*(1-weight)+bottom*weight;data[e]=bottom*(1-weight)+top*weight;
  }
  ctx.putImageData(pixels,0,0);
  if(surface.kind==='floor'){
    ctx.strokeStyle='#595447';ctx.lineWidth=3;ctx.strokeRect(0,0,size,size);
    ctx.strokeStyle='rgba(222,214,193,.4)';ctx.lineWidth=1;ctx.strokeRect(3,3,size-6,size-6);
  }
  const colors=ctx.getImageData(0,0,size,size).data,height=new Float32Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const p=y*size+x,i=p*4;
    height[p]=(colors[i]*.25+colors[i+1]*.5+colors[i+2]*.25)/255*d.relief;
    if(surface.kind==='floor'){
      const edge=Math.min(x,y,size-1-x,size-1-y);
      height[p]+=.25*Math.min(1,edge/4);
    }
  }
  const nctx=normal.getContext('2d'),rctx=roughness.getContext('2d'),np=nctx.createImageData(size,size),rp=rctx.createImageData(size,size);
  const at=(x,y)=>height[((y+size)%size)*size+(x+size)%size];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4,dx=(at(x-1,y)-at(x+1,y))*2.4,dy=(at(x,y-1)-at(x,y+1))*2.4,len=Math.hypot(dx,dy,1);
    np.data.set([(dx/len*.5+.5)*255,(dy/len*.5+.5)*255,(1/len*.5+.5)*255,255],i);
    const grain=(colors[i]+colors[i+1]+colors[i+2])/765;
    const edge=surface.kind==='floor'&&Math.min(x,y,size-1-x,size-1-y)<3;
    const value=edge?255:THREE.MathUtils.clamp(185+grain*55,0,255);
    rp.data.set([value,value,value,255],i);
  }
  nctx.putImageData(np,0,0);rctx.putImageData(rp,0,0);
  for(const map of [surface.map,surface.normalMap,surface.roughnessMap])map.needsUpdate=true;
}

export const stationMaterialsReady=new Promise(resolve=>{
  const image=new Image();image.onload=()=>{atlas=image;for(const surface of surfaces.values())drawSurface(surface);resolve(true);};
  image.onerror=()=>resolve(false);image.src=atlasUrl;
});

export function surfaceMaps(kind,renderer){
  if(!surfaces.has(kind)){
    const definition=definitions[kind],albedo=canvas(),normal=canvas(),roughness=canvas();
    const surface={kind,definition,albedo,normal,roughness,map:texture(albedo,definition.repeat,true),normalMap:texture(normal,definition.repeat),roughnessMap:texture(roughness,definition.repeat)};
    surfaces.set(kind,surface);drawSurface(surface);
  }
  const surface=surfaces.get(kind);
  if(renderer)for(const map of [surface.map,surface.normalMap,surface.roughnessMap])map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return {map:surface.map,normalMap:surface.normalMap,roughnessMap:surface.roughnessMap};
}

export function surfaceMaterial(kind,options={},renderer){
  const Material=kind==='floor'?THREE.MeshPhysicalMaterial:THREE.MeshStandardMaterial;
  return new Material({...surfaceMaps(kind,renderer),roughness:definitions[kind].roughness,normalScale:new THREE.Vector2(.55,.55),envMapIntensity:.45,...(kind==='floor'?{clearcoat:.18,clearcoatRoughness:.38}:{}),...options});
}

// Wall geometry uses metres, including box faces and the stair landing headers.
export function alignWallSurface(mesh){
  mesh.updateMatrixWorld(true);
  const {position,normal,uv}=mesh.geometry.attributes,point=new THREE.Vector3(),direction=new THREE.Vector3();
  const matrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  for(let i=0;i<position.count;i++){
    point.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);direction.fromBufferAttribute(normal,i).applyMatrix3(matrix);
    const axis=[Math.abs(direction.x),Math.abs(direction.y),Math.abs(direction.z)];
    if(axis[1]>axis[0]&&axis[1]>axis[2])uv.setXY(i,point.x,point.z);
    else uv.setXY(i,axis[0]>axis[2]?point.z:point.x,1-point.y);
  }
  uv.needsUpdate=true;return mesh;
}
