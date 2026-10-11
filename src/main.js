import * as THREE from 'three';
import './style.css';
import {noticeDocuments,noticeDetails,drawNoticePhoto,noticePhotosReady} from './notice-art.js';
import {createInteriorRooms} from './interior-rooms.js';
import {createBasement} from './basement.js';
import {BASEMENT_LAYOUT} from './building-layout.js';
import {createEditor} from './editor.js';
import {createCorridor} from './corridor.js';
import {createCoffeeInteraction} from './coffee-interaction.js';
import {createMenus} from './menu.js';
import {createDetaineeConversation,detaineeDialog,mountDetaineeDialog} from './detainee-dialog.js';
import {officerDialog} from './officer-dialog.js';
import {rooms} from './rooms.js';
import {canWalk, floorHeight, doorwayOccupied, floorNumber} from './navigation.js';
const $=s=>document.querySelector(s),overlay=$('#overlay'),room=$('#room'),canvas=$('#world');
const state={mode:'corridor',evidence:new Set(),contradiction:false,ended:false,briefed:false,accessDoorOpen:false,detaineeTopics:[]};
const evidence={
  file:{title:'01 / Дело «Последний раунд»',body:'В 22:15 после благотворительного турнира в раздевалке клуба «Ринг» найден убитым спортивный журналист Илья Громов. Рядом лежал металлический кубок со следами крови. Громов расследовал договорные бои. Боксёрша Марина Соколова, известная как «Сирень», публично поссорилась с ним перед финалом. В 23:20 её доставили в участок прямо с тренировки.'},
  log:{title:'02 / Журнал доступа в клуб',body:'Личный пропуск Марины Соколовой зарегистрирован у служебного входа в 21:58 и на выходе в 22:11. Время смерти Громова — между 22:00 и 22:10. Соколова утверждает, что ушла в 21:30. Её версия не совпадает с журналом.'},
  record:{title:'03 / Запись и заключение эксперта',body:'Эксперт восстановил запись на телефоне Громова. В 22:06 он говорит: «Марина, поставь кубок. Редакция уже получила доказательства договорного боя». Слышен её ответ: «Ты обещал не трогать мою сестру!», затем удар. Эксперт подтвердил голос Соколовой и обнаружил её отпечатки на кубке с кровью Громова. Запись и экспертиза подтверждают журнал доступа.'}
};
let audio,audioGain,editor,coffee,activeDetainee=null,activeRoom=null,roomReturn=null;
function sound(){if(audio){audio.resume().catch(()=>{});return;}try{audio=new AudioContext();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=58;audioGain=g;g.gain.value=.028*menus.preferences.volume/100;o.connect(g).connect(audio.destination);o.start();}catch{}}
function coffeeSound(kind){
  sound();if(!audio||menus.preferences.volume===0)return;
  const gain=audio.createGain();gain.connect(audio.destination);const start=audio.currentTime,volume=menus.preferences.volume/100;
  if(kind==='pour'||kind==='drink'){
    const length=kind==='pour'?3.3:.45,buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*length),audio.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(.65+.35*Math.sin(i/audio.sampleRate*31));
    const source=audio.createBufferSource(),filter=audio.createBiquadFilter();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=kind==='pour'?850:550;source.connect(filter).connect(gain);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.045*volume,start+.12);gain.gain.setValueAtTime(.045*volume,start+length-.12);gain.gain.linearRampToValueAtTime(0,start+length);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }else{
    const oscillator=audio.createOscillator();oscillator.type='sine';oscillator.frequency.setValueAtTime(kind==='ready'?880:360,start);oscillator.frequency.exponentialRampToValueAtTime(kind==='ready'?660:160,start+.18);oscillator.connect(gain);gain.gain.setValueAtTime(.055*volume,start);gain.gain.exponentialRampToValueAtTime(.0001,start+.22);oscillator.start();oscillator.stop(start+.23);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
}
function release(){if(typeof sceneRendered!=='undefined')sceneRendered=false;if(typeof highlightedCell!=='undefined')highlightCell(null);if(typeof highlightedNotice!=='undefined')highlightNotice(null);if(typeof highlightedBlinds!=='undefined')highlightBlinds(null);if(document.pointerLockElement)document.exitPointerLock();keys.clear();}
function panel(html){endDetainee();release();overlay.innerHTML=`<section class="panel"><button class="close" aria-label="Закрыть">×</button>${html}</section>`;$('.close').onclick=close;}
async function showNotice(index){
  release();await noticePhotosReady;const notice=noticeDocuments[index],photo=document.createElement('canvas');photo.width=700;photo.height=700;drawNoticePhoto(photo.getContext('2d'),index,0,0,700,700);
  panel(`<article class="notice-reader" aria-label="Объявление"><div class="notice-primary"><h2>${notice.title}</h2><h3>${notice.name}</h3><img src="${photo.toDataURL()}" alt="Фотография к объявлению"><div class="notice-copy">${notice.lines.map(line=>`<p>${line}</p>`).join('')}</div><strong>${notice.footer}</strong></div><aside><h2>Дополнительная информация</h2>${noticeDetails[index].map(text=>`<p>${text}</p>`).join('')}<div class="notice-stamp">УЧАСТОК № 7 · ЗАПИСИ ДЕЖУРНОЙ ЧАСТИ</div></aside></article>`);
}
function close(){endDetainee();overlay.innerHTML='';captureMouse();}
let mouseCapturePending=false,mouseCaptureQueued=false;
async function captureMouse(){
  if(editor?.active||!menus.playing||overlay.innerHTML||state.ended||document.pointerLockElement===canvas)return;
  // A quick dialog exit can race the previous browser lock request. Preserve
  // the new request instead of leaving the player with the menu cursor.
  if(mouseCapturePending){mouseCaptureQueued=true;return;}
  canvas.tabIndex=-1;canvas.focus({preventScroll:true});
  mouseCapturePending=true;
  try{await canvas.requestPointerLock();}
  catch{if(menus.playing&&!overlay.innerHTML)toast('Нажмите на сцену, чтобы вернуть управление мышью.');}
  finally{mouseCapturePending=false;if(mouseCaptureQueued){mouseCaptureQueued=false;captureMouse();}}
}
// If a menu opens while a browser request is pending, do not lock its cursor.
document.addEventListener('pointerlockchange',()=>{
  if(document.pointerLockElement===canvas&&(editor?.active||!menus.playing||overlay.innerHTML))document.exitPointerLock();
});
function toast(text){const d=document.createElement('div');d.className='toast';d.textContent=text;document.body.append(d);setTimeout(()=>d.remove(),3500);}
function collect(id){const fresh=!state.evidence.has(id);state.evidence.add(id);$('#count').textContent=`${state.evidence.size}/3`;panel(`<div class="eyebrow">АРХИВ УЧАСТКА · ДЕЛО № 041</div><h2>${evidence[id].title}</h2><p class="lead">${evidence[id].body}</p><div class="rule"></div><div class="badge">ДОБАВЛЕНО В МАТЕРИАЛЫ ДЕЛА</div>`);if(fresh)toast('Новая улика добавлена в дело');}
function journal(){panel(`<div class="eyebrow">РАССЛЕДОВАНИЕ / ${state.evidence.size} ИЗ 3 УЛИК</div><h2>Последний раунд</h2><p>Проверьте документы в кабинете следователя, затем сопоставьте их с показаниями Соколовой.</p>${Object.entries(evidence).map(([id,e])=>`<div class="evidence"><strong>${state.evidence.has(id)?e.title:'Неизученный материал'}</strong><p>${state.evidence.has(id)?e.body:'Продолжите расследование, чтобы открыть эту улику.'}</p></div>`).join('')}`);}
$('#journal').onclick=journal;
function dialog(reply='Соколова сжимает красные перчатки. «Я приехала с тренировки. Илья был жив, когда я ушла. Вы задержали не того человека».'){
  panel(`<div class="eyebrow">ДОПРОС / МАРИНА «СИРЕНЬ» СОКОЛОВА</div><h2>«Я не убийца»</h2><p class="lead">${reply}</p><div class="rule"></div><button class="choice" data-q="alibi">Когда вы покинули клуб?</button><button class="choice" data-q="motive">Почему вы поссорились с Громовым?</button>${state.evidence.has('log')?'<button class="choice" data-q="proof">Предъявить журнал: ваш пропуск использован в 22:11.</button>':''}${state.evidence.has('record')?'<button class="choice" data-q="audio">Предъявить запись и заключение эксперта.</button>':''}<button class="choice" data-q="verdict">Завершить расследование →</button>`);
  document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{
    const q=b.dataset.q;
    if(q==='alibi')dialog('«В 21:30. После боя я уехала тренироваться в другой зал. В раздевалку больше не заходила».');
    if(q==='motive')dialog('«Илья обещал написать о моей победе. Вместо этого назвал меня участницей договорного боя. Моей сестре нужна операция, а после такой статьи я лишилась бы всех контрактов».');
    if(q==='proof'){state.contradiction=true;dialog('Соколова опускает глаза. «Ладно, я вернулась. Хотела забрать его телефон и удалить запись. Но когда уходила, он ещё дышал». Она назвала устройство, которое нашли рядом с жертвой. Через телефон в кабинете следователя можно запросить восстановление записи и экспертизу кубка.');}
    if(q==='audio')dialog('«Он обещал не упоминать сестру… Я схватила кубок. Думала, он отступит». Соколова замолкает. Запись опровергает её первоначальную версию, а экспертиза связывает её с орудием убийства.');
    if(q==='verdict')verdict();
  });
}
function verdict(){panel(`<div class="eyebrow">РЕШЕНИЕ СЛЕДОВАТЕЛЯ</div><h2>Кто ответит за убийство?</h2><p>Обвинение требует доказательств. Ваше решение завершит дело.</p><button class="choice" id="accuse">Обвинить Марину Соколову</button><button class="choice" id="free">Освободить Соколову — доказательств недостаточно</button><button class="choice" id="continue">Продолжить расследование</button>`);$('#continue').onclick=()=>dialog();$('#accuse').onclick=()=>ending(state.evidence.size===3&&state.contradiction?'solved':'weak');$('#free').onclick=()=>ending('free');}
function ending(result){state.ended=true;const endings={solved:['Дело раскрыто','Журнал доступа, запись и экспертиза кубка подтверждают обвинение. Соколова задержана по подозрению в убийстве. Материалы Громова переданы редакции: расследование договорных боёв продолжится.'],weak:['Обвинение рассыпалось','Обвинение выдвинуто без полной цепочки доказательств. Прокурор вернул дело на дополнительное расследование. Соколова освобождена, а ключевые свидетели больше не выходят на связь.'],free:['Дело осталось открытым','Соколова покинула участок. Наутро служебный журнал клуба оказался стёрт. Без собранных вовремя доказательств гибель Громова остаётся нераскрытой.']};panel(`<div class="eyebrow">НОЧНАЯ СМЕНА / ИТОГ ДЕЛА</div><h2>${endings[result][0]}</h2><p class="lead">${endings[result][1]}</p><div class="badge">СОБРАНО УЛИК: ${state.evidence.size}/3</div><button class="primary" id="restart">НАЧАТЬ ЗАНОВО</button>`);$('#restart').onclick=()=>{state.evidence.clear();state.contradiction=false;state.ended=false;$('#count').textContent='0/3';exitRoom();close();intro();};}
function floorLabel(){const floor=floorNumber(camera.position.y);return floor===0?'ПОДВАЛ · МОРГ':`${floor} ЭТАЖ`;}
function updateLocation(){
  $('#location').textContent=`УЧАСТОК № 7 · ${activeRoom?activeRoom.name.toUpperCase():floorLabel()}`;
  $('#controls').textContent='W A S D — движение / МЫШЬ — обзор / Е или ЛКМ — взаимодействие / ESC — пауза';
}
function enter(type){
  const interior=interiors.get(type);if(!interior)return;
  endDetainee();release();
  if(!activeRoom)roomReturn={position:camera.position.clone(),yaw,pitch};
  if(activeRoom)activeRoom.group.visible=false;
  activeRoom=interior;state.mode=type;stationGroup.visible=false;interiorAmbient.visible=true;interior.group.visible=true;
  coffee.update(0,false);room.hidden=true;room.innerHTML='';$('#crosshair').hidden=false;$('#hint').textContent='';
  camera.position.copy(interior.spawn);yaw=interior.yaw;pitch=0;camera.rotation.set(pitch,yaw,0);target=null;
  updateLocation();sceneRendered=false;captureMouse();
}
function exitRoom(restore=true){
  if(activeRoom)activeRoom.group.visible=false;
  if(restore&&roomReturn){camera.position.copy(roomReturn.position);yaw=roomReturn.yaw;pitch=roomReturn.pitch;camera.rotation.set(pitch,yaw,0);}
  activeRoom=null;roomReturn=null;state.mode='corridor';stationGroup.visible=true;interiorAmbient.visible=false;
  room.hidden=true;room.innerHTML='';$('#crosshair').hidden=false;target=null;sceneRendered=false;updateLocation();
}
function runRoomAction(data){
  const {action,roomId,spotIndex}=data;
  if(action==='leaveRoom'){release();exitRoom();captureMouse();return;}
  if(action==='folder'){collect('file');return;}
  if(action==='board'){if(roomId==='interrogation')journal();else collect('log');return;}
  if(action==='phone'){
    if(state.contradiction)collect('record');
    else panel('<div class="eyebrow">ЭКСПЕРТНЫЙ ОТДЕЛ</div><h2>Нужна зацепка</h2><p>Сначала изучите журнал пропусков и предъявите его подозреваемой. Её ответ поможет определить, что искать экспертам.</p>');
    return;
  }
  if(action==='suspect'||action==='protocol'){dialog();return;}
  if(action==='materials'){journal();return;}
  const definition=rooms[roomId],spot=definition?.spots?.[spotIndex];
  if(spot)panel(`<div class="eyebrow">${definition.name.toUpperCase()}</div><h2>${spot[5]}</h2>${spot[6].map(text=>`<p>${text}</p>`).join('')}`);
}
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;const scene=new THREE.Scene();scene.background=new THREE.Color('#101b22');scene.fog=new THREE.Fog('#101b22',8,25);const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,40);camera.position.set(0,1.65,5);camera.rotation.order='YXZ';const {doors,passageDoor,coffeeMachine,interactables,updateStreet}=createCorridor(scene,renderer);
// Station lights and objects are disabled while exploring a separate room.
// Each room has its own shell, collision boundaries and lighting.
const stationGroup=new THREE.Group();stationGroup.name='station';
for(const child of [...scene.children])stationGroup.add(child);scene.add(stationGroup);
const basement=createBasement(stationGroup);interactables.push(...basement.interactables);
const interiors=createInteriorRooms(scene,{floorBases:{morgue:BASEMENT_LAYOUT.base}});
const interiorAmbient=new THREE.HemisphereLight(0xe1e8e0,0x303c31,1.05);interiorAmbient.visible=false;scene.add(interiorAmbient);
const ray=new THREE.Raycaster(),keys=new Set();let target=null,highlightedNotice=null,highlightedCell=null,highlightedBlinds=null,busy=false,yaw=0,pitch=0;
function highlightNotice(next){if(next===highlightedNotice)return;if(highlightedNotice)highlightedNotice.material.emissiveIntensity=0;highlightedNotice=next?.userData.type==='notice'?next:null;if(highlightedNotice)highlightedNotice.material.emissiveIntensity=.36;}
function highlightCell(next){const gate=next?.userData.type==='cellDoor'?next:null;if(gate===highlightedCell)return;highlightedCell?.userData.setHighlighted(false);highlightedCell=gate;highlightedCell?.userData.setHighlighted(true);}
function highlightBlinds(next){const blind=next?.userData.type==='windowBlinds'?next:null;if(blind===highlightedBlinds)return;highlightedBlinds?.userData.setHighlighted(false);highlightedBlinds=blind;highlightedBlinds?.userData.setHighlighted(true);}
document.addEventListener('keydown',e=>{if(e.code==='F2'){e.preventDefault();if(menus.playing&&state.mode==='corridor'){if(editor.active)editor.exit();else if(!overlay.innerHTML)editor.enter();}return;}if(editor?.active){if(e.code==='Escape')editor.exit();return;}if(e.code==='KeyE'&&!e.repeat&&menus.playing&&!overlay.innerHTML&&!state.ended){e.preventDefault();if(target)interact(target);else if(!activeRoom)coffee.drink();return;}if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();if(e.code==='Escape'){if($('#start-story'))return;if(menus.back())return;if(overlay.innerHTML)close();else pause();}if(!overlay.innerHTML)keys.add(e.code);});document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',release);
document.addEventListener('mousemove',e=>{if(!editor?.active&&document.pointerLockElement===canvas&&!overlay.innerHTML&&menus.playing){yaw-=e.movementX*.002*menus.preferences.sensitivity;pitch=Math.max(-1.2,Math.min(1.2,pitch-e.movementY*.002*menus.preferences.sensitivity));camera.rotation.set(pitch,yaw,0);}});
canvas.addEventListener('click',()=>{if(editor?.active||overlay.innerHTML||busy||!menus.playing||state.ended)return;if(target)interact(target);else captureMouse();});
function interact(selected=target){
  if(!selected||busy||overlay.innerHTML||!menus.playing||state.ended)return;
  sound();const data=selected.userData;
  if(data.type==='roomAction'){runRoomAction(data);return;}
  if(data.type==='windowBlinds'){data.toggle();return;}
  if(data.type==='cellDoor'){talkToDetainee();return;}
  if(['coffeeMachine','coffeeCup'].includes(data.type)){coffee.interact(selected);return;}
  if(data.type==='notice'){showNotice(data.noticeIndex);return;}
  if(data.type==='dutyOfficer'){briefing();return;}
  if(data.type==='savePhone'){savePhone();return;}
  if(data.type==='passageDoor'){togglePassageDoor();return;}
  const roomType=data.roomType??data.type;if(!interiors.has(roomType))return;
  const hinge=data.hinge;if(!hinge){enter(roomType);return;}
  busy=true;release();const start=hinge.rotation.y,end=data.openAngle??start-1.15,started=performance.now();
  function animate(now){
    const progress=Math.min(1,(now-started)/420),ease=progress*progress*(3-2*progress);hinge.rotation.y=start+(end-start)*ease;
    if(progress<1)requestAnimationFrame(animate);
    else{enter(roomType);hinge.rotation.y=start;busy=false;captureMouse();}
  }
  requestAnimationFrame(animate);
}
function setPassageOpen(open){passageDoor.userData.hinges.forEach(hinge=>hinge.rotation.y=open?hinge.userData.openAngle:0);}
function togglePassageDoor(){
  if(!state.briefed){toast('Сначала поговорите с дежурным: он откроет доступ к лестнице.');return;}
  if(state.accessDoorOpen&&doorwayOccupied(camera.position)){toast('Отойдите от дверного проёма, чтобы закрыть дверь.');return;}
  busy=true;const hinges=passageDoor.userData.hinges,starts=hinges.map(hinge=>hinge.rotation.y),opening=!state.accessDoorOpen,started=performance.now();
  function animate(now){const progress=Math.min(1,(now-started)/350),ease=progress*progress*(3-2*progress);hinges.forEach((hinge,i)=>{const end=opening?hinge.userData.openAngle:0;hinge.rotation.y=starts[i]+(end-starts[i])*ease;});if(progress<1)requestAnimationFrame(animate);else{state.accessDoorOpen=opening;busy=false;}}
  requestAnimationFrame(animate);
}
function briefing(topic='welcome'){
  panel(officerDialog(topic));
  const dialog=$('.panel');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','lebedev-title');
  document.querySelectorAll('[data-brief]').forEach(button=>button.onclick=()=>briefing(button.dataset.brief));$('#leave-officer').onclick=()=>{const fresh=!state.briefed;state.briefed=true;close();if(fresh)toast('Доступ к лестнице открыт. Подойдите к двери в проходе и нажмите ЛКМ.');};
  $('#lebedev-title').focus({preventScroll:true});
}
function endDetainee(){
  if(!activeDetainee)return;
  activeDetainee.ui.dispose();
  camera.position.copy(activeDetainee.position);camera.quaternion.copy(activeDetainee.rotation);camera.fov=activeDetainee.fov;camera.updateProjectionMatrix();
  activeDetainee=null;document.body.classList.remove('in-detainee-dialog');keys.clear();target=null;sceneRendered=false;
}
function talkToDetainee(){
  if(activeDetainee)return;
  const original={position:camera.position.clone(),rotation:camera.quaternion.clone(),fov:camera.fov};
  const conversation=createDetaineeConversation(state.detaineeTopics);
  panel(detaineeDialog());
  const element=$('.panel');element.setAttribute('role','dialog');element.setAttribute('aria-modal','true');element.setAttribute('aria-labelledby','detainee-title');
  document.body.classList.add('in-detainee-dialog');
  // Eye-level dialogue framing keeps Alice to the left of the floating topics.
  const destination=new THREE.Vector3(-.76,-1.715,5.30);
  const framing=camera.clone();framing.position.copy(destination);framing.lookAt(-2.48,-2.24,5.46-.52*THREE.MathUtils.clamp(camera.aspect/1.6,.2,1));
  const ui=mountDetaineeDialog(element,conversation,{
    onUpdate:topics=>{state.detaineeTopics=topics;},
    onClose:after=>{close();if(after)toast(`Алиса (вслед): «${after}»`);},
  });
  activeDetainee={...original,ui,destination,direction:framing.quaternion.clone(),started:performance.now(),aspect:camera.aspect,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
}
function updateDetaineeCamera(now){
  if(!activeDetainee)return;
  const pose=activeDetainee;
  if(pose.aspect!==camera.aspect){const framing=camera.clone();framing.position.copy(pose.destination);framing.lookAt(-2.48,-2.24,5.46-.52*THREE.MathUtils.clamp(camera.aspect/1.6,.2,1));pose.direction.copy(framing.quaternion);pose.aspect=camera.aspect;}
  const t=pose.reduced?1:Math.min(1,(now-pose.started)/450),ease=t*t*(3-2*t);
  camera.position.lerpVectors(pose.position,pose.destination,ease);camera.quaternion.slerpQuaternions(pose.rotation,pose.direction,ease);
  camera.fov=THREE.MathUtils.lerp(pose.fov,50,ease);camera.updateProjectionMatrix();
}
function pause(){menus.pause();}
const SAVE_KEY='night-shift-last-round-save-v1';
function readSave(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(s?.version!==1||!Array.isArray(s.evidence)||s.evidence.some(id=>!Object.hasOwn(evidence,id))||typeof s.contradiction!=='boolean'||!Array.isArray(s.position)||s.position.length!==3||!s.position.every(Number.isFinite)||!Number.isFinite(s.yaw)||!Number.isFinite(s.pitch))return null;return s;}catch{return null;}}
function savePhone(){
  panel(`<div class="eyebrow">БЕЛЫЙ ТЕЛЕФОН / ЛИНИЯ СОХРАНЕНИЯ</div><h2>Наберите номер</h2><p>Номер дежурной линии — <strong>007</strong>. Звонок сохраняет улики, результаты допроса, ваше место в коридоре, деньги и купленный напиток на этом устройстве.</p><output class="phone-display" id="dial-display">— — —</output><div class="dial-pad">${['1','2','3','4','5','6','7','8','9','⌫','0','☎'].map(k=>`<button class="dial-key" data-digit="${k}" aria-label="${k==='☎'?'Позвонить':k==='⌫'?'Удалить цифру':'Цифра '+k}">${k}</button>`).join('')}</div><p id="dial-status" role="status"></p>`);
  let digits='';const display=$('#dial-display'),status=$('#dial-status');
  document.querySelectorAll('[data-digit]').forEach(button=>button.onclick=()=>{
    const digit=button.dataset.digit;
    if(digit==='☎'){
      if(digits!=='007'){status.textContent='Номер не отвечает. Для сохранения наберите 007.';return;}
      try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,evidence:[...state.evidence],contradiction:state.contradiction,position:camera.position.toArray(),yaw,pitch,layoutVersion:2,briefed:state.briefed,accessDoorOpen:state.accessDoorOpen,coffee:coffee.snapshot(),detaineeTopics:state.detaineeTopics}));status.textContent='Дежурный: «Принято. Прогресс сохранён». В главном меню доступно «Продолжить».';toast('Игра сохранена');}
      catch{status.textContent='Не удалось сохранить. Браузер запрещает локальное хранилище.';}
    }else{digits=digit==='⌫'?digits.slice(0,-1):digits.length<3?digits+digit:digits;display.textContent=digits||'— — —';status.textContent='';}
  });
}
function resetGame(){exitRoom(false);state.detaineeTopics=[];coffee.restore();state.evidence.clear();state.contradiction=false;state.ended=false;state.briefed=false;state.accessDoorOpen=false;setPassageOpen(false);$('#count').textContent='0/3';camera.position.set(0,-1.715,3.4);yaw=Math.PI;pitch=0;camera.rotation.set(pitch,yaw,0);target=null;updateLocation();sound();
  panel('<div class="eyebrow">ДЕЛО № 041 · ПОСЛЕДНИЙ РАУНД</div><h2>Ваша ночная смена</h2><p class="lead">Вы — старший следователь отдела тяжких преступлений. Сегодня вы принимаете ночную смену в участке № 7.</p><p>После боксёрского турнира убит журналист Илья Громов. Он расследовал договорные бои. Подозреваемую, Марину «Сирень» Соколову, уже доставили в допросную.</p><p>Вам предстоит изучить материалы дела, проверить её показания и решить, достаточно ли улик для обвинения. Вы входите в участок через главный вход на первом этаже. Начните с разговора с дежурным Лебедевым за стеклом: он передаст сведения о деле и разрешит подняться к кабинетам на второй этаж.</p><button class="primary" id="start-story">Продолжить</button>');$('.close').hidden=true;$('#start-story').onclick=()=>{close();captureMouse();};
}
function loadGame(saved){exitRoom(false);state.detaineeTopics=Array.isArray(saved.detaineeTopics)?saved.detaineeTopics.filter(id=>id==='fight'):[];coffee.restore(saved.coffee);state.evidence=new Set(saved.evidence);state.contradiction=saved.contradiction;state.ended=false;$('#count').textContent=`${state.evidence.size}/3`;camera.position.fromArray(saved.position);state.accessDoorOpen=!!saved.accessDoorOpen&&!!saved.briefed;setPassageOpen(state.accessDoorOpen);const relocate=!canWalk(camera.position.x,camera.position.z,camera.position.y,state.accessDoorOpen)||(!saved.layoutVersion&&!saved.briefed&&camera.position.y>.9);if(relocate){camera.position.set(0,-1.715,3.4);}camera.position.y=floorHeight(camera.position.x,camera.position.z,camera.position.y)+1.65;state.briefed=!!saved.briefed;yaw=relocate?Math.PI:saved.yaw;pitch=relocate?0:THREE.MathUtils.clamp(saved.pitch,-1.2,1.2);camera.rotation.set(pitch,yaw,0);target=null;updateLocation();sound();captureMouse();}
let sceneRendered=false;
const menus=createMenus({panel,clear:close,edit:()=>{if(state.mode!=='corridor'){toast('Выйдите в коридор, чтобы редактировать предметы.');return;}editor.enter();},readSave,removeSave:()=>localStorage.removeItem(SAVE_KEY),startNew:resetGame,resume:loadGame,apply:preferences=>{sceneRendered=false;renderer.toneMappingExposure=1.25;renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.needsUpdate=true;if(audioGain&&audio)audioGain.gain.setTargetAtTime(.028*preferences.volume/100,audio.currentTime,.05);},stopSound:()=>{if(audio)audio.suspend().catch(()=>{});}});
editor=createEditor({scene,camera,canvas,release,onExit:()=>{
  if(editor.blocked(camera.position.x,camera.position.z,camera.position.y)){
    const original=camera.position.clone();let found=false;
    for(let radius=.35;radius<5&&!found;radius+=.35)for(let i=0;i<16&&!found;i++){
      const x=original.x+Math.cos(i*Math.PI/8)*radius,z=original.z+Math.sin(i*Math.PI/8)*radius;
      if(canWalk(x,z,camera.position.y,state.accessDoorOpen)&&!editor.blocked(x,z,camera.position.y)){camera.position.x=x;camera.position.z=z;found=true;}
    }
  }
  yaw=camera.rotation.y;pitch=camera.rotation.x;target=null;captureMouse();
}});
coffee=createCoffeeInteraction({scene,camera,machine:coffeeMachine,panel,close,toast,sound:coffeeSound});
function intro(){menus.main();}
let last=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const elapsed=(now-last)/1000,dt=Math.min(elapsed,.05);last=now;
  const playing=menus.playing&&!overlay.innerHTML&&!editor.active&&!state.ended;
  const inCorridor=playing&&!activeRoom;
  if(playing&&!busy){
    let x=0,z=0;
    if(keys.has('KeyW'))z-=1;if(keys.has('KeyS'))z+=1;
    if(keys.has('KeyA'))x-=1;if(keys.has('KeyD'))x+=1;
    const len=Math.hypot(x,z)||1;
    const dx=(x*Math.cos(yaw)+z*Math.sin(yaw))/len*dt*2.6,dz=(-x*Math.sin(yaw)+z*Math.cos(yaw))/len*dt*2.6;
    const walk=(x,z)=>activeRoom?activeRoom.walk(x,z):canWalk(x,z,camera.position.y,state.accessDoorOpen)&&!editor.blocked(x,z,camera.position.y);
    if(walk(camera.position.x+dx,camera.position.z))camera.position.x+=dx;
    if(walk(camera.position.x,camera.position.z+dz))camera.position.z+=dz;
    camera.position.y=activeRoom?activeRoom.floorHeight+1.65:floorHeight(camera.position.x,camera.position.z,camera.position.y)+1.65;
    updateLocation();ray.setFromCamera(new THREE.Vector2(0,0),camera);
    const candidates=activeRoom?activeRoom.interactables:interactables.filter(object=>(object.userData.floor??1)===floorNumber(camera.position.y)&&coffee.canTarget(object));
    const hit=ray.intersectObjects(candidates,true)[0];target=hit&&hit.distance<2.6?hit.object:null;
    highlightNotice(target);highlightCell(target);highlightBlinds(target);
    let hint='';const data=target?.userData;
    if(data?.type==='notice')hint='Прочитать объявление · Нажмите «Е»';
    else if(data?.type==='cellDoor')hint='Поговорить с Алисой · Нажмите «Е»';
    else if(data?.type==='dutyOfficer')hint='Дежурный Лебедев · Нажмите «Е»';
    else if(data?.type==='savePhone')hint='Телефон сохранения · Нажмите «Е»';
    else if(data?.type==='passageDoor')hint=`${state.accessDoorOpen?'Закрыть':'Открыть'} проход · Нажмите «Е»`;
    else if(data?.type==='roomAction'||data?.type==='windowBlinds')hint=`${data.label} · Нажмите «Е»`;
    else if(data?.type==='morgueDoor')hint='Морг · Нажмите «Е»';
    else if(data&&rooms[data.type])hint=`${rooms[data.type].name} · Нажмите «Е»`;
    if(!hint&&inCorridor)hint=coffee.hint(target);
    $('#hint').textContent=hint;$('#hint').classList.toggle('coffee-hint',!!hint);
  }
  if(!playing){$('#hint').textContent='';$('#hint').classList.remove('coffee-hint');}
  coffee.update(Math.min(elapsed,.25),inCorridor);
  updateDetaineeCamera(now);
  if(!menus.exited&&(!overlay.innerHTML||!sceneRendered||activeDetainee)){
    if(activeRoom)activeRoom.update(now/1000);
    else{
      editor.update();updateStreet(now/1000);basement.update(now/1000,dt);
      scene.getObjectByName('stationAmbient').intensity=THREE.MathUtils.lerp(.62,1.65,THREE.MathUtils.clamp((camera.position.y+.5)/2.15,0,1));
    }
    renderer.render(scene,camera);sceneRendered=true;
  }
}
requestAnimationFrame(frame);window.addEventListener('resize',()=>{sceneRendered=false;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});intro();
if(import.meta.env.DEV)window.__nightShift={
  state,camera,menus,renderer,editor,coffee,interiors,basement,enter,exitRoom,interact,
  setPlayerPose(position,nextYaw,nextPitch=0){camera.position.fromArray(position);yaw=nextYaw;pitch=nextPitch;camera.rotation.set(pitch,yaw,0);sceneRendered=false;},
  get activeInterior(){return activeRoom;},get target(){return target;}
};
