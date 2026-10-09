import * as THREE from 'three';
import {drawNotice} from './notice-art.js';
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
  for(const y of [.74,.93]){const slat=rounded(.05,.17,1.8,-.23,y,0,wood,bench);slat.rotation.z=-.09;}
  for(const z of [-.7,.7]){
    pipe([-.18,.04,z],[-.18,.46,z],.022,steel,bench);pipe([.17,.04,z],[.17,.46,z],.022,steel,bench);
    pipe([-.18,.43,z],[.17,.43,z],.026,steel,bench);pipe([-.18,.43,z],[-.23,1.03,z],.021,steel,bench);
    for(const x of [-.15,.15]){const bolt=cylinder(.007,.007,.006,x,.487,z,agedMetal,bench);bolt.castShadow=false;}
  }
  // Cork notice board with individually pinned, slightly uneven papers.
  const notices=new THREE.Group();notices.position.set(-2.78,ground+1.91,.65);notices.rotation.y=Math.PI/2;scene.add(notices);editable(notices,'notices','Доска объявлений',false);
  rounded(2.05,1.25,.065,0,0,0,wood,notices);
  rounded(1.94,1.14,.018,0,0,.04,material('#74634a'),notices);
  const noticeTitle=plaque('ИНФОРМАЦИЯ',1.92,.16,0,.71,.037,notices);
  for(let i=0;i<6;i++){
    const map=canvasMap((ctx,w,h)=>drawNotice(ctx,w,h,i),1024,1280);map.anisotropy=8;
    const note=panel(map,.55,.49,-.62+(i%3)*.62,.275-Math.floor(i/3)*.54,.055+i*.0007,notices);note.rotation.z=(i%3-1)*.015;
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
  const coolerBody=material('#adae9f',.56,.12),water=new THREE.MeshPhysicalMaterial({color:'#244657',transparent:true,opacity:.62,roughness:.18,metalness:.04});
  rounded(.43,.96,.43,0,.48,0,coolerBody,cooler);
  rounded(.32,.26,.025,0,.73,.224,steel,cooler);rounded(.32,.04,.13,0,.58,.26,steel,cooler);
  for(const x of [-.085,.085]){rounded(.03,.05,.025,x,.77,.249,frame,cooler);rounded(.045,.012,.025,x,.792,.259,x<0?red:material('#315475'),cooler);}
  for(let i=0;i<6;i++)rounded(.31,.009,.003,0,.16+i*.025,.219,steel,cooler);
  rounded(.40,.06,.40,0,1,0,steel,cooler);
  const bottleProfile=[[0,0],[.08,0],[.11,.04],[.145,.09],[.145,.38],[.13,.42],[.07,.47],[.045,.48],[.045,.52]];
  // Inverted water bottle seats its neck in the dispenser socket.
  const bottle=new THREE.Group();bottle.position.set(0,1.55,0);bottle.rotation.x=Math.PI;cooler.add(bottle);
  mesh(new THREE.LatheGeometry(bottleProfile.map(([r,y])=>new THREE.Vector2(r,y)),40),water,0,0,0,bottle);
  for(const y of [.14,.24,.34])mesh(new THREE.TorusGeometry(.147,.007,8,40),water,0,y,0,bottle).rotation.x=Math.PI/2;
  cylinder(.05,.05,.025,0,.52,0,steel,bottle);
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
  pipe([0,-.15,-.15],[0,-.08,0],.018,steel,camera);
  rounded(.17,.105,.30,0,0,0,frame,camera);rounded(.19,.018,.34,0,.062,.015,frame,camera);
  rounded(.135,.085,.015,0,0,.158,steel,camera);
  const lens=cylinder(.029,.029,.02,-.025,0,.178,dark,camera);lens.rotation.x=Math.PI/2;
  const led=new THREE.MeshStandardMaterial({color:'#bb231c',emissive:'#ee2318',emissiveIntensity:1.6});const recordingLed=mesh(new THREE.SphereGeometry(.006,12,8),led,.047,.025,.171,camera);recordingLed.name='recording-led';
  rounded(.14,.32,.10,2.70,ground+2.57,-3.22,steel);
  // Wall calendar behind the officer, electrical panel and public forms.
  const makeCalendarMap=(torn=false)=>canvasMap((ctx,w,h)=>{
    ctx.fillStyle='#e2dbc5';ctx.fillRect(0,0,w,h);ctx.fillStyle='#34413a';ctx.fillRect(0,0,w,140);
    ctx.fillStyle='#f2ebd3';ctx.textAlign='center';ctx.font='bold 78px Arial';ctx.fillText(torn?'СЕНТЯБРЬ':'ОКТЯБРЬ',w/2,103);
    ctx.fillStyle='#30392f';ctx.font='bold 48px Arial';ctx.fillText('2026',w/2,210);
    const days=['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'];ctx.font='bold 30px Arial';days.forEach((day,i)=>ctx.fillText(day,75+i*103,294));
    for(let day=1;day<=(torn?30:31);day++){const cell=day+(torn?0:2),x=75+(cell%7)*103,y=400+Math.floor(cell/7)*109;ctx.fillStyle=(cell%7)>4?'#944739':'#202b24';ctx.font='bold 58px Arial';ctx.fillText(String(day),x,y);
      if(!torn&&(day===9||day===22)){ctx.strokeStyle='#9a3028';ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(x,y-20,41,44,-.13,0,Math.PI*2);ctx.stroke();}}
    // Uneven torn edge and two leftover paper layers under the current page.
    ctx.fillStyle='#b5ab93';ctx.beginPath();ctx.moveTo(0,h);for(let x=0;x<=w;x+=30)ctx.lineTo(x,h-17+(x%90)*.15);ctx.lineTo(w,h);ctx.fill();
  },1024,1280);
  const calendarMap=makeCalendarMap(),tornCalendarMap=makeCalendarMap(true);calendarMap.anisotropy=8;tornCalendarMap.anisotropy=8;
  function calendar(x,y,z,rotation=0,w=.34,h=.47,torn=false){
    const group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=rotation;scene.add(group);
    let page;const map=torn?tornCalendarMap:calendarMap;
    if(torn){
      // Only the top of the sheet remains: the jagged silhouette exposes the wall.
      const shape=new THREE.Shape();shape.moveTo(-w/2,h/2);shape.lineTo(w/2,h/2);
      for(let i=12;i>=0;i--)shape.lineTo(-w/2+w*i/12,h*.02+Math.sin(i*2.3)*h*.07+(i%2)*h*.025);
      shape.closePath();const geometry=new THREE.ShapeGeometry(shape);const positions=geometry.attributes.position;const uv=geometry.attributes.uv;
      for(let i=0;i<positions.count;i++)uv.setXY(i,positions.getX(i)/w+.5,positions.getY(i)/h+.5);
      page=mesh(geometry,new THREE.MeshStandardMaterial({map,roughness:.9,side:THREE.DoubleSide}),0,0,.002,group);
    }else{
      for(let i=0;i<2;i++)rounded(w,h,.001,0,-.003-i*.003,-.003-i*.002,paper,group);
      page=panel(calendarMap,w,h,0,0,.002,group);
    }
    page.material.emissive.set('#c5bfa8');page.material.emissiveMap=map;page.material.emissiveIntensity=.08;
    for(const x of [-w*.26,w*.26])mesh(new THREE.TorusGeometry(.012,.002,6,16),steel,x,h*.49,.004,group);
  }
  calendar(-1.15,ground+1.94,-6.07);
  const wallPanel=new THREE.Group();wallPanel.position.set(-2.79,ground+1.98,-1.37);wallPanel.rotation.y=Math.PI/2;scene.add(wallPanel);editable(wallPanel,'electrical-panel','Электрощиток',false);
  rounded(.24,.46,.065,0,0,0,agedMetal,wallPanel);rounded(.19,.37,.006,0,0,.037,steel,wallPanel);
  rounded(.04,.015,.012,.065,0,.045,frame,wallPanel);
  calendar(2.80,ground+1.82,-2.9,-Math.PI/2,.30,.39,true);
  calendar(2.80,ground+1.82,-2.4,-Math.PI/2,.30,.39);
  // Document piles across the reception counter, clear of the save telephone.
  for(const [x,z,count]of [[-1.15,-4.26,6],[-1.39,-3.35,4],[-.37,-3.33,3]])for(let i=0;i<count;i++){
    rounded(.29,.017,.24,x+(i%2)*.009,ground+1.03+i*.022,z,i%2?paper:wood);
  }
  return {update(time){const on=Math.floor(time*1.25)%2===0;led.emissiveIntensity=on?2.4:0;led.color.set(on?'#e93827':'#421611');}};
}
