import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Modelled furnishings stay inside the lobby shell; the staircase is left untouched.
export function furnishReception(scene,{ground,wood,frame,dark,pipe}){
  const material=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const steel=material('#343c39',.55,.45),agedMetal=material('#646e60',.7,.3),paper=material('#c8bfa6'),red=material('#863b2d',.5,.3);
  function mesh(geometry,mat,x,y,z,parent=scene){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function rounded(w,h,d,x,y,z,mat,parent=scene,r=.012){return mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/4,h/4,d/4)),mat,x,y,z,parent);}
  const cylinder=(r1,r2,h,x,y,z,mat,parent=scene)=>mesh(new THREE.CylinderGeometry(r1,r2,h,24),mat,x,y,z,parent);
  function canvasMap(draw,w=768,h=1024){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d'),w,h);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;}
  function panel(map,w,h,x,y,z,parent=scene){return mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,roughness:.9}),x,y,z,parent);}
  const warm=new THREE.MeshStandardMaterial({color:'#eee3c4',emissive:'#ffe6ac',emissiveIntensity:1.15,roughness:.35});
  // Two fluorescent tubes, end caps, reflectors and mounting brackets per fixture.
  for(const z of [-1.6,2.5,5.2,-5.05]){
    const fixture=new THREE.Group();fixture.position.set(0,ground+2.97,z);scene.add(fixture);
    rounded(1.42,.075,.33,0,0,0,frame,fixture);
    rounded(1.34,.014,.29,0,-.043,0,steel,fixture);
    for(const offset of [-.095,.095]){
      const tube=cylinder(.019,.019,1.23,0,-.064,offset,warm,fixture);tube.rotation.z=Math.PI/2;
      for(const x of [-.63,.63])rounded(.045,.055,.065,x,-.056,offset,frame,fixture);
    }
    for(const x of [-.48,.48])rounded(.08,.04,.12,x,.05,0,steel,fixture);
    const light=new THREE.PointLight(0xffe9be,z<-4?7:9,z<-4?4.3:6,2);light.position.set(0,ground+2.72,z);scene.add(light);
  }
  // Ceiling conduit follows the walls, with elbow sections rather than floating strips.
  for(const x of [-2.72,2.72]){
    pipe([x,ground+2.86,-3.5],[x,ground+2.86,6.45],.022,steel);
    pipe([x,ground+.08,-3.5],[x,ground+2.86,-3.5],.024,steel);
  }
  pipe([-2.72,ground+2.86,-3.5],[2.72,ground+2.86,-3.5],.022,steel);
  // Slatted waiting bench with bent steel supports, wood end grain and screws.
  const bench=new THREE.Group();bench.position.set(-2.56,ground,.8);scene.add(bench);
  for(const x of [-.15,0,.15])rounded(.135,.045,1.8,x,.46,0,wood,bench);
  for(const y of [.74,.93]){const slat=rounded(.05,.17,1.8,-.23,y,0,wood,bench);slat.rotation.z=-.09;}
  for(const z of [-.7,.7]){
    pipe([-.18,.04,z],[-.18,.46,z],.022,steel,bench);pipe([.17,.04,z],[.17,.46,z],.022,steel,bench);
    pipe([-.18,.43,z],[.17,.43,z],.026,steel,bench);pipe([-.18,.43,z],[-.23,1.03,z],.021,steel,bench);
    for(const x of [-.15,.15]){const bolt=cylinder(.007,.007,.006,x,.487,z,agedMetal,bench);bolt.castShadow=false;}
  }
  // Cork notice board with individually pinned, slightly uneven papers.
  const notices=new THREE.Group();notices.position.set(-2.78,ground+1.91,.55);notices.rotation.y=Math.PI/2;scene.add(notices);
  rounded(2.05,1.25,.065,0,0,0,wood,notices);
  rounded(1.94,1.14,.018,0,0,.04,material('#74634a'),notices);
  const headings=['РОЗЫСК','ПРОПАЛ ЧЕЛОВЕК','ОБЪЯВЛЕНИЕ','ОРИЕНТИРОВКА','ПРИЁМ ГРАЖДАН','ИНФОРМАЦИЯ'];
  for(let i=0;i<6;i++){
    const map=canvasMap((ctx,w,h)=>{
      ctx.fillStyle=i%2?'#cbc5b3':'#d7d1be';ctx.fillRect(0,0,w,h);ctx.fillStyle='#35372f';ctx.textAlign='center';ctx.font='bold 48px Arial';ctx.fillText(headings[i],w/2,74);
      if(i===0||i===1||i===3){ctx.fillStyle='#999b90';ctx.fillRect(180,115,408,365);ctx.fillStyle='#484d49';ctx.beginPath();ctx.ellipse(w/2,250,83,107,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(w/2,484,170,140,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#242d29';ctx.fillRect(w/2-49,225,32,9);ctx.fillRect(w/2+17,225,32,9);ctx.fillRect(w/2-22,304,44,7);}
      for(let row=0;row<15;row++){ctx.fillStyle='#6b6e61';ctx.fillRect(55,520+row*27,540+(row%3)*45,4);}
      ctx.strokeStyle='#8c483a';ctx.lineWidth=5;ctx.strokeRect(78,910,610,64);
    });
    const note=panel(map,.51,.48,-.65+(i%3)*.65,.28-Math.floor(i/3)*.54,.055+i*.0007,notices);note.rotation.z=(i%3-1)*.025;
    mesh(new THREE.SphereGeometry(.009,10,8),red,note.position.x,note.position.y+.22,.07,notices);
  }
  // Organic leaves have bent midribs, tapered edges and individually oriented stems.
  const foliage=[material('#334331'),material('#495538'),material('#596143')],soil=material('#292c23'),pot=material('#554b3b');
  function plant(x,z,size=1){
    const group=new THREE.Group();group.position.set(x,ground,z);group.scale.setScalar(size);scene.add(group);
    const profile=[[.13,0],[.15,.025],[.19,.30],[.20,.34],[.18,.35],[.165,.30],[.12,.045]];
    mesh(new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),32),pot,0,0,0,group);
    cylinder(.17,.17,.012,0,.316,0,soil,group);
    pipe([0,.32,0],[.02,1.65,0],.016,wood,group);
    for(let i=0;i<48;i++){
      const angle=i*2.399,h=.48+(i%12)*.105,r=.17+(i%3)*.045;
      const tip=[Math.cos(angle)*r,h+.08,Math.sin(angle)*r];pipe([.01,h-.09,0],tip,.005,wood,group);
      const positions=[],indices=[];
      for(let row=0;row<=8;row++){const t=row/8,width=Math.sin(t*Math.PI)*.068;for(const side of [-1,0,1])positions.push(side*width,Math.sin(t*Math.PI)*.035-t*t*.07,t*.24);}
      for(let row=0;row<8;row++)for(let col=0;col<2;col++){const a=row*3+col,b=a+3;indices.push(a,b,a+1,a+1,b,b+1);}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
      const leafMaterial=foliage[i%3];leafMaterial.side=THREE.DoubleSide;
      const leaf=mesh(geometry,leafMaterial,...tip,group);leaf.rotation.set(-.3+(i%4)*.2,angle,Math.sin(angle)*.35);leaf.scale.setScalar(1.35);
    }
  }
  plant(-2.45,-2.66);plant(2.48,5.95,.8);
  // Ribbed radiator near the plant, with pipe elbows and a valve.
  for(let i=0;i<12;i++)rounded(.105,.57,.12,-2.70,ground+.43,-2.55+i*.067,frame);
  pipe([-2.64,ground+.68,-2.62],[-2.64,ground+.68,-1.7],.02,agedMetal);
  pipe([-2.64,ground+.16,-2.62],[-2.64,ground+.16,-1.7],.02,agedMetal);
  // Tall steel locker: recessed doors, louvres, hinges, legs and latch.
  const locker=new THREE.Group();locker.position.set(2.53,ground,4.7);locker.rotation.y=-Math.PI/2;scene.add(locker);
  rounded(.70,1.88,.42,0,1,0,agedMetal,locker);
  for(const x of [-.17,.17]){
    rounded(.326,1.77,.022,x,1,.224,steel,locker);
    rounded(.30,1.74,.014,x,1,.24,agedMetal,locker);
    for(let i=0;i<5;i++)rounded(.20,.012,.014,x,1.57+i*.045,.252,dark,locker);
    rounded(.018,.13,.025,x+.10,.97,.258,agedMetal,locker);
    rounded(.07,.026,.008,x,1.73,.253,paper,locker);
    for(const y of [.32,1.62])rounded(.014,.08,.023,x-.14,y,.25,steel,locker);
  }
  for(const x of [-.26,.26])for(const z of [-.15,.15])rounded(.05,.07,.05,x,.035,z,steel,locker);
  // Extinguisher, pressure gauge and flexible hose near the stair entrance.
  const extinguisher=new THREE.Group();extinguisher.position.set(2.63,ground+.90,.15);scene.add(extinguisher);
  cylinder(.085,.085,.36,0,.20,0,red,extinguisher);
  mesh(new THREE.SphereGeometry(.086,24,16),red,0,.38,0,extinguisher).scale.y=.55;
  cylinder(.028,.03,.065,0,.44,0,steel,extinguisher);
  rounded(.13,.018,.04,.025,.49,0,steel,extinguisher);
  const hose=new THREE.CatmullRomCurve3([new THREE.Vector3(.035,.45,0),new THREE.Vector3(.15,.40,.02),new THREE.Vector3(.13,.13,.02)]);
  mesh(new THREE.TubeGeometry(hose,24,.009,8,false),dark,0,0,0,extinguisher);
  rounded(.11,.16,.004,-.018,.23,.085,paper,extinguisher);
  // Evacuation plan and booth clock are readable canvas faces on modelled frames.
  const plan=canvasMap((ctx,w,h)=>{ctx.fillStyle='#cbc6b1';ctx.fillRect(0,0,w,h);ctx.fillStyle='#333e32';ctx.font='bold 48px Arial';ctx.fillText('ПЛАН ЭВАКУАЦИИ',75,90);ctx.strokeStyle='#515e4d';ctx.lineWidth=10;ctx.strokeRect(120,190,520,650);for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(120,320+i*125);ctx.lineTo(640,320+i*125);ctx.stroke();}ctx.beginPath();ctx.moveTo(360,190);ctx.lineTo(360,840);ctx.stroke();ctx.strokeStyle='#82453a';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(220,760);ctx.lineTo(460,760);ctx.lineTo(460,260);ctx.stroke();ctx.fillStyle='#386747';ctx.fillRect(420,198,80,45);});
  const planGroup=new THREE.Group();planGroup.position.set(2.80,ground+1.84,3.13);planGroup.rotation.y=-Math.PI/2;scene.add(planGroup);
  rounded(.60,.83,.035,0,0,0,wood,planGroup);panel(plan,.55,.78,0,0,.02,planGroup);
  const clockMap=canvasMap((ctx,w,h)=>{ctx.fillStyle='#c7c6b0';ctx.fillRect(0,0,w,h);ctx.translate(w/2,h/2);ctx.strokeStyle='#323a33';ctx.lineWidth=6;for(let i=0;i<12;i++){ctx.save();ctx.rotate(i*Math.PI/6);ctx.beginPath();ctx.moveTo(0,-w*.39);ctx.lineTo(0,-w*.34);ctx.stroke();ctx.restore();}for(const [angle,length,width]of [[-.1,.23,12],[4.92,.34,7]]){ctx.save();ctx.rotate(angle);ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-w*length);ctx.stroke();ctx.restore();}},512,512);
  const clock=mesh(new THREE.CylinderGeometry(.24,.24,.04,48),steel,.64,ground+2.05,-6.09);clock.rotation.x=Math.PI/2;
  const clockFace=mesh(new THREE.CircleGeometry(.215,48),new THREE.MeshStandardMaterial({map:clockMap,roughness:.7}),.64,ground+2.05,-6.062);
  // Adjustable desk lamp: circular base, articulated stem, metal shade and warm bulb.
  const lamp=new THREE.Group();lamp.position.set(-1.13,ground+1.02,-4.09);scene.add(lamp);
  cylinder(.095,.105,.025,0,.014,0,steel,lamp);
  pipe([0,.025,0],[-.04,.21,-.035],.013,steel,lamp);pipe([-.04,.21,-.035],[.065,.39,.015],.012,steel,lamp);
  const shade=mesh(new THREE.LatheGeometry([[.09,0],[.09,.012],[.062,.063],[.03,.082]].map(([r,y])=>new THREE.Vector2(r,y)),32),steel,.065,.31,.015,lamp);shade.material=steel.clone();shade.material.side=THREE.DoubleSide;
  mesh(new THREE.SphereGeometry(.023,16,12),warm,.065,.323,.015,lamp);
  const deskLight=new THREE.PointLight(0xffd498,1.8,1.8,2);deskLight.position.set(-1.065,ground+1.34,-4.075);scene.add(deskLight);
  // Rear archive shelves and folders bring depth to the booth without covering the NPC.
  const shelves=new THREE.Group();shelves.position.set(1.99,ground,-5.78);scene.add(shelves);
  for(const x of [-.48,.48])rounded(.04,1.98,.37,x,1,0,steel,shelves);
  for(const y of [.20,.73,1.26,1.79]){
    rounded(1,.025,.4,0,y,0,agedMetal,shelves);
    for(let i=0;i<6;i++){const folder=rounded(.10,.32,.26,-.36+i*.135,y+.18,-.02,i%2?paper:wood,shelves);folder.rotation.z=(i%3-1)*.025;rounded(.048,.08,.005,-.36+i*.135,y+.20,.113,paper,shelves);}
  }
  // Low wastebasket, rolled rim and crumpled paperwork by the waiting bench.
  const bin=mesh(new THREE.LatheGeometry([[.12,0],[.14,.02],[.16,.37],[.17,.38],[.16,.40],[.145,.37],[.11,.04]].map(([r,y])=>new THREE.Vector2(r,y)),32),steel,-2.48,ground,2.12);
  for(let i=0;i<5;i++)mesh(new THREE.DodecahedronGeometry(.06,0),paper,-2.48+Math.sin(i*2)*.08,ground+.32+(i%2)*.035,2.12+Math.cos(i*2)*.06);
}
