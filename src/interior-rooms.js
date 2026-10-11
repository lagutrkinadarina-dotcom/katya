import * as THREE from 'three';
import {rooms} from './rooms.js';
import {FLOOR_BASES} from './building-layout.js';
import {createDetainee} from './detainee.js';
import {createInteriorPropKit} from './interior-props.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStationMaterials} from './station-materials.js';
import {createWindowBlinds} from './window-blinds.js';

const ROOM_WIDTH=8,ROOM_DEPTH=7,ROOM_HEIGHT=3.2,PLAYER_RADIUS=.23;
const ids=['office','interrogation','archive','laboratory','evidenceStorage','morgue'];

/** Real, walkable rooms use the same investigation actions as the old pictures.
 * Their isolated shells let the existing doorway transitions preserve the
 * compact station plan without overlapping the hall or another floor. */
export function createInteriorRooms(scene,{floorBases={}}={}) {
  const result=new Map();
  const visitorChair=new GLTFLoader().loadAsync(import.meta.env.BASE_URL+'assets/station-kit/chair.glb').then(gltf=>gltf.scene);
  const assetCache=new Map();
  function propAsset(name){if(!assetCache.has(name))assetCache.set(name,new GLTFLoader().loadAsync(import.meta.env.BASE_URL+'assets/station-kit/'+name+'.glb').then(g=>g.scene));return assetCache.get(name);}
  for(const [index,id]of ids.entries()) {
    const definition=rooms[id],base=floorBases[id]??floorBases[definition.floor]??(id==='morgue'?-6.565:FLOOR_BASES[definition.floor-1]);
    const group=new THREE.Group();group.name='interior-'+id;group.position.set(50+index*14,base,0);group.visible=false;scene.add(group);
    const k=createInteriorPropKit(group),{m,material,box,rod,cylinder,mesh,label,plane,map}=k;
    const interactables=[],colliders=[],updates=[],readyTasks=[];
    const record={group,spawn:new THREE.Vector3(group.position.x,base+1.65,2.57),yaw:0,interactables,floorHeight:base,name:definition.name,
      walk(x,z){const lx=x-group.position.x,lz=z-group.position.z;return Math.abs(lx)<ROOM_WIDTH/2-.24&&Math.abs(lz)<ROOM_DEPTH/2-.24&&!colliders.some(c=>lx>c[0]-PLAYER_RADIUS&&lx<c[1]+PLAYER_RADIUS&&lz>c[2]-PLAYER_RADIUS&&lz<c[3]+PLAYER_RADIUS);},
      update(time){for(const update of updates)update(time);},
    };
    result.set(id,record);
    function solid(x,z,w,d){colliders.push([x-w/2,x+w/2,z-d/2,z+d/2]);}
    function action(object,actionName,actionLabel,spotIndex){
      const data={type:'roomAction',action:actionName,roomId:id,label:actionLabel,floor:definition.floor};if(spotIndex!==undefined)data.spotIndex=spotIndex;
      if(object.isMesh){object.userData={...object.userData,...data};interactables.push(object);}
      else object.traverse(child=>{if(child.isMesh){child.userData={...child.userData,...data};interactables.push(child);}});
      return object;
    }
    function spot(object,n){return action(object,'roomSpot',definition.spots?.[n]?.[0]??'Рабочий компьютер',n);}
    const clinical=['laboratory','morgue'].includes(id),archive=id==='archive',paintColor=clinical?'#6d8986':id==='interrogation'?'#5b6a61':archive?'#60715e':'#63746c';
    const plasterMap=map((c,W,H)=>{c.fillStyle=clinical?'#c3cdc5':'#b9bdac';c.fillRect(0,0,W,H);let n=73;const random=()=>((n=(n*1664525+1013904223)>>>0)/4294967296);for(let i=0;i<9000;i++){c.fillStyle=random()>.5?'#b5bcaf':'#c9cdbc';c.globalAlpha=.20;c.fillRect(random()*W,random()*H,1+random()*2,1+random()*2);}c.globalAlpha=1;},512,512);plasterMap.wrapS=plasterMap.wrapT=THREE.RepeatWrapping;plasterMap.repeat.set(3,2);
    const stationMaterials=createStationMaterials(clinical?3:definition.floor===3?3:2);
    const plaster=stationMaterials.plaster.clone();plaster.map=plasterMap;const paint=material(paintColor,.80),ceiling=stationMaterials.ceiling;
    const floorMap=map((c,W,H)=>{c.fillStyle=clinical?'#87958f':archive?'#797c6b':'#727d72';c.fillRect(0,0,W,H);let n=43;const random=()=>((n=(n*1664525+1013904223)>>>0)/4294967296);for(let i=0;i<4200;i++){c.fillStyle=random()>.5?'#b4b8a6':'#505d52';c.globalAlpha=.25;c.fillRect(random()*W,random()*H,2+random()*4,2+random()*4);}c.globalAlpha=1;c.strokeStyle='#505f57';c.lineWidth=3;c.strokeRect(0,0,W,H);c.strokeStyle='#a3afa0';c.lineWidth=1;c.strokeRect(4,4,W-8,H-8);},256,256);floorMap.wrapS=floorMap.wrapT=THREE.RepeatWrapping;floorMap.repeat.set(16,14);
    box(8.14,.14,7.14,0,-.08,0,new THREE.MeshStandardMaterial({map:floorMap,roughness:.74}),group,.001);
    box(8.16,.13,7.16,0,ROOM_HEIGHT+.055,0,ceiling,group,.002);
    // The front doorway is a genuine aperture; the return leaf is modelled.
    for(const [x,w]of [[-2.385,3.23],[2.385,3.23]]){box(w,ROOM_HEIGHT,.16,x,ROOM_HEIGHT/2,3.5,plaster,group,.002);box(w,1.14,.17,x,.57,3.483,paint,group,.002);box(w,.06,.025,x,1.17,3.388,m.edge,group,.003);box(w,.11,.055,x,.055,3.371,m.dark,group,.004);}
    box(1.55,.70,.17,0,2.85,3.50,plaster,group,.002);
    for(const x of [-4,4]){box(.16,ROOM_HEIGHT,7.0,x,ROOM_HEIGHT/2,0,plaster,group,.002);box(.172,1.14,7.0,x,.57,0,paint,group,.002);box(.035,.06,6.95,x+(x<0?.098:-.098),1.17,0,m.edge,group,.004);box(.065,.11,6.95,x+(x<0?.109:-.109),.055,0,m.dark,group,.004);}
    const hasWindow=id!=='morgue'&&id!=='evidenceStorage';
    if(hasWindow){
      for(const [x,w]of [[-2.5,3],[2.5,3]])box(w,ROOM_HEIGHT,.16,x,ROOM_HEIGHT/2,-3.5,plaster,group,.002);
      box(2,1.12,.16,0,.56,-3.5,plaster,group,.002);box(2,.44,.16,0,2.98,-3.5,plaster,group,.002);
      const window=k.group(0,1.94,-3.48);window.name='room-window';
      const skyMap=map((c,W,H)=>{const gradient=c.createLinearGradient(0,0,0,H);gradient.addColorStop(0,'#122532');gradient.addColorStop(1,'#354c4f');c.fillStyle=gradient;c.fillRect(0,0,W,H);for(let j=0;j<6;j++){c.fillStyle=j%2?'#263a40':'#223239';const x=j*W/6,y=H*.3+(j%3)*34;c.fillRect(x,y,W*.15,H-y);for(let row=0;row<5;row++)for(let col=0;col<3;col++){c.fillStyle=(j+row+col)%3?'#9c9467':'#455962';c.fillRect(x+12+col*23,y+16+row*33,9,13);}}},512,384);
      plane(skyMap,1.87,1.61,0,0,-.014,window);
      for(const X of [-1,0,1])box(.066,1.74,.12,X,0,.04,m.plastic,window,.004);
      for(const Y of [-.87,0,.87])box(2.07,.058,.12,0,Y,.04,m.plastic,window,.004);
      box(2.22,.065,.34,0,-.91,.1,m.plastic,window,.007);
      k.radiator(0,-3.18);solid(0,-3.2,1.18,.31);
      const blind=createWindowBlinds(window,{width:1.90,height:1.62,position:[0,0,.105],floor:definition.floor});interactables.push(blind.target);updates.push(blind.update);
    }else{box(8,ROOM_HEIGHT,.16,0,ROOM_HEIGHT/2,-3.5,plaster,group,.002);const vent=k.group(0,2.72,-3.405);box(.94,.28,.045,0,0,0,m.metal,vent);for(let j=0;j<8;j++)box(.87,.012,.008,0,-.11+j*.030,.029,m.dark,vent,.001);}
    box(7.94,1.14,.017,0,.57,-3.404,paint,group,.001);box(7.90,.06,.025,0,1.17,-3.386,m.edge,group,.004);box(7.90,.11,.055,0,.055,-3.37,m.dark,group,.004);
    // Door casing, hinges, panelled leaf and a tactile curved lever.
    const exit=k.group(0,0,3.46);exit.name='room-return-door';
    for(const X of [-.77,.77])box(.12,2.53,.17,X,1.265,0,m.edge,exit,.007);box(1.64,.12,.17,0,2.56,0,m.edge,exit,.007);box(1.45,.025,.25,0,.005,-.04,m.metal,exit,.004);
    const leaf=box(1.40,2.42,.085,0,1.23,-.01,clinical?m.metal:m.wood,exit,.008);action(leaf,'leaveRoom','Вернуться в коридор');
    for(const [Y,H]of [[.56,.59],[1.56,1.04]])box(1.15,H,.016,0,Y,-.061,clinical?material('#879995',.54,.3):m.edge,exit,.003);
    rod([.47,1.05,-.081],[.47,1.18,-.081],.020,m.steel,exit);rod([.47,1.16,-.097],[.31,1.16,-.11],.015,m.steel,exit);
    label('В КОРИДОР',.86,.14,0,1.90,-.073,exit).rotation.y=Math.PI;
    for(const Y of [.38,2.11])cylinder(.024,.024,.075,-.705,Y,-.024,m.metal,exit);
    label(definition.name.toUpperCase(),1.74,.22,0,2.89,3.37).rotation.y=Math.PI;
    // Each fixture has a reflector, diffuser, real tubes and mounting brackets.
    const luminous=material(clinical?'#deefe2':'#f0e8cf',.35);luminous.emissive=new THREE.Color(clinical?'#cce9dc':'#f0e0bd');luminous.emissiveIntensity=.65;
    for(const z of [-1.95,1.25]){const fixture=k.group(0,3.05,z);box(1.52,.075,.36,0,0,0,m.metal,fixture,.006);box(1.45,.018,.31,0,-.047,0,m.plastic,fixture,.004);for(const Z of [-.087,.087]){const tube=cylinder(.019,.019,1.31,0,-.070,Z,luminous,fixture);tube.rotation.z=Math.PI/2;for(const X of [-.68,.68])box(.055,.065,.07,X,-.058,Z,m.plastic,fixture,.003);}const light=new THREE.PointLight(clinical?0xd5eee5:0xffe8bd,16,7.3,2);light.position.set(0,-.23,0);fixture.add(light);}
    // Surface-mounted electrical routes, outlets and light switches finish joins.
    box(.03,2.25,.025,-3.887,1.145,2.85,m.plastic,group,.003);box(.035,.15,.10,-3.874,1.04,2.85,m.plastic,group,.004);
    for(const x of [-3.2,2.8]){box(.15,.105,.018,x,.33,-3.392,m.plastic,group,.003);for(const X of [-.031,.031]){box(.009,.018,.003,x+X,.333,-3.379,m.dark,group,.001);}}
    const clock=k.wallClock(id==='morgue'?-1.30:['office','archive'].includes(id)?-3.1:2.75,id==='morgue'?2.20:['office','archive'].includes(id)?2.56:2.38,-3.39);if(id==='interrogation')clock.name='interrogation-clock';
    // Place key furniture with a clear aisle from the spawn to every hotspot.
    if(id==='office')furnishOffice();
    if(id==='interrogation')furnishInterrogation();
    if(id==='archive')furnishArchive();
    if(id==='laboratory')furnishLaboratory();
    if(id==='evidenceStorage')furnishEvidence();
    if(id==='morgue')furnishMorgue();
    record.ready=Promise.all(readyTasks).then(()=>{if(id==='archive'||id==='evidenceStorage')batchStationProps(group,interactables);return record;});
    group.updateMatrixWorld(true);
    if(!record.walk(record.spawn.x,record.spawn.z))throw new Error('Interior spawn obstructed: '+id);

    function board(x,y,z,title='ДЕЛО 041 · ПОСЛЕДНИЙ РАУНД'){
      const g=k.group(x,y,z);box(1.92,1.21,.055,0,0,0,m.wood,g,.008);box(1.82,1.11,.018,0,0,.04,material('#857657'),g,.002);
      label(title,1.73,.105,0,.474,.054,g,{bg:'#857657',fg:'#ded9bc',border:false});
      const points=[[-.65,.17],[-.10,.20],[.50,.11],[-.48,-.26],[.20,-.24]];
      for(const [i,[X,Y]]of points.entries()){const note=plane(map((c,W,H)=>{c.fillStyle='#d8d4ba';c.fillRect(0,0,W,H);c.fillStyle='#46544c';c.font='bold 24px Arial';c.fillText(['ГРОМОВ','ДОСТУП','КЛУБ «РИНГ»','21:58 → 22:11','ВРЕМЯ: 22:06'][i],15,36,W-30);for(let line=0;line<6;line++)c.fillRect(16,70+line*21,W-38-(line%3)*20,3);},256,320),.30,.34,X,Y,.059+i*.0007,g);note.rotation.z=(i%2?.035:-.025);cylinder(.006,.006,.008,X,Y+.15,.069+i*.0007,m.red,g).rotation.x=Math.PI/2;}
      for(const [a,b]of [[0,1],[1,2],[1,3],[2,4],[3,4]])rod([...points[a],.075],[...points[b],.075],.0025,m.red,g);
      return g;
    }
    function tray(x,y,z,host=group,{medical=false}={}){const g=k.group(x,y,z,host);box(.36,.021,.25,0,0,0,medical?m.steel:m.metal,g,.007);for(const X of [-.177,.177])box(.013,.035,.25,X,.024,0,medical?m.steel:m.metal,g,.004);for(const Z of [-.122,.122])box(.36,.035,.013,0,.024,Z,medical?m.steel:m.metal,g,.004);return g;}
    function bench(x,z,w=2,d=.7){const g=k.desk(x,z,w,d,group,0,{metal:true,drawers:false});box(w-.06,.022,d-.04,0,.81,0,material('#c1cdc4',.44,.4),g,.008);return g;}
    function wallPoster(x,y,z,title,lines=[]){const g=k.group(x,y,z);box(.62,.86,.022,0,0,0,m.metal,g,.003);const t=map((c,W,H)=>{c.fillStyle='#d9ddca';c.fillRect(0,0,W,H);c.fillStyle='#395c57';c.font='bold 28px Arial';c.fillText(title,25,55,W-50);c.lineWidth=3;c.strokeStyle='#7a8c7d';c.strokeRect(25,79,W-50,H-104);c.font='21px Arial';lines.forEach((line,i)=>c.fillText(line,40,130+i*53,W-80));},512,640);plane(t,.57,.81,0,0,.015,g);return g;}
    function upholsteredChair(x,z,yaw=Math.PI){
      const placeholder=k.chair(x,z,group,yaw,{padded:true});
      readyTasks.push(visitorChair.then(source=>{const model=source.clone(true);model.name='cc0-wayfair-visitor-chair';model.position.set(x,0,z);model.rotation.y=yaw;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});group.add(model);placeholder.visible=false;}).catch(error=>console.error('CC0 visitor chair load failed',error)));
      solid(x,z,.95,.65);
    }
    function kayProp(name,x,y,z,height,host=group,yaw=0){
      readyTasks.push(propAsset(name).then(source=>{const model=source.clone(true),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());model.scale.setScalar(height/size.y);model.position.set(x,y,z);model.rotation.y=yaw;model.name='cc0-kaykit-'+name;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});host.add(model);}));
    }
    function furnishOffice(){
      const desk=k.desk(-.90,-.87,2.16,.93);solid(-.90,-.87,2.16,.93);k.computer(-.55,.821,-.11,desk,'ДЕЛО № 041');k.lamp(.82,.825,-.14,desk);
      action(k.folder(-.08,.827,.24,desk),'folder','Папка дела · Последний раунд');action(k.phone(.77,.827,.25,desk),'phone','Телефон · запросить экспертизу');k.paper(-.70,.825,.26,desk,{title:'ЖУРНАЛ СЛЕДСТВИЯ',rotation:.03});
      k.chair(-.90,-1.73,group,0,{padded:true});solid(-.9,-1.73,.48,.50);upholsteredChair(-.60,.10);
      action(board(2.45,1.92,-3.39),'board','Доска улик · журнал доступа');
      k.cabinet(-3.36,-2.98,group,{w:.88,h:1.70,d:.56,drawers:true});solid(-3.36,-2.98,.88,.56);
      k.shelf(-3.62,-.9,group,{w:1.35,h:2.12,yaw:Math.PI/2});solid(-3.62,-.90,.45,1.35);
      k.bin(-1.96,-1.47);solid(-1.96,-1.47,.3,.3);
      const side=k.desk(2.56,1.44,1.50,.55,group,0,{drawers:false});solid(2.56,1.44,1.5,.55);for(let i=0;i<3;i++)k.folder(-.38+i*.14,.83+i*.012,-.025,side,'АРХИВ '+(12+i));kayProp('plant',.51,.827,0,.43,side);kayProp('framed-photo',-.54,.827,-.11,.23,side);kayProp('books',.14,.827,-.04,.115,side);kayProp('standing-lamp',2.99,0,-2.67,1.75);solid(2.99,-2.67,.70,.70);
      wallPoster(-2.15,1.90,-3.391,'ПЛАН РАССЛЕДОВАНИЯ',['01 · Изучить материалы','02 · Проверить алиби','03 · Запросить эксперта','04 · Сопоставить следы','Не спешить с выводами']);
      const mug=cylinder(.034,.03,.09,-1.00,.873,-1.07,m.plastic);cylinder(.029,.029,.004,-1.00,.920,-1.07,material('#3d352b'));mesh(new THREE.TorusGeometry(.027,.005,8,18),m.plastic,-.960,.88,-1.07).rotation.y=Math.PI/2;
    }
    function furnishInterrogation(){
      const table=k.desk(0,-.15,2.28,.94,group,0,{drawers:false});solid(0,-.15,2.28,.94);box(2.08,.035,.85,0,.822,0,material('#9a9381'),table,.015);
      const suspectChair=k.chair(0,-1.11,group,0);suspectChair.position.y=-.0175;solid(0,-1.11,.48,.52);upholsteredChair(.28,.94);
      const protocol=k.paper(-.54,.846,.18,table,{title:'ПРОТОКОЛ ДОПРОСА'});action(protocol,'suspect','Протокол допроса');
      action(k.folder(.73,.85,.13,table),'board','Материалы дела');rod([-.37,.852,.07],[-.29,.852,.22],.004,m.blue,table);
      const recorder=k.group(-.72,.85,-.25,table);box(.20,.05,.13,0,.025,0,m.black,recorder,.008);box(.13,.025,.002,-.005,.036,.067,m.metal,recorder,.003);for(let j=0;j<4;j++)box(.018,.007,.026,-.071+j*.037,.054,.035,m.paper,recorder,.002);cylinder(.005,.005,.004,.079,.056,-.025,m.red,recorder);
      for(const sign of [-1,1]){
        const glove=k.group(sign*.16,.840,-.24,table,sign*.13);glove.name='sokolova-red-boxing-glove';
        const redLeather=material('#a7352c',.51),seam=material('#e3bd95');
        box(.146,.085,.183,0,.043,-.02,redLeather,glove,.038);box(.115,.056,.093,0,.030,.114,redLeather,glove,.016);box(.075,.022,.037,0,.069,.10,m.dark,glove,.006);
        for(let j=0;j<4;j++){const bump=mesh(new THREE.SphereGeometry(.034,14,10),redLeather,(j-1.5)*.032,.052,-.094,glove);bump.scale.set(.9,.83,.87);}
        const thumb=mesh(new THREE.SphereGeometry(.041,16,12),redLeather,sign*.078,.040,.004,glove);thumb.scale.set(.78,.68,1.45);
        const stitching=new THREE.CatmullRomCurve3([new THREE.Vector3(-.054,.028,.14),new THREE.Vector3(-.054,.057,.06),new THREE.Vector3(-.043,.078,-.02),new THREE.Vector3(.037,.078,-.05),new THREE.Vector3(.058,.029,-.07)]);mesh(new THREE.TubeGeometry(stitching,23,.0017,5,false),seam,0,0,0,glove);
        const mark=label('РИНГ',.060,.035,0,.087,-.010,glove,{bg:'#ece2c9',fg:'#96372d',border:false});mark.rotation.x=-Math.PI/2;
      }
      const woman=createDetainee('woman',4);woman.name='marina-sokolova';woman.position.set(0,0,-1.1);group.add(woman);updates.push(time=>woman.userData.update(time));
      readyTasks.push(woman.ready.then(()=>{
        woman.traverse(o=>{if(!o.isMesh)return;const name=o.name.toLowerCase();if(/hair/.test(name)){const list=Array.isArray(o.material)?o.material:[o.material];o.material=list.map(mat=>{const c=mat.clone();c.color.set('#302428');return c;});if(!Array.isArray(o.material)||o.material.length===1)o.material=o.material[0];}if(/blouse|sleeve|bodice|skirt|dress|shirt|denim|cuff|knot|collar|pocket|waist-tie|front-button/.test(name)){const list=Array.isArray(o.material)?o.material:[o.material];o.material=list.map(mat=>{const c=mat.clone();c.color.set(/skirt|bodice|dress/.test(name)?'#57486c':'#6c5589');return c;});if(o.material.length===1)o.material=o.material[0];}});
        // Training shoes belong to this NPC only. Fit their uppers around the
        // existing weighted feet and attach to the original foot joints.
        woman.userData.update(2);woman.updateMatrixWorld(true);
        for(const side of ['L','R']){
          const foot=woman.userData.bones.get('foot.'+side),bounds=new THREE.Box3();
          woman.traverse(o=>{if(!o.isSkinnedMesh)return;o.skeleton.update();const indices=o.geometry.attributes.skinIndex,weights=o.geometry.attributes.skinWeight;for(let v=0;v<indices.count;v++){let amount=0;for(let component=0;component<4;component++){let bone=o.skeleton.bones[indices.getComponent(v,component)];while(bone&&bone!==foot)bone=bone.parent;if(bone===foot)amount+=weights.getComponent(v,component);}if(amount<.72)continue;const point=o.getVertexPosition(v,new THREE.Vector3());o.localToWorld(point);woman.worldToLocal(point);bounds.expandByPoint(point);}});
          if(bounds.isEmpty())throw new Error('Interrogation foot geometry missing: '+side);
          const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),w=size.x+.019,d=size.z+.03;
          const shoe=k.group(center.x,bounds.min.y-.010,center.z,woman);shoe.name='sokolova-training-shoe-'+side;
          box(w,.024,d,0,.012,0,m.paper,shoe,.018);box(w*.96,.033,d*.98,0,.034,0,material('#474851'),shoe,.020);box(w*.94,Math.max(.069,size.y*.64),d*.68,0,.085,d*.145,material('#514762'),shoe,.029);box(w*.94,Math.max(.12,size.y+.006),d*.42,0,.08,-d*.28,material('#514762'),shoe,.033);
          for(let line=0;line<4;line++){const Z=-d*.09+line*.025;rod([-w*.29,.134-line*.008,Z],[w*.29,.134-line*.008,Z+.014],.003,m.paper,shoe);}
          box(w*.82,.027,.021,0,.141,-d*.41,m.paper,shoe,.008);woman.updateMatrixWorld(true);foot.attach(shoe);
          const bindingPosition=shoe.position.clone();
          // Preserve the original IK rig. A small sole clearance correction
          // absorbs the source ankle's idle drift without stretching a limb.
          updates.push(()=>{shoe.position.copy(bindingPosition);shoe.updateWorldMatrix(true,true);const minimum=new THREE.Box3().setFromObject(shoe).min.y,delta=group.position.y+.002-minimum;const origin=foot.getWorldPosition(new THREE.Vector3()),raised=origin.clone().add(new THREE.Vector3(0,delta,0));const adjustment=foot.worldToLocal(raised).sub(foot.worldToLocal(origin));shoe.position.add(adjustment);});
        }
        action(woman,'suspect','Допросить Марину Соколову');
      }));
      // Wall-mounted interview camera, sealed mirror, observation speaker.
      const cameraMount=k.group(-3.75,2.61,-3.17,group,.70);box(.16,.10,.25,0,0,0,m.plastic,cameraMount,.018);cylinder(.039,.039,.014,0,0,.134,m.black,cameraMount).rotation.x=Math.PI/2;rod([0,-.04,-.08],[0,-.14,-.08],.023,m.metal,cameraMount);box(.15,.018,.12,0,-.15,-.085,m.metal,cameraMount,.005);
      const mirror=k.group(3.889,1.96,-.8,group,-Math.PI/2);box(1.65,.96,.035,0,0,0,m.metal,mirror,.009);box(1.56,.87,.008,0,0,.022,material('#4f6364',.17,.52),mirror,.004);
      label('ВЕДЁТСЯ ЗАПИСЬ',.98,.11,0,.65,.045,mirror,{bg:'#253630',fg:'#c5c8b6'});
      wallPoster(-2.5,1.91,-3.391,'ПРАВА И ОБЯЗАННОСТИ',['Сохраняйте спокойствие','Показания фиксируются','Вы вправе пригласить','защитника','']);
      k.bin(2.91,-2.87);solid(2.91,-2.87,.31,.31);
    }
    function furnishArchive(){
      for(const x of [-3.60,3.60])for(const [j,z]of [-2.51,-.85,.82].entries()){const left=x<0;k.shelf(x,z,group,{w:1.48,h:2.37,d:.43,yaw:left?Math.PI/2:-Math.PI/2,row:j+(left?0:3)});solid(x,z,.50,1.49);}
      const desk=k.desk(0,-.30,1.88,.90);solid(0,-.30,1.88,.90);k.chair(0,-1.1);solid(0,-1.1,.48,.48);
      spot(k.paper(-.27,.827,.22,desk,{title:'ЖУРНАЛ ВЫДАЧИ ДЕЛ',w:.32,d:.35}),0);k.lamp(.66,.827,-.10,desk);k.folder(.55,.825,.23,desk,'КЛУБ «РИНГ»');for(let i=0;i<4;i++)k.paper(-.65,.827+i*.007,-.05,desk,{title:'РЕЕСТР / '+(i+1),rotation:.03*i,w:.24,d:.31});
      const cards=k.cabinet(-2.71,-3.13,group,{w:1.08,h:1.81,d:.57,drawers:true});spot(cards,1);solid(-2.71,-3.13,1.08,.57);
      const mapBoard=k.group(2.59,1.85,-3.389);box(1.92,1.24,.042,0,0,0,m.wood,mapBoard,.007);
      const chart=map((c,W,H)=>{c.fillStyle='#d6d2b5';c.fillRect(0,0,W,H);c.strokeStyle='#778d78';c.lineWidth=12;for(let i=0;i<5;i++){c.beginPath();c.moveTo(0,80+i*85);c.lineTo(W,115+i*85);c.stroke();}for(let i=0;i<7;i++){c.beginPath();c.moveTo(60+i*120,0);c.lineTo(20+i*120,H);c.stroke();}c.fillStyle='#9ca991';for(let j=0;j<12;j++)c.fillRect(72+(j%4)*210,30+Math.floor(j/4)*140,105,70);c.strokeStyle='#a94638';c.lineWidth=4;c.beginPath();c.moveTo(135,95);c.lineTo(580,350);c.lineTo(730,140);c.stroke();c.fillStyle='#354b42';c.font='bold 32px Arial';c.fillText('КЛУБ «РИНГ»',60,110);c.fillText('РЕДАКЦИЯ',620,95);c.fillText('ВОКЗАЛ',530,430);},1024,640);plane(chart,1.81,1.13,0,0,.026,mapBoard);spot(mapBoard,2);
      label('ДЕЛА ХРАНЯТСЯ ПО ГОДАМ',1.74,.15,0,2.62,-3.38);k.bin(-1.26,-.73);solid(-1.26,-.73,.3,.3);
      const step=k.group(2.72,0,1.90);for(const X of [-.22,.22])for(const Z of [-.19,.19])rod([X,.02,Z],[X*.80,.55,Z*.80],.018,m.metal,step);box(.48,.043,.42,0,.32,0,m.wood,step,.006);box(.38,.043,.33,0,.56,0,m.wood,step,.006);solid(2.72,1.90,.50,.44);
    }
    function furnishLaboratory(){
      const work=bench(-1.34,-1.31,2.98,.75);solid(-1.34,-1.31,2.98,.75);
      const microscope=k.group(-.58,.84,.005,work);box(.31,.027,.26,0,0,0,m.plastic,microscope,.03);const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.075,.027,-.055),new THREE.Vector3(-.105,.19,-.075),new THREE.Vector3(-.09,.41,-.055),new THREE.Vector3(.025,.49,.008)]);mesh(new THREE.TubeGeometry(curve,22,.028,10,false),m.plastic,0,0,0,microscope);box(.21,.025,.15,.043,.18,.042,m.black,microscope,.005);cylinder(.024,.024,.079,.043,.235,.022,m.steel,microscope);const head=cylinder(.035,.038,.20,.055,.375,.052,m.plastic,microscope);head.rotation.x=.25;for(const X of [.027,.083]){const eyepiece=cylinder(.016,.016,.078,X,.477,.041,m.black,microscope);eyepiece.rotation.x=.30;}for(const X of [-.071,.122]){cylinder(.024,.024,.037,X,.225,-.016,m.black,microscope).rotation.z=Math.PI/2;}spot(microscope,0);
      const samples=tray(.53,.84,.035,work,{medical:true});for(let j=0;j<6;j++){const vial=k.group(-.11+(j%3)*.095,.012,Math.floor(j/3)*.10-.056,samples);cylinder(.019,.019,.087,0,.043,0,m.glass,vial);cylinder(.023,.023,.020,0,.096,0,j%2?m.blue:m.red,vial);box(.022,.036,.002,0,.04,.020,m.paper,vial,.001);}spot(samples,1);
      const terminal=bench(2.90,-2.01,1.70,.66);solid(2.90,-2.01,1.70,.66);spot(k.computer(-.12,.845,0,terminal,'ЭКСПЕРТИЗА · ЗАПРОСЫ'),2);k.chair(2.77,-1.07);solid(2.77,-1.07,.50,.50);
      for(const X of [-2.64,-1.78]){k.cabinet(X,-3.13,group,{w:.78,h:1.94,d:.55,glass:true});solid(X,-3.13,.78,.55);}
      const fume=k.group(-3.5,0,.72,group,Math.PI/2);box(1.44,.76,.60,0,.42,0,m.plastic,fume);box(1.49,.065,.69,0,.84,.02,m.steel,fume);box(1.43,.14,.56,0,1.85,0,m.plastic,fume);for(const X of [-.68,.68])box(.07,.95,.54,X,1.36,0,m.metal,fume);box(1.30,.79,.019,0,1.34,.28,m.glass,fume,.002);for(let j=0;j<7;j++)box(.84,.012,.004,0,1.84-j*.023,.285,m.dark,fume,.001);label('ВЫТЯЖНОЙ ШКАФ',1.14,.09,0,1.855,.296,fume);solid(-3.50,.72,.66,1.5);
      const sink=bench(2.75,.81,1.58,.67);solid(2.75,.81,1.58,.67);box(.48,.055,.38,0,.832,0,m.steel,sink,.025);box(.39,.017,.29,0,.838,0,m.dark,sink,.02);rod([-.12,.83,-.17],[-.12,1.10,-.17],.012,m.steel,sink);rod([-.12,1.10,-.17],[.025,1.10,-.17],.012,m.steel,sink);rod([.025,1.10,-.17],[.025,1.04,-.17],.012,m.steel,sink);cylinder(.012,.015,.05,.30,.855,-.11,m.blue,sink);label('МОЙКА',.33,.07,.49,1.12,-.12,sink);
      wallPoster(1.57,1.86,-3.39,'ПРАВИЛА ЛАБОРАТОРИИ',['Перчатки обязательны','Один образец за раз','Чистая рабочая зона','Вскрытие по журналу','Утилизируйте расходники']);
      k.bin(1.90,.89,group,{medical:true});solid(1.90,.89,.30,.30);
    }
    function furnishEvidence(){
      for(const X of [-3.61,3.61])for(const [j,Z]of [-2.40,-.70,.98].entries()){const rack=k.shelf(X,Z,group,{w:1.45,h:2.28,d:.47,yaw:X<0?Math.PI/2:-Math.PI/2,kind:'evidence',row:j+(X<0?0:3)});if(j===1)spot(rack,2);solid(X,Z,.55,1.47);
        // Wire-mesh security fronts have real perimeter frames and sparse rods.
        const gate=k.group(0,0,.265,rack);for(const x of [-.75,.75])box(.029,2.24,.024,x,1.17,0,m.metal,gate,.003);for(const y of [.07,2.27])box(1.50,.028,.024,0,y,0,m.metal,gate,.003);for(let x=-.68;x<.7;x+=.115)rod([x,.10,.01],[x,2.24,.01],.003,m.metal,gate);for(let y=.18;y<2.2;y+=.13)rod([-.71,y,.015],[.71,y,.015],.003,m.metal,gate);box(.045,.13,.03,.64,1.15,.025,m.dark,gate,.008);
      }
      const desk=k.desk(0,-1.0,1.92,.85,group,0,{metal:true});solid(0,-1,1.92,.85);spot(k.paper(-.47,.831,.21,desk,{title:'ЖУРНАЛ ПЕРЕДАЧИ',w:.29,d:.33}),0);k.computer(.39,.831,-.10,desk,'ХРАНЕНИЕ · ОПИСЬ');k.chair(.05,-1.85);solid(.05,-1.85,.50,.50);
      const packageGroup=k.group(-.23,.85,-.16,desk);box(.40,.09,.27,0,.045,0,material('#a7a083'),packageGroup,.008);box(.061,.092,.275,0,.046,0,m.red,packageGroup,.002);const tag=label('ДЕЛО 041 · НЕ ВСКРЫВАТЬ',.30,.045,0,.096,.04,packageGroup,{bg:'#dad7c5',fg:'#354741',border:false});tag.rotation.x=-Math.PI/2;spot(packageGroup,1);
      label('УЧЁТ · ЦЕПОЧКА ХРАНЕНИЯ',2.15,.17,0,2.42,-3.38);wallPoster(-1.95,1.80,-3.39,'ПЕРЕДАЧА ДОКАЗАТЕЛЬСТВ',['Номер дела','Дата и время','Передал / получил','Целостность упаковки','Подпись сотрудника']);
      k.cabinet(2.64,-3.12,group,{w:1.04,h:1.89,d:.57});solid(2.64,-3.12,1.04,.57);k.bin(-1.25,-1.49);solid(-1.25,-1.49,.3,.3);
    }
    function furnishMorgue(){
      const cold=k.group(1.78,0,-3.055);cold.name='mortuary-cold-cabinets';
      box(3.62,2.48,.67,0,1.28,0,m.metal,cold,.035);box(3.55,2.4,.008,0,1.29,.344,m.dark,cold,.002);
      for(let row=0;row<3;row++)for(let col=0;col<3;col++){const X=(col-1)*1.18,Y=.48+row*.77;box(1.13,.719,.050,X,Y,.368,m.steel,cold,.018);box(1.06,.648,.009,X,Y,.398,material('#a5b3ac',.44,.67),cold,.012);for(const offset of [-.24,.24])box(.021,.055,.052,X+offset,Y+.05,.434,m.metal,cold,.005);rod([X-.24,Y+.05,.463],[X+.24,Y+.05,.463],.012,m.steel,cold);label('КАМЕРА '+(row*3+col+1),.38,.052,X,Y+.235,.408,cold,{bg:'#283c36',fg:'#dbdfcf',border:false});for(const hingeY of [-.20,.20])box(.025,.065,.033,X-.534,Y+hingeY,.418,m.metal,cold,.006);}
      spot(cold,2);solid(1.78,-3.055,3.63,.68);
      // Empty dissection table: profiled basin, sloped draining deck, raised
      // perimeter, plumbing and individual undercarriage braces.
      const autopsy=k.group(.36,0,-.45);autopsy.name='autopsy-table';
      const tableWidth=.92,tableLength=2.12;box(tableWidth,.075,tableLength,0,.88,0,m.steel,autopsy,.043);box(.80,.025,1.92,0,.92,0,material('#b6c6bf',.27,.80),autopsy,.055);
      for(const X of [-.436,.436])box(.028,.062,2.02,X,.931,0,m.steel,autopsy,.012);for(const Z of [-1.016,1.016])box(.88,.062,.033,0,.931,Z,m.steel,autopsy,.011);
      for(let j=0;j<11;j++){const Z=-.81+j*.153;rod([-.35,.940,Z],[.35,.940,Z+.045],.0035,m.metal,autopsy);}
      for(const X of [-.315,.315])for(const Z of [-.78,.78]){box(.055,.83,.055,X,.426,Z,m.steel,autopsy,.012);cylinder(.047,.047,.025,X,.027,Z,m.black,autopsy);}
      for(const Y of [.20,.56])for(const X of [-.315,.315])rod([X,Y,-.78],[X,Y,.78],.022,m.steel,autopsy);
      for(const Z of [-.78,.78])rod([-.315,.20,Z],[.315,.20,Z],.022,m.steel,autopsy);
      cylinder(.048,.048,.004,0,.936,.881,m.dark,autopsy);for(let j=0;j<6;j++)box(.059,.002,.003,0,.939,.85+j*.012,m.steel,autopsy,.0005);
      rod([0,.86,.881],[0,.56,.881],.027,m.metal,autopsy);rod([0,.56,.881],[.3,.56,.881],.027,m.metal,autopsy);rod([.3,.56,.881],[.30,.055,.881],.027,m.metal,autopsy);
      const rinse=rod([-.30,.95,-.89],[-.30,1.28,-.89],.014,m.steel,autopsy);rod([-.30,1.28,-.89],[-.13,1.28,-.89],.014,m.steel,autopsy);rod([-.13,1.28,-.89],[-.13,1.21,-.89],.014,m.steel,autopsy);spot(autopsy,1);solid(.36,-.45,.95,2.15);
      const trolley=k.group(1.65,0,-.56);trolley.name='instrument-trolley';for(const Y of [.25,.82]){box(.61,.025,.47,0,Y,0,m.steel,trolley,.012);for(const X of [-.295,.295])box(.014,.042,.44,X,Y+.028,0,m.steel,trolley,.003);for(const Z of [-.225,.225])box(.58,.042,.014,0,Y+.028,Z,m.steel,trolley,.003);}for(const X of [-.27,.27])for(const Z of [-.19,.19]){rod([X,.075,Z],[X,.92,Z],.016,m.steel,trolley);const wheel=cylinder(.039,.039,.025,X,.048,Z,m.black,trolley);wheel.rotation.z=Math.PI/2;}
      const instruments=tray(0,.845,0,trolley,{medical:true});for(let j=0;j<4;j++){const X=-.11+j*.07;rod([X,.016,-.075],[X,.016,.084],.005,m.steel,instruments);box(.008,.005,.055,X,.017,.082,m.steel,instruments,.002);}
      for(let j=0;j<3;j++)box(.10,.027,.16,-.14+j*.14,.288,0,m.paper,trolley,.006);solid(1.65,-.56,.63,.49);
      const desk=k.desk(-2.80,-1.86,1.77,.76,group,0,{metal:true});solid(-2.80,-1.86,1.77,.76);spot(k.paper(-.50,.832,.18,desk,{title:'ЖУРНАЛ ПОСТУПЛЕНИЙ',w:.27,d:.34}),0);spot(k.computer(.21,.832,-.095,desk,'СУДЕБНАЯ МЕДИЦИНА'),3);k.chair(-2.86,-.94);solid(-2.86,-.94,.50,.50);
      k.cabinet(-3.42,.49,group,{w:.95,h:1.94,d:.51,yaw:Math.PI/2});solid(-3.42,.49,.53,.96);
      k.cabinet(-3.42,1.71,group,{w:.95,h:1.94,d:.51,yaw:Math.PI/2});solid(-3.42,1.71,.53,.96);
      const washing=bench(3.5,.54,1.30,.62);washing.rotation.y=-Math.PI/2;solid(3.5,.54,.65,1.32);box(.60,.061,.39,0,.845,0,m.steel,washing,.038);box(.49,.024,.29,0,.865,0,m.dark,washing,.030);rod([0,.875,-.18],[0,1.13,-.18],.012,m.steel,washing);rod([0,1.13,-.18],[0,1.13,-.015],.012,m.steel,washing);rod([0,1.13,-.015],[0,1.05,-.015],.012,m.steel,washing);
      k.bin(2.91,1.49,group,{medical:true});solid(2.91,1.49,.31,.31);k.bin(2.57,1.49);solid(2.57,1.49,.31,.31);
      const chart=wallPoster(-2.50,1.84,-3.39,'СУДЕБНАЯ МЕДИЦИНА',['Осмотр по направлению','Документы при поступлении','Образцы с маркировкой','Средства защиты','Доступ по журналу']);
      const cross=k.group(-2.55,1.81,-3.36,group);cross.visible=false;
      label('МОРГ · ТОЛЬКО ДЛЯ ПЕРСОНАЛА',2.19,.14,-.84,2.97,-3.388);
      // Articulated examination lamp above the table has no floating supports.
      const exam=k.group(.36,3.12,-.65);cylinder(.13,.13,.042,0,0,0,m.plastic,exam);rod([0,-.035,0],[0,-.23,0],.026,m.steel,exam);rod([0,-.23,0],[-.47,-.23,.20],.025,m.steel,exam);rod([-.47,-.23,.20],[-.61,-.56,.24],.020,m.steel,exam);const head=k.group(-.61,-.59,.24,exam);cylinder(.23,.19,.09,0,0,0,m.plastic,head,24);const lightMaterial=material('#e6ecd7',.25);lightMaterial.emissive=new THREE.Color('#dae8d8');lightMaterial.emissiveIntensity=.65;cylinder(.185,.185,.008,0,-.049,0,lightMaterial,head,24);for(let j=0;j<5;j++){const angle=j*Math.PI*2/5;cylinder(.036,.036,.004,Math.cos(angle)*.10,-.055,Math.sin(angle)*.10,m.glass,head,16);}rod([-.085,-.09,0],[.085,-.09,0],.008,m.steel,head);
    }
  }
  return result;
}

// Repeated shelf spines, parcel lids and steel uprights keep their geometry and
// normals but share draw calls. Interaction meshes and articulated blinds stay
// individual, so picking and animated parts preserve their original semantics.
function batchStationProps(root,targets){
  root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),protectedMeshes=new Set(targets),buckets=new Map();
  root.traverse(object=>{
    if(!object.isMesh||object.isInstancedMesh||object.isSkinnedMesh||protectedMeshes.has(object)||Array.isArray(object.material))return;
    for(let parent=object;parent&&parent!==root;parent=parent.parent)if(!parent.visible||parent.isBone||parent.name.startsWith('metal-window-blinds'))return;
    const key=object.geometry.uuid+'/'+object.material.uuid;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(object);
  });
  for(const meshes of buckets.values()){
    if(meshes.length<4)continue;
    const instances=new THREE.InstancedMesh(meshes[0].geometry,meshes[0].material,meshes.length);instances.name='batched-station-furnishings';instances.castShadow=true;instances.receiveShadow=true;
    meshes.forEach((object,index)=>{instances.setMatrixAt(index,inverse.clone().multiply(object.matrixWorld));object.parent.remove(object);});
    instances.instanceMatrix.needsUpdate=true;instances.computeBoundingBox();instances.computeBoundingSphere();root.add(instances);
  }
}
