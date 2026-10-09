import * as THREE from 'three';

export function furnishReceptionDetails(scene,{ground,wood,frame,paper,steel,rounded,mesh,pipe,panel,canvasMap,plaque}){
  const brass=new THREE.MeshStandardMaterial({color:'#a38a4e',roughness:.44,metalness:.7});
  const cork=new THREE.MeshStandardMaterial({color:'#65563d',roughness:.95});
  // Individual hooks and metal keys on the booth's right wall.
  const keys=new THREE.Group();keys.position.set(-2.79,ground+1.85,-5.02);keys.rotation.y=Math.PI/2;scene.add(keys);keys.name='key-board';
  rounded(.67,.87,.035,0,0,0,wood,keys);rounded(.61,.81,.009,0,0,.025,cork,keys);
  for(const x of [-.33,.33])rounded(.025,.89,.055,x,0,.02,steel,keys);
  for(const y of [-.43,.43])rounded(.67,.025,.055,0,y,.02,steel,keys);
  for(let row=0;row<3;row++)for(let col=0;col<5;col++){
    const x=-.245+col*.122,y=.30-row*.26;
    pipe([x,y-.04,.033],[x,y-.04,.06],.005,brass,keys);
    mesh(new THREE.TorusGeometry(.013,.003,6,14),brass,x,y-.068,.067,keys);
    mesh(new THREE.TorusGeometry(.011,.0035,6,12),brass,x,y-.095,.069,keys);
    pipe([x,y-.106,.069],[x,y-.154,.069],.004,brass,keys);
    rounded(.018,.009,.007,x+.006,y-.144,.069,brass,keys);
  }
  // A closed staff door on the left wall behind the counter.
  const door=new THREE.Group();door.position.set(2.805,ground,-4.75);door.rotation.y=-Math.PI/2;scene.add(door);door.name='duty-staff-door';
  // Continuous dark jamb backing prevents the painted wall showing through joints.
  rounded(.91,2.13,.10,0,1.065,-.005,steel,door);
  rounded(.82,2.075,.055,0,1.045,.03,wood,door);
  for(const x of [-.45,.45])rounded(.075,2.15,.10,x,1.075,.04,frame,door);
  rounded(.975,.075,.10,0,2.1125,.04,frame,door);
  for(const y of [.51,1.40]){
    rounded(.64,.61,.012,0,y,.065,wood,door);
    for(const x of [-.32,.32])rounded(.018,.64,.012,x,y,.077,frame,door);
    for(const dy of [-.315,.315])rounded(.64,.018,.012,0,y+dy,.077,frame,door);
  }
  rounded(.035,.14,.015,.30,.96,.077,steel,door);pipe([.30,.99,.092],[.18,.99,.092],.009,brass,door);
  for(const y of [.33,1.77])rounded(.025,.09,.028,-.407,y,.077,brass,door);
  // Citizen reception desk in the free section of wall beyond the lockers.
  const area=new THREE.Group();area.position.set(2.79,ground,5.66);area.rotation.y=-Math.PI/2;scene.add(area);area.name='citizen-reception';area.userData.editor={id:'citizen-reception',label:'Приём граждан',solid:true,revision:2};
  rounded(1.36,1.04,.035,0,1.88,0,wood,area);rounded(1.27,.96,.008,0,1.88,.025,cork,area);
  plaque('ПРИЁМ ГРАЖДАН',1.36,.14,0,2.49,.03,area);
  const instructions=canvasMap((ctx,w,h)=>{
    ctx.fillStyle='#ddd2b9';ctx.fillRect(0,0,w,h);ctx.fillStyle='#303a30';ctx.textAlign='center';ctx.font='bold 35px Arial';ctx.fillText('ПОРЯДОК ПОДАЧИ ЗАЯВЛЕНИЙ',w/2,62,w-25);ctx.textAlign='left';ctx.font='27px Arial';
    ['1  Заполните бланк заявления','2  Передайте его дежурному','3  Дождитесь регистрации','4  Получите уведомление'].forEach((line,i)=>ctx.fillText(line,30,138+i*78,w-60));
  },640,460);panel(instructions,.63,.44,-.32,2.10,.035,area);
  const schedule=canvasMap((ctx,w,h)=>{
    ctx.fillStyle='#e5d8bc';ctx.fillRect(0,0,w,h);ctx.fillStyle='#303a30';ctx.textAlign='center';ctx.font='bold 43px Arial';ctx.fillText('ГРАФИК ПРИЁМА',w/2,65);ctx.textAlign='left';ctx.font='31px Arial';
    ['Понедельник – четверг   09:00 – 18:00','Пятница                        09:00 – 17:00','Суббота                        10:00 – 14:00','Воскресенье                  выходной','', 'ПОЛЕЗНЫЕ ТЕЛЕФОНЫ','Экстренная помощь          112','Дежурная часть                102'].forEach((line,i)=>ctx.fillText(line,28,139+i*62,w-56));
  },720,700);panel(schedule,.57,.60,.34,2.02,.035,area);
  const form=canvasMap((ctx,w,h)=>{ctx.fillStyle='#e8dec4';ctx.fillRect(0,0,w,h);ctx.fillStyle='#3b4437';ctx.textAlign='center';ctx.font='bold 48px Arial';ctx.fillText('ЗАЯВЛЕНИЕ',w/2,90);ctx.textAlign='left';ctx.font='30px Arial';ctx.fillText('Начальнику участка № 7',45,174);ctx.fillText('От __________________',45,230);for(let i=0;i<11;i++)ctx.fillRect(45,320+i*45,w-90,2);ctx.fillText('Дата ______ Подпись ______',45,h-70);});
  for(const x of [-.48,-.18]){
    // One visible sheet over a solid paper stack, without overlapping printed planes.
    rounded(.235,.32,.006,x,1.565,.047,paper,area);
    panel(form,.235,.32,x,1.565,.051,area);
    for(const side of [-1,1]){
      pipe([x+side*.125,1.40,.070],[x+side*.125,1.60,.070],.005,steel,area);
      pipe([x+side*.125,1.40,.031],[x+side*.125,1.40,.070],.005,steel,area);
    }
    pipe([x-.125,1.40,.070],[x+.125,1.40,.070],.005,steel,area);
    plaque(x<-.3?'ОБРАЗЕЦ':'БЛАНКИ',.24,.05,x,1.82,.045,area);
  }
  rounded(1.55,.055,.67,0,.77,.385,wood,area);
  for(const x of [-.67,.67])for(const z of [.14,.63])pipe([x,.006,z],[x,.74,z],.018,steel,area);
  for(let i=0;i<5;i++)rounded(.29,.007,.21,-.42,.805+i*.009,.32,paper,area);
  const lyingForm=panel(form,.31,.23,-.08,.805,.35,area);lyingForm.rotation.x=-Math.PI/2;
  rounded(.32,.30,.26,.34,.955,.30,cork,area);rounded(.34,.023,.28,.34,1.112,.30,cork,area);
  rounded(.21,.007,.024,.34,1.127,.29,steel,area);
  const boxLabel=canvasMap((ctx,w,h)=>{ctx.fillStyle='#dfd0ac';ctx.fillRect(0,0,w,h);ctx.textAlign='center';ctx.fillStyle='#333c31';ctx.font='bold 38px Arial';ctx.fillText('ДЛЯ',w/2,53);ctx.fillText('ЗАЯВЛЕНИЙ',w/2,105);},400,140);panel(boxLabel,.26,.09,.34,.96,.434,area);
  mesh(new THREE.CylinderGeometry(.038,.033,.08,18),steel,-.01,.84,.15,area);
  for(let i=0;i<3;i++)pipe([-.01+i*.013,.85,.15],[.01+i*.011,.97,.15],.003,steel,area);
}
