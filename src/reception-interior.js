import * as THREE from 'three';
import {createCoffeeMachine} from './coffee-machine.js';
import {furnishReceptionDetails} from './reception-details.js';
import {createHoldingCell} from './holding-cell.js';
import {drawNotice,noticePhotosReady} from './notice-art.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Modelled furnishings stay inside the lobby shell; the staircase is left untouched.
export function furnishReception(scene,{ground,wood,frame,dark,pipe,plaque}){
  const material=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const editable=(object,id,label,solid=false)=>{object.userData.editor={id,label,solid,revision:['locker','cooler','radiator','archive-table'].includes(id)?2:1};return object;};
  const steel=material('#343c39',.55,.45),agedMetal=material('#646e60',.7,.3),paper=material('#c8bfa6'),red=material('#863b2d',.5,.3);
  function mesh(geometry,mat,x,y,z,parent=scene){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function rounded(w,h,d,x,y,z,mat,parent=scene,r=.012){return mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/4,h/4,d/4)),mat,x,y,z,parent);}
  const cylinder=(r1,r2,h,x,y,z,mat,parent=scene)=>mesh(new THREE.CylinderGeometry(r1,r2,h,24),mat,x,y,z,parent);
  function canvasMap(draw,w=768,h=1024){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d'),w,h);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;}
  function panel(map,w,h,x,y,z,parent=scene){return mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,roughness:.9}),x,y,z,parent);}
  const warm=new THREE.MeshStandardMaterial({color:'#eee3c4',emissive:'#ffe6ac',emissiveIntensity:1.15,roughness:.35});
  // Two fluorescent tubes, end caps, reflectors and mounting brackets per fixture.
  for(const z of [-1.6,2.5,5.2,-5.05]){
    const fixture=new THREE.Group();fixture.position.set(0,ground+2.97,z);scene.add(fixture);editable(fixture,'lamp-'+z,'Потолочная лампа '+z);
    rounded(1.42,.075,.33,0,0,0,frame,fixture);
    rounded(1.34,.014,.29,0,-.043,0,steel,fixture);
    for(const offset of [-.095,.095]){
      const tube=cylinder(.019,.019,1.23,0,-.064,offset,warm,fixture);tube.rotation.z=Math.PI/2;
      for(const x of [-.63,.63])rounded(.045,.055,.065,x,-.056,offset,frame,fixture);
    }
    for(const x of [-.48,.48])rounded(.08,.04,.12,x,.05,0,steel,fixture);
    const light=new THREE.PointLight(0xffe9be,z<-4?7:9,z<-4?4.3:6,2);light.position.set(0,-.25,0);fixture.add(light);
  }
  // Slatted waiting bench with bent steel supports, wood end grain and screws.
  const bench=new THREE.Group();bench.position.set(-2.56,ground,.8);scene.add(bench);editable(bench,'bench','Скамья',true);
  for(const x of [-.15,0,.15])rounded(.135,.045,1.8,x,.46,0,wood,bench);
  // Backrest boards are attached to a continuous rear frame, not pierced by posts.
  for(const y of [.76,.96])rounded(.045,.17,1.8,-.205,y,0,wood,bench);
  for(const z of [-.70,.70]){
    for(const x of [-.17,.17])pipe([x,.006,z],[x,.43,z],.018,steel,bench);
    pipe([-.23,.43,z],[.19,.43,z],.021,steel,bench);
    pipe([-.25,.43,z],[-.25,1.06,z],.018,steel,bench);
    for(const y of [.76,.96])pipe([-.25,y,z],[-.231,y,z],.010,steel,bench);
    for(const x of [-.15,0,.15]){const bolt=cylinder(.004,.004,.004,x,.4835,z,agedMetal,bench);bolt.castShadow=false;}
  }
  // Cork notice board with individually pinned, slightly uneven papers.
  const notices=new THREE.Group();notices.position.set(-2.78,ground+1.91,.65);notices.rotation.y=Math.PI/2;scene.add(notices);editable(notices,'notices','Доска объявлений',false);
  rounded(2.05,1.25,.065,0,0,0,wood,notices);
  rounded(1.94,1.14,.018,0,0,.04,material('#74634a'),notices);
  const noticeTitle=plaque('ИНФОРМАЦИЯ',1.92,.16,0,.71,.037,notices);
  const noticeTargets=[];
  for(let i=0;i<6;i++){
    const map=canvasMap((ctx,w,h)=>drawNotice(ctx,w,h,i),1024,1280);map.anisotropy=8;noticePhotosReady.then(()=>{drawNotice(map.image.getContext('2d'),1024,1280,i);map.needsUpdate=true;}).catch(()=>{});
    const note=panel(map,.55,.49,-.62+(i%3)*.62,.275-Math.floor(i/3)*.54,.055+i*.0007,notices);note.rotation.z=[-.035,.018,-.023,.027,-.014,.038][i];note.material.emissive.set('#cfac64');note.material.emissiveIntensity=0;note.userData={type:'notice',noticeIndex:i};noticeTargets.push(note);
    mesh(new THREE.SphereGeometry(.009,10,8),red,note.position.x,note.position.y+.23,.07,notices);
  }
  // Organic leaves have bent midribs, tapered edges and individually oriented stems.
  const foliage=[material('#334331'),material('#495538'),material('#596143')],soil=material('#292c23'),pot=material('#554b3b');
  function plant(x,z,size=1){
    const group=new THREE.Group();group.position.set(x,ground,z);group.scale.setScalar(size);scene.add(group);editable(group,'plant-'+x+'-'+z,'Растение',true);
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
  plant(-2.43,-3.08,.90);
  // Cast-iron radiator: separated hollow sections, collectors, brackets and thermostat.
  const radiator=new THREE.Group();radiator.position.set(-2.67,ground,-2.13);scene.add(radiator);editable(radiator,'radiator','Батарея',true);
  const enamel=material('#b8baaa',.52,.12),fittings=material('#827e66',.42,.55);
  for(let i=0;i<12;i++){
    const z=(i-5.5)*.075;
    for(const x of [-.052,.052])rounded(.026,.44,.056,x,.405,z,enamel,radiator);
    for(const y of [.175,.635])rounded(.144,.064,.06,0,y,z,enamel,radiator);
    rounded(.012,.40,.022,.073,.405,z,enamel,radiator);
  }
  for(const y of [.175,.635]){
    pipe([0,y,-.46],[0,y,.46],.023,enamel,radiator);
    for(const z of [-.47,.47]){const nut=cylinder(.033,.033,.035,0,y,z,fittings,radiator);nut.rotation.x=Math.PI/2;}
  }
  for(const z of [-.28,.28]){rounded(.13,.023,.045,-.064,.245,z,steel,radiator);rounded(.015,.11,.045,-.125,.275,z,steel,radiator);}
  pipe([0,.635,.48],[0,.635,.63],.019,fittings,radiator);
  const thermostat=cylinder(.035,.035,.075,0,.635,.665,frame,radiator);thermostat.rotation.x=Math.PI/2;
  for(let i=0;i<16;i++){const angle=i*Math.PI/8;pipe([Math.cos(angle)*.036,.635+Math.sin(angle)*.036,.63],[Math.cos(angle)*.036,.635+Math.sin(angle)*.036,.70],.0025,agedMetal,radiator);}
  // Both supply and return turn into the wall; escutcheons cover the penetrations.
  for(const y of [.175,.635]){
    if(y<.2)pipe([0,y,.48],[0,y,.57],.017,enamel,radiator);
    pipe([0,y,.57],[-.19,y,.57],.017,enamel,radiator);
    const elbow=mesh(new THREE.SphereGeometry(.019,16,12),enamel,0,y,.57,radiator);
    const wallRing=cylinder(.039,.039,.012,-.15,y,.57,enamel,radiator);wallRing.rotation.z=Math.PI/2;
  }
  // Tall steel locker: recessed doors, louvres, hinges, legs and latch.
  const locker=new THREE.Group();locker.position.set(2.53,ground,3.60);locker.rotation.y=-Math.PI/2;scene.add(locker);editable(locker,'locker','Шкаф',true);
  // Complete housing and single door skins: no overlapping panels or protruding tops.
  rounded(.70,2.10,.42,0,1.10,0,agedMetal,locker);
  rounded(.65,2.04,.004,0,1.10,.212,steel,locker);
  for(const x of [-.17,.17]){
    rounded(.31,1.98,.022,x,1.09,.225,agedMetal,locker);
    for(const start of [.22,1.76])for(let i=0;i<5;i++){
      rounded(.20,.010,.003,x,start+i*.045,.238,dark,locker);
      const lip=rounded(.205,.007,.012,x,start+i*.045+.007,.242,agedMetal,locker);lip.rotation.x=.18;
    }
    for(const y of [.91,1.03])rounded(.025,.020,.015,x+.10,y,.244,steel,locker);
    pipe([x+.10,.91,.258],[x+.10,1.03,.258],.008,steel,locker);
    rounded(.07,.026,.007,x,1.69,.240,paper,locker);
    for(const y of [.30,1.85])rounded(.015,.07,.025,x-.15,y,.244,steel,locker);
  }
  for(const x of [-.26,.26])for(const z of [-.15,.15])rounded(.05,.07,.05,x,.035,z,steel,locker);
  // Extinguisher, pressure gauge and flexible hose near the stair entrance.
  const extinguisher=new THREE.Group();extinguisher.position.set(2.63,ground+.90,.15);scene.add(extinguisher);editable(extinguisher,'extinguisher','Огнетушитель',false);
  cylinder(.085,.085,.36,0,.20,0,red,extinguisher);
  mesh(new THREE.SphereGeometry(.086,24,16),red,0,.38,0,extinguisher).scale.y=.55;
  cylinder(.028,.03,.065,0,.44,0,steel,extinguisher);
  rounded(.13,.018,.04,.025,.49,0,steel,extinguisher);
  const hose=new THREE.CatmullRomCurve3([new THREE.Vector3(.035,.45,0),new THREE.Vector3(.15,.40,.02),new THREE.Vector3(.13,.13,.02)]);
  mesh(new THREE.TubeGeometry(hose,24,.009,8,false),dark,0,0,0,extinguisher);
  const labelMap=canvasMap((ctx,w,h)=>{ctx.fillStyle='#d7d3bd';ctx.fillRect(0,0,w,h);ctx.fillStyle='#88372a';ctx.fillRect(0,0,w,110);ctx.fillStyle='#f3edd4';ctx.font='bold 52px Arial';ctx.fillText('ОГНЕТУШИТЕЛЬ',30,78);ctx.fillStyle='#29352e';ctx.font='bold 60px Arial';ctx.fillText('ОП–2',220,208);ctx.font='32px Arial';['1. Снять пломбу','2. Направить на очаг','3. Нажать рычаг'].forEach((text,i)=>ctx.fillText(text,40,300+i*70));for(let i=0;i<5;i++)ctx.fillRect(40,580+i*42,w-80,5);},768,768);
  const curvedLabel=new THREE.Mesh(new THREE.CylinderGeometry(.0856,.0856,.165,48,1,true,-.72,1.44),new THREE.MeshStandardMaterial({map:labelMap,roughness:.8}));curvedLabel.position.y=.235;curvedLabel.rotation.y=-Math.PI/2;extinguisher.add(curvedLabel);
  // Evacuation plan and booth clock are readable canvas faces on modelled frames.
  const plan=canvasMap((ctx,w,h)=>{ctx.fillStyle='#cbc6b1';ctx.fillRect(0,0,w,h);ctx.fillStyle='#333e32';ctx.font='bold 48px Arial';ctx.fillText('ПЛАН ЭВАКУАЦИИ',75,90);ctx.strokeStyle='#515e4d';ctx.lineWidth=10;ctx.strokeRect(120,190,520,650);for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(120,320+i*125);ctx.lineTo(640,320+i*125);ctx.stroke();}ctx.beginPath();ctx.moveTo(360,190);ctx.lineTo(360,840);ctx.stroke();ctx.strokeStyle='#82453a';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(220,760);ctx.lineTo(460,760);ctx.lineTo(460,260);ctx.stroke();ctx.fillStyle='#386747';ctx.fillRect(420,198,80,45);});
  const planGroup=new THREE.Group();planGroup.position.set(2.80,ground+1.84,3.13);planGroup.rotation.y=-Math.PI/2;scene.add(planGroup);editable(planGroup,'evacuation-plan','План эвакуации',false);
  rounded(.60,.83,.035,0,0,0,wood,planGroup);panel(plan,.55,.78,0,0,.02,planGroup);
  const clockMap=canvasMap((ctx,w,h)=>{ctx.fillStyle='#c7c6b0';ctx.fillRect(0,0,w,h);ctx.translate(w/2,h/2);ctx.strokeStyle='#323a33';ctx.lineWidth=6;for(let i=0;i<12;i++){ctx.save();ctx.rotate(i*Math.PI/6);ctx.beginPath();ctx.moveTo(0,-w*.39);ctx.lineTo(0,-w*.34);ctx.stroke();ctx.restore();}for(const [angle,length,width]of [[-.1,.23,12],[4.92,.34,7]]){ctx.save();ctx.rotate(angle);ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-w*length);ctx.stroke();ctx.restore();}},512,512);
  const clock=mesh(new THREE.CylinderGeometry(.24,.24,.04,48),steel,.64,ground+2.05,-6.09);clock.rotation.x=Math.PI/2;
  const clockFace=mesh(new THREE.CircleGeometry(.215,48),new THREE.MeshStandardMaterial({map:clockMap,roughness:.7}),.64,ground+2.05,-6.062);
  // Adjustable desk lamp: circular base, articulated stem, metal shade and warm bulb.
  const lamp=new THREE.Group();lamp.position.set(-1.13,ground+1.02,-3.97);scene.add(lamp);
  cylinder(.095,.105,.025,0,.014,0,steel,lamp);
  pipe([0,.025,0],[-.04,.21,-.035],.013,steel,lamp);pipe([-.04,.21,-.035],[.065,.39,.015],.012,steel,lamp);
  const shade=mesh(new THREE.LatheGeometry([[.09,0],[.09,.012],[.062,.063],[.03,.082]].map(([r,y])=>new THREE.Vector2(r,y)),32),steel,.065,.31,.015,lamp);shade.material=steel.clone();shade.material.side=THREE.DoubleSide;
  mesh(new THREE.SphereGeometry(.023,16,12),warm,.065,.323,.015,lamp);
  const deskLight=new THREE.PointLight(0xffd498,1.8,1.8,2);deskLight.position.set(-1.065,ground+1.34,-4.075);scene.add(deskLight);
  // Fresh coffee on the booth desk, clear of the lamp, paperwork and typing hands.
  const cup=new THREE.Group();cup.position.set(-.76,ground+1.02,-4.22);scene.add(cup);cup.name='duty-coffee';cup.userData.editor={id:'duty-coffee',label:'Кофе дежурного'};
  const ceramic=material('#d1c7ac',.46),coffee=material('#3b261c',.25);
  const cupProfile=[[.029,0],[.033,.004],[.041,.087],[.041,.094],[.036,.094],[.035,.085],[.027,.013],[0,.013]];
  mesh(new THREE.LatheGeometry(cupProfile.map(([r,y])=>new THREE.Vector2(r,y)),32),ceramic,0,0,0,cup);
  const cupHandle=mesh(new THREE.TorusGeometry(.024,.006,8,24),ceramic,-.042,.048,0,cup);cupHandle.rotation.y=Math.PI/2;
  const coffeeSurface=mesh(new THREE.CircleGeometry(.035,32),coffee,0,.083,0,cup);coffeeSurface.rotation.x=-Math.PI/2;
  const steamGroup=new THREE.Group();steamGroup.position.y=.085;cup.add(steamGroup);
  const steam=[];for(let i=0;i<12;i++){const vaporMaterial=new THREE.MeshBasicMaterial({color:'#dfe3d7',transparent:true,opacity:0,depthWrite:false});const puff=mesh(new THREE.SphereGeometry(1,8,6),vaporMaterial,0,0,0,steamGroup);puff.scale.set(.005,.008,.005);puff.castShadow=false;puff.renderOrder=5;puff.name='coffee-steam';steam.push(puff);}
  const updateSteam=time=>steam.forEach((puff,i)=>{const phase=(time*.25+i/12)%1;puff.position.set(Math.sin(time*.65+i)*(.003+phase*.018),phase*.24,Math.cos(time*.5+i)*(.003+phase*.012));const radius=.005+phase*.013;puff.scale.set(radius,radius*1.7,radius);puff.material.opacity=Math.sin(phase*Math.PI)*.15;});
  // Rear archive shelves and folders bring depth to the booth without covering the NPC.
  const shelves=new THREE.Group();shelves.position.set(1.99,ground,-5.78);scene.add(shelves);editable(shelves,'archive-shelves','Архивные полки',false);
  for(const x of [-.48,.48])rounded(.04,1.98,.37,x,1,0,steel,shelves);
  for(const y of [.20,.73,1.26,1.79]){
    rounded(1,.025,.4,0,y,0,agedMetal,shelves);
    for(let i=0;i<6;i++){const folder=rounded(.10,.32,.26,-.36+i*.135,y+.18,-.02,i%2?paper:wood,shelves);folder.rotation.z=(i%3-1)*.025;rounded(.048,.08,.005,-.36+i*.135,y+.20,.113,paper,shelves);}
  }
  // Low wastebasket, rolled rim and crumpled paperwork by the waiting bench.
  const binGroup=new THREE.Group();scene.add(binGroup);editable(binGroup,'bin','Урна',true);
  const bin=mesh(new THREE.LatheGeometry([[.12,0],[.14,.02],[.16,.37],[.17,.38],[.16,.40],[.145,.37],[.11,.04]].map(([r,y])=>new THREE.Vector2(r,y)),32),steel,-2.48,ground,2.12,binGroup);
  for(let i=0;i<5;i++)mesh(new THREE.DodecahedronGeometry(.06,0),paper,-2.48+Math.sin(i*2)*.08,ground+.32+(i%2)*.035,2.12+Math.cos(i*2)*.06,binGroup);
  // Photo layout: cooler at the near left wall, archive table before the stair door.
  const cooler=new THREE.Group();cooler.position.set(-2.48,ground,2.78);cooler.rotation.y=Math.PI/2;scene.add(cooler);editable(cooler,'cooler','Кулер',true);
  const coolerBody=material('#adae9f',.56,.12),water=new THREE.MeshPhysicalMaterial({color:'#356a7b',transparent:true,opacity:.22,roughness:.12,metalness:.04,depthWrite:false});
  rounded(.43,.96,.43,0,.48,0,coolerBody,cooler);
  rounded(.32,.26,.025,0,.73,.224,steel,cooler);rounded(.32,.04,.13,0,.58,.26,steel,cooler);
  for(const x of [-.085,.085]){rounded(.03,.05,.025,x,.77,.249,frame,cooler);rounded(.045,.012,.025,x,.792,.259,x<0?red:material('#315475'),cooler);}
  for(let i=0;i<6;i++)rounded(.31,.009,.003,0,.16+i*.025,.219,steel,cooler);
  rounded(.40,.06,.40,0,1,0,steel,cooler);
  const bottleProfile=[[0,0],[.08,0],[.11,.04],[.145,.09],[.145,.38],[.13,.42],[.07,.47],[.045,.48],[.045,.52]];
  // Inverted water bottle seats its neck in the dispenser socket.
  const bottle=new THREE.Group();bottle.position.set(0,1.55,0);bottle.rotation.x=Math.PI;cooler.add(bottle);
  const bottleShell=mesh(new THREE.LatheGeometry(bottleProfile.map(([r,y])=>new THREE.Vector2(r,y)),40),water,0,0,0,bottle);bottleShell.renderOrder=4;bottleShell.castShadow=false;
  for(const y of [.14,.24,.34])mesh(new THREE.TorusGeometry(.147,.007,8,40),water,0,y,0,bottle).rotation.x=Math.PI/2;
  cylinder(.05,.05,.025,0,.52,0,steel,bottle);
  // Liquid is in the upright cooler coordinates, so the inverted bottle fills from its neck.
  const waterGroup=new THREE.Group();cooler.add(waterGroup);
  const liquidMaterial=new THREE.MeshPhysicalMaterial({color:'#3b8898',transparent:true,opacity:.46,roughness:.16,depthWrite:false,emissive:'#1a4148',emissiveIntensity:.12});
  const liquidProfile=[[0,1.048],[.038,1.048],[.062,1.081],[.108,1.125],[.135,1.176],[.137,1.405]];
  const liquid=mesh(new THREE.LatheGeometry(liquidProfile.map(([r,y])=>new THREE.Vector2(r,y)),32),liquidMaterial,0,0,0,waterGroup);liquid.castShadow=false;liquid.renderOrder=2;liquid.name='cooler-liquid';
  const surface=mesh(new THREE.CircleGeometry(.137,40),liquidMaterial,0,1.405,0,waterGroup);surface.rotation.x=-Math.PI/2;surface.renderOrder=2;surface.castShadow=false;
  const bubbles=[];const bubbleMaterial=new THREE.MeshStandardMaterial({color:'#c9e9e5',transparent:true,opacity:.70,roughness:.18,emissive:'#72b7b9',emissiveIntensity:.25,depthWrite:false});
  for(let i=0;i<9;i++){const bubble=mesh(new THREE.SphereGeometry(.005+(i%3)*.002,12,8),bubbleMaterial,0,1.2,0,waterGroup);bubble.castShadow=false;bubble.renderOrder=3;bubble.name='cooler-bubble';bubbles.push(bubble);}
  const rippleMaterial=new THREE.MeshBasicMaterial({color:'#b5e1df',transparent:true,opacity:.25,depthWrite:false});
  const ripple=mesh(new THREE.TorusGeometry(.125,.0012,4,32),rippleMaterial,0,1.407,0,waterGroup);ripple.rotation.x=Math.PI/2;ripple.renderOrder=3;ripple.castShadow=false;
  const updateWater=time=>{surface.position.y=1.405+Math.sin(time*2.1)*.0012;const wave=(time*.65)%1;ripple.scale.setScalar(.2+wave*.8);rippleMaterial.opacity=(1-wave)*.3;ripple.position.y=surface.position.y+.0015;bubbles.forEach((bubble,i)=>{const phase=(time*.25+i*.113)%1;const radius=.018+(i%3)*.017;bubble.position.set(Math.cos(i*2.4+time*.7)*radius,1.17+phase*.229,Math.sin(i*2.4+time*.6)*radius);bubble.scale.setScalar(Math.sin(phase*Math.PI)*(.7+phase*.5));});};
  const table=new THREE.Group();table.position.set(2.48,ground,-.90);scene.add(table);editable(table,'archive-table','Стол с коробками',true);
  rounded(.55,.055,1.18,0,.64,0,wood,table);
  for(const x of [-.21,.21])for(const z of [-.48,.48])rounded(.035,.60,.035,x,.31,z,steel,table);
  const cardboard=material('#887453'),tape=material('#a79771');
  function archiveBox(x,y,z,w=.30,h=.25,d=.30,parent=scene){
    const group=new THREE.Group();group.position.set(x,y,z);parent.add(group);if(parent===scene)editable(group,'box-'+x+'-'+y+'-'+z,'Архивная коробка',true);
    rounded(w,h,d,0,h/2,0,cardboard,group);rounded(w+.012,.025,d+.012,0,h+.006,0,cardboard,group);
    rounded(.05,.003,d+.01,0,h+.021,0,tape,group);rounded(.082,.022,.004,0,h*.65,d/2+.003,steel,group);
    rounded(.094,.067,.005,0,h*.25,d/2+.004,paper,group);return group;
  }
  archiveBox(0,.67,-.31,.39,.25,.40,table);archiveBox(-.025,.94,-.31,.35,.20,.36,table);
  for(let i=0;i<7;i++){rounded(.37,.019,.25,-.015+i%2*.01,.686+i*.025,.30,i%2?paper:wood,table);}
  archiveBox(.035,0,.20,.34,.30,.30,table);
  archiveBox(-.11,2.15,0,.31,.28,.35,locker);archiveBox(.20,2.15,0,.29,.36,.35,locker);
  archiveBox(2.51,ground,2.92,.34,.35,.34);
  const matGroup=new THREE.Group();matGroup.position.set(2.43,ground+.007,1.905);scene.add(matGroup);
  rounded(.68,.012,1.2,0,0,0,steel,matGroup);
  for(let i=0;i<24;i++)rounded(.63,.005,.016,0,.009,-.56+i*.048,dark,matGroup);
  // CCTV camera, red status light and adjustable mounting arm in the rear corner.
  const camera=new THREE.Group();camera.position.set(-2.48,ground+2.61,-3.28);camera.rotation.set(.20,.75,0);scene.add(camera);editable(camera,'security-camera','Камера наблюдения',false);
  pipe([0,-.15,-.15],[0,-.025,0],.018,steel,camera);
  cylinder(.032,.032,.022,0,-.048,0,steel,camera);
  rounded(.17,.105,.30,0,0,0,frame,camera);rounded(.19,.018,.34,0,.062,.015,frame,camera);
  rounded(.135,.085,.015,0,0,.158,steel,camera);
  const lens=cylinder(.029,.029,.02,-.025,0,.178,dark,camera);lens.rotation.x=Math.PI/2;
  const led=new THREE.MeshStandardMaterial({color:'#bb231c',emissive:'#ee2318',emissiveIntensity:1.6});const recordingLed=mesh(new THREE.SphereGeometry(.006,12,8),led,.047,.025,.171,camera);recordingLed.name='recording-led';
  // Framed awards replace the calendar behind the duty officer.
  for(const [i,x,y,title] of [[0,-1.32,ground+2.05,'ПОЧЁТНАЯ ГРАМОТА'],[1,-.84,ground+1.66,'БЛАГОДАРНОСТЬ']]){
    const award=canvasMap((ctx,w,h)=>{
      ctx.fillStyle='#dfd4b8';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#96784a';ctx.lineWidth=12;ctx.strokeRect(36,36,w-72,h-72);ctx.lineWidth=3;ctx.strokeRect(57,57,w-114,h-114);
      ctx.fillStyle='#8e4837';ctx.textAlign='center';ctx.font='bold 47px Georgia';ctx.fillText(title,w/2,180,w-135);ctx.fillStyle='#343e32';ctx.font='bold 34px Georgia';ctx.fillText('УЧАСТОК № 7',w/2,300);
      ctx.font='30px Georgia';const lines=i?['За помощь жителям района','и преданность службе.','За внимание к людям','в трудную минуту.']:['За добросовестную службу,','профессионализм и вклад','в обеспечение безопасности','нашего города.'];lines.forEach((line,j)=>ctx.fillText(line,w/2,450+j*65,w-130));ctx.fillText(i?'Май 2025':'Декабрь 2024',w/2,840);
      ctx.strokeStyle='#8d473b';ctx.lineWidth=5;ctx.beginPath();ctx.arc(540,855,56,0,7);ctx.stroke();ctx.font='24px Georgia';ctx.fillText('МВД',540,865);ctx.strokeStyle='#393f33';ctx.beginPath();ctx.moveTo(150,850);ctx.bezierCurveTo(220,800,210,920,350,833);ctx.stroke();
    });award.anisotropy=8;rounded(.38,.49,.026,x,y,-6.071,wood);panel(award,.345,.455,x,y,-6.052);
  }
  const wallPanel=new THREE.Group();wallPanel.position.set(-2.79,ground+1.98,-1.37);wallPanel.rotation.y=Math.PI/2;scene.add(wallPanel);editable(wallPanel,'electrical-panel','Электрощиток',false);
  rounded(.24,.46,.065,0,0,0,agedMetal,wallPanel);rounded(.19,.37,.006,0,0,.037,steel,wallPanel);
  rounded(.04,.015,.012,.065,0,.045,frame,wallPanel);
  createCoffeeMachine(scene,{ground,rounded,mesh,panel,canvasMap,pipe});
  // Document piles across the reception counter, clear of the save telephone.
  for(const [x,z,count]of [[-1.15,-4.26,6],[-1.39,-3.35,4],[-.37,-3.33,3]])for(let i=0;i<count;i++){
    rounded(.29,.017,.24,x+(i%2)*.009,ground+1.03+i*.022,z,i%2?paper:wood);
  }
  furnishReceptionDetails(scene,{ground,wood,frame,paper,steel,rounded,mesh,pipe,panel,canvasMap,plaque});
  const holdingCell=createHoldingCell(scene,{ground,wood,plaque});
  return {noticeTargets,update(time){updateSteam(time);updateWater(time);holdingCell.update(time);const on=Math.floor(time*1.25)%2===0;led.emissiveIntensity=on?2.4:0;led.color.set(on?'#e93827':'#421611');}};
}
