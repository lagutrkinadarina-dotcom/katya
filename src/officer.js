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
    // Closed sleeve ends prevent the background showing through shoulders/cuffs.
    for(const end of [0,count]){
      const p=curve.getPointAt(end/count),center=positions.length/3;positions.push(p.x,p.y,p.z);
      for(let k=0;k<sides;k++){const a=end*(sides+1)+k;indices.push(...(end===0?[center,a+1,a]:[center,a,a+1]));}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return mesh(g,material,0,0,0);
  }

  for(const side of [-1,1]){
    limb([side*.105,.8,0],[side*.11,.43,.005],.098,.083,navy);
    limb([side*.11,.43,.005],[side*.11,.12,.025],.083,.067,navy);
    oval(black,side*.11,.075,.065,.087,.068,.165);
  }
  shape([[0,0],[.19,.01],[.205,.08],[.205,.22],[.24,.42],[.245,.48],[.18,.55],[.095,.57],[0,.57]],navy,.78,.61);
  oval(skin,0,1.39,-.007,.07,.087,.065);
  shape([[.087,0],[.09,.025],[.079,.048]],shirt,1.325,.88);
  // Jaw, cheeks and skull are one continuous lathed head, rather than a sphere on a box.
  shape([[0,0],[.055,.005],[.087,.027],[.112,.065],[.133,.12],[.141,.2],[.136,.26],[.114,.31],[.065,.34],[0,.35]],skin,1.43,.82);
  for(const side of [-1,1]){
    oval(skin,side*.135,1.625,.002,.022,.039,.018);
    oval(skin,side*.08,1.579,.052,.026,.036,.022);
    eyes.push(oval(white,side*.059,1.653,.102,.022,.009,.01));
    eyes.push(oval(iris,side*.059,1.653,.111,.007,.007,.0025));
    eyes.push(oval(black,side*.059,1.653,.113,.003,.004,.0015));
    const brow=oval(black,side*.062,1.679,.102,.024,.0035,.004);brow.rotation.z=-side*.09;
    oval(skin,side*.06,1.642,.105,.024,.004,.006);
    oval(skin,side*.06,1.663,.103,.024,.004,.006);
    oval(navy,side*.182,1.265,.005,.091,.088,.085);
    const arm=new THREE.Group();root.add(arm);arms.push(arm);activeParent=arm;
    sleeve([[side*.172,1.26,0],[side*.25,1.19,.07],[side*.28,1.10,.23],[side*.24,1.095,.39],[side*.20,1.10,.51]],[.09,.083,.069,.058,.043],navy);
    oval(skin,side*.20,1.099,.516,.034,.026,.035);
    oval(skin,side*.20,1.095,.55,.04,.025,.043);
    for(let i=0;i<4;i++)oval(skin,side*.20+(i-1.5)*.016,1.081,.587,.0075,.012,.024);
    activeParent=root;
    const shoulder=oval(seam,side*.185,1.323,.012,.065,.008,.029);shoulder.rotation.z=side*.12;
    oval(gold,side*.185,1.332,.014,.013,.002,.011);
    oval(gold,side*.115,1.178,.146,.006,.006,.003);
  }
  oval(skin,0,1.628,.112,.012,.032,.012);oval(skin,0,1.605,.125,.015,.013,.014);
  for(const side of [-1,1])oval(cheek,side*.012,1.596,.134,.004,.002,.003);
  oval(lip,0,1.552,.110,.025,.0025,.003);oval(skin,0,1.547,.108,.024,.003,.004);
  // Shirt collar and tie use triangular cloth meshes.
  for(const side of [-1,1]){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([side*.014,1.37,.095,side*.09,1.32,.135,side*.027,1.259,.145],3));g.computeVertexNormals();const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:shirt.color,side:THREE.DoubleSide}));root.add(m);
  }
  oval(black,0,1.27,.151,.018,.071,.009);
  for(const y of [1.04,.96,.89])oval(gold,0,y,.137,.009,.009,.006);
  oval(gold,-.12,1.2,.146,.026,.034,.006);
  shape([[.21,0],[.213,.04],[.208,.053]],black,.805,.64);
  // Rounded peaked cap with a separate visor, band and badge.
  shape([[0,0],[.14,0],[.15,.018],[.157,.04],[.154,.059],[.14,.076],[.10,.083],[0,.087]],navy,1.735,.9);
  shape([[.141,0],[.143,.035]],black,1.736,.86);
  oval(black,0,1.747,.091,.146,.011,.085);oval(gold,0,1.79,.145,.02,.024,.006);
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
