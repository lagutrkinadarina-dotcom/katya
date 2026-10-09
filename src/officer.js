import * as THREE from 'three';

// A local, smoothly sculpted model, with an anatomical face and a tailored uniform.
export function createOfficer(){
  const root=new THREE.Group();
  const mat=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const skin=mat('#bd9475'),cheek=mat('#b88a70'),navy=mat('#27384a'),seam=mat('#34485b'),black=mat('#202529'),shirt=mat('#b4c6ca'),gold=mat('#bda46a',.38,.65),lip=mat('#876457'),white=mat('#ddd8c9'),iris=mat('#53635b');
  function mesh(geometry,material,x,y,z,sx=1,sy=1,sz=1){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;}
  const sphere=new THREE.SphereGeometry(1,32,24);
  const oval=(material,x,y,z,sx,sy,sz)=>mesh(sphere,material,x,y,z,sx,sy,sz);
  function shape(points,material,y,depth=1){const g=new THREE.LatheGeometry(points.map(([r,h])=>new THREE.Vector2(r,h)),48);return mesh(g,material,0,y,0,1,1,depth);}
  function limb(a,b,r1,r2,material){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),dir=end.clone().sub(start),radius=(r1+r2)/2;const m=mesh(new THREE.CapsuleGeometry(radius,Math.max(.01,dir.length()-radius*1.4),8,24),material,...start.clone().add(end).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());return m;}

  for(const side of [-1,1]){
    limb([side*.105,.8,0],[side*.11,.43,.005],.098,.083,navy);
    limb([side*.11,.43,.005],[side*.11,.12,.025],.083,.067,navy);
    oval(black,side*.11,.075,.065,.087,.068,.165);
  }
  shape([[0,0],[.19,.01],[.205,.08],[.205,.22],[.24,.42],[.245,.48],[.18,.55],[.095,.57],[0,.57]],navy,.78,.61);
  oval(skin,0,1.405,0,.076,.1,.07);
  // Jaw, cheeks and skull are one continuous lathed head, rather than a sphere on a box.
  shape([[0,0],[.055,.005],[.087,.027],[.112,.065],[.133,.12],[.141,.2],[.136,.26],[.114,.31],[.065,.34],[0,.35]],skin,1.43,.82);
  for(const side of [-1,1]){
    oval(cheek,side*.138,1.62,.005,.027,.048,.023);
    oval(skin,side*.08,1.579,.052,.026,.036,.022);
    oval(white,side*.059,1.653,.109,.022,.009,.008);
    oval(iris,side*.059,1.653,.119,.007,.008,.004);
    oval(black,side*.059,1.653,.123,.003,.004,.002);
    const brow=oval(black,side*.062,1.682,.11,.027,.004,.006);brow.rotation.z=-side*.09;
    oval(skin,side*.06,1.64,.107,.026,.004,.007);
    limb([side*.225,1.275,0],[side*.28,1.05,.012],.086,.071,navy);
    limb([side*.28,1.05,.012],[side*.24,.87,.13],.071,.054,navy);
    oval(skin,side*.24,.823,.143,.047,.065,.027);
    for(let i=0;i<4;i++)oval(skin,side*.24+(i-1.5)*.018,.805,.153,.009,.035,.013);
    const shoulder=oval(seam,side*.2,1.319,.015,.086,.012,.033);shoulder.rotation.z=side*.12;
    oval(gold,side*.2,1.336,.017,.015,.003,.013);
    oval(gold,side*.115,1.178,.146,.006,.006,.003);
  }
  oval(skin,0,1.634,.116,.014,.033,.014);oval(skin,0,1.605,.136,.018,.011,.015);
  for(const side of [-1,1])oval(cheek,side*.018,1.594,.147,.007,.004,.004);
  oval(lip,0,1.552,.108,.03,.003,.004);oval(skin,0,1.544,.101,.029,.006,.007);
  // Shirt collar and tie use triangular cloth meshes.
  for(const side of [-1,1]){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([side*.014,1.37,.095,side*.09,1.32,.135,side*.027,1.259,.145],3));g.computeVertexNormals();const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:shirt.color,side:THREE.DoubleSide}));root.add(m);
  }
  oval(black,0,1.27,.151,.018,.071,.009);
  for(const y of [1.04,.96,.89])oval(gold,0,y,.137,.009,.009,.006);
  oval(gold,-.12,1.2,.146,.026,.034,.006);
  shape([[.21,0],[.213,.04],[.208,.053]],black,.805,.64);
  // Rounded peaked cap with a separate visor, band and badge.
  shape([[0,0],[.14,0],[.154,.028],[.163,.057],[.13,.079],[0,.087]],navy,1.735,.9);
  shape([[.141,0],[.143,.035]],black,1.736,.86);
  oval(black,0,1.747,.105,.158,.014,.106);oval(gold,0,1.79,.145,.02,.024,.006);
  root.userData.headHeight=1.65;
  return root;
}
