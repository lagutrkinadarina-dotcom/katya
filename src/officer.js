import * as THREE from 'three';

// A local, smoothly sculpted model, with an anatomical face and a tailored uniform.
export function createOfficer(){
  const root=new THREE.Group(),head=new THREE.Group(),eyes=[],arms=[];
  head.position.y=1.43;root.add(head);let activeParent=root;
  const mat=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const skin=mat('#bd9475'),cheek=mat('#b88a70'),navy=mat('#27384a'),seam=mat('#34485b'),black=mat('#202529'),shirt=mat('#b4c6ca'),gold=mat('#bda46a',.38,.65),lip=mat('#876457'),white=mat('#ddd8c9'),iris=mat('#53635b');
  function mesh(geometry,material,x,y,z,sx=1,sy=1,sz=1){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;if(y>=1.43){m.position.y-=1.43;head.add(m);}else activeParent.add(m);return m;}
  const sphere=new THREE.SphereGeometry(1,32,24);
  const oval=(material,x,y,z,sx,sy,sz)=>mesh(sphere,material,x,y,z,sx,sy,sz);
  function shape(points,material,y,depth=1){const g=new THREE.LatheGeometry(points.map(([r,h])=>new THREE.Vector2(r,h)),48);return mesh(g,material,0,y,0,1,1,depth);}
  function limb(a,b,r1,r2,material){return sleeve([a,b],[r1,r2],material);}
  function sleeve(points,radii,material){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),count=32,sides=24,frames=curve.computeFrenetFrames(count,false),positions=[],indices=[];
    for(let i=0;i<=count;i++){const t=i/count,p=curve.getPointAt(t),f=t*(radii.length-1),j=Math.min(radii.length-2,Math.floor(f)),r=THREE.MathUtils.lerp(radii[j],radii[j+1],f-j);for(let k=0;k<=sides;k++){const angle=k/sides*Math.PI*2,v=p.clone().addScaledVector(frames.normals[i],Math.cos(angle)*r).addScaledVector(frames.binormals[i],Math.sin(angle)*r);positions.push(v.x,v.y,v.z);}}
    for(let i=0;i<count;i++)for(let k=0;k<sides;k++){const a=i*(sides+1)+k,b=a+sides+1;indices.push(a,a+1,b,b,a+1,b+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return mesh(g,material,0,0,0);
  }

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
    eyes.push(oval(white,side*.059,1.653,.109,.022,.009,.008));
    eyes.push(oval(iris,side*.059,1.653,.119,.007,.008,.004));
    eyes.push(oval(black,side*.059,1.653,.123,.003,.004,.002));
    const brow=oval(black,side*.062,1.682,.11,.027,.004,.006);brow.rotation.z=-side*.09;
    oval(skin,side*.06,1.64,.107,.026,.004,.007);
    const arm=new THREE.Group();root.add(arm);arms.push(arm);activeParent=arm;
    sleeve([[side*.195,1.29,0],[side*.27,1.18,.07],[side*.29,1.08,.23],[side*.24,1.065,.39],[side*.20,1.07,.52]],[.09,.083,.069,.058,.043],navy);
    oval(skin,side*.20,1.06,.55,.045,.025,.055);
    for(let i=0;i<4;i++)oval(skin,side*.20+(i-1.5)*.018,1.047,.592,.008,.012,.03);
    activeParent=root;
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
  const eyeScale=eyes.map(eye=>eye.scale.y);
  root.userData.update=time=>{
    head.rotation.set(.12+Math.sin(time*.7)*.018,.45+Math.sin(time*.45)*.035,Math.sin(time*.6)*.01);
    // Brief eyelid closure, breathing and small alternating typing motions.
    const phase=time%4.7,blink=phase<.16?Math.max(.06,Math.abs(phase-.08)/.08):1;
    eyes.forEach((eye,i)=>eye.scale.y=eyeScale[i]*blink);
    arms.forEach((arm,i)=>arm.position.y=Math.sin(time*7+i*2)*.003);
    root.scale.y=1+Math.sin(time*1.3)*.0015;
  };
  root.userData.headHeight=1.65;
  return root;
}
