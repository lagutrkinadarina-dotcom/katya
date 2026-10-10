import * as THREE from 'three';
import './style.css';
import {noticeDocuments,noticeDetails,drawNoticePhoto,noticePhotosReady} from './notice-art.js';
import {art} from './art.js';
import {createEditor} from './editor.js';
import {createCorridor} from './corridor.js';
import {createCoffeeInteraction} from './coffee-interaction.js';
import {createMenus} from './menu.js';
import {officerDialog} from './officer-dialog.js';
import {rooms} from './rooms.js';
import {canWalk, floorHeight, doorwayOccupied, floorNumber} from './navigation.js';
const $=s=>document.querySelector(s),overlay=$('#overlay'),room=$('#room'),canvas=$('#world');
const state={mode:'corridor',evidence:new Set(),contradiction:false,ended:false,briefed:false,accessDoorOpen:false};
const evidence={
  file:{title:'01 / Дело «Последний раунд»',body:'В 22:15 после благотворительного турнира в раздевалке клуба «Ринг» найден убитым спортивный журналист Илья Громов. Рядом лежал металлический кубок со следами крови. Громов расследовал договорные бои. Боксёрша Марина Соколова, известная как «Сирень», публично поссорилась с ним перед финалом. В 23:20 её доставили в участок прямо с тренировки.'},
  log:{title:'02 / Журнал доступа в клуб',body:'Личный пропуск Марины Соколовой зарегистрирован у служебного входа в 21:58 и на выходе в 22:11. Время смерти Громова — между 22:00 и 22:10. Соколова утверждает, что ушла в 21:30. Её версия не совпадает с журналом.'},
  record:{title:'03 / Запись и заключение эксперта',body:'Эксперт восстановил запись на телефоне Громова. В 22:06 он говорит: «Марина, поставь кубок. Редакция уже получила доказательства договорного боя». Слышен её ответ: «Ты обещал не трогать мою сестру!», затем удар. Эксперт подтвердил голос Соколовой и обнаружил её отпечатки на кубке с кровью Громова. Запись и экспертиза подтверждают журнал доступа.'}
};
let audio,audioGain,editor,coffee;
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
function release(){if(typeof highlightedNotice!=='undefined')highlightNotice(null);if(document.pointerLockElement)document.exitPointerLock();keys.clear();}
function panel(html){release();overlay.innerHTML=`<section class="panel"><button class="close" aria-label="Закрыть">×</button>${html}</section>`;$('.close').onclick=close;}
async function showNotice(index){
  release();await noticePhotosReady;const notice=noticeDocuments[index],photo=document.createElement('canvas');photo.width=700;photo.height=700;drawNoticePhoto(photo.getContext('2d'),index,0,0,700,700);
  panel(`<article class="notice-reader" aria-label="Объявление"><div class="notice-primary"><h2>${notice.title}</h2><h3>${notice.name}</h3><img src="${photo.toDataURL()}" alt="Фотография к объявлению"><div class="notice-copy">${notice.lines.map(line=>`<p>${line}</p>`).join('')}</div><strong>${notice.footer}</strong></div><aside><h2>Дополнительная информация</h2>${noticeDetails[index].map(text=>`<p>${text}</p>`).join('')}<div class="notice-stamp">УЧАСТОК № 7 · ЗАПИСИ ДЕЖУРНОЙ ЧАСТИ</div></aside></article>`);
}
function close(){overlay.innerHTML='';captureMouse();}
let mouseCapturePending=false;
async function captureMouse(){
  if(editor?.active||!menus.playing||state.mode!=='corridor'||overlay.innerHTML||state.ended||document.pointerLockElement===canvas||mouseCapturePending)return;
  mouseCapturePending=true;
  try{await canvas.requestPointerLock();}
  catch{if(menus.playing&&state.mode==='corridor'&&!overlay.innerHTML)toast('Нажмите на сцену, чтобы вернуть управление мышью.');}
  finally{mouseCapturePending=false;}
}
// If a menu opens while a browser request is pending, do not lock its cursor.
document.addEventListener('pointerlockchange',()=>{
  if(document.pointerLockElement===canvas&&(editor?.active||!menus.playing||state.mode!=='corridor'||overlay.innerHTML))document.exitPointerLock();
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
function enter(type){
  const definition=rooms[type];if(!definition)return;
  release();state.mode=type;coffee.update(0,false);room.hidden=false;$('#crosshair').hidden=true;$('#hint').textContent='';
  $('#location').textContent=`УЧАСТОК № 7 · ${definition.name.toUpperCase()}`;
  $('#controls').textContent='МЫШЬ — осмотр и взаимодействие / ESC — пауза';
  room.innerHTML=`<div class="scene">${art(type)}</div><div class="room-caption">${definition.caption}<h2>${definition.name}</h2></div><button class="back">← В КОРИДОР</button>`;
  $('.back').onclick=()=>{exitRoom();captureMouse();};
  let spots;
  if(type==='office')spots=[['Папка дела',34,70,15,14,()=>collect('file')],['Доска улик',68,18,25,34,()=>collect('log')],['Телефон · экспертиза',66,72,10,11,()=>{if(state.contradiction)collect('record');else panel('<div class="eyebrow">ЭКСПЕРТНЫЙ ОТДЕЛ</div><h2>Нужна зацепка</h2><p>Сначала изучите журнал пропусков и предъявите его подозреваемому. Его ответ поможет определить, что искать экспертам.</p>');}]];
  else if(type==='interrogation')spots=[['Допросить Соколову',38,17,26,58,()=>dialog()],['Протокол допроса',15,76,26,15,()=>dialog()],['Материалы дела',75,77,12,15,journal]];
  else spots=definition.spots.map(([label,x,y,w,h,title,paragraphs])=>[label,x,y,w,h,()=>panel(`<div class="eyebrow">${definition.name.toUpperCase()}</div><h2>${title}</h2>${paragraphs.map(text=>`<p>${text}</p>`).join('')}`)]);
  for(const [label,x,y,w,h,fn]of spots){
    const button=document.createElement('button');button.className='hotspot';button.setAttribute('aria-label',label);
    button.style.cssText=`left:${x}%;top:${y}%;width:${w}%;height:${h}%`;button.innerHTML=`<span>${label}</span>`;button.onclick=fn;room.append(button);
  }
}
function exitRoom(){state.mode='corridor';room.hidden=true;$('#crosshair').hidden=false;$('#location').textContent=`УЧАСТОК № 7 · ${floorNumber(camera.position.y)} ЭТАЖ`;$('#controls').textContent='W A S D — движение / МЫШЬ — обзор / ЛКМ — открыть дверь';}
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;const scene=new THREE.Scene();scene.background=new THREE.Color('#101b22');scene.fog=new THREE.Fog('#101b22',8,25);const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,40);camera.position.set(0,1.65,5);camera.rotation.order='YXZ';const {doors,passageDoor,coffeeMachine,interactables,updateStreet}=createCorridor(scene,renderer);
const ray=new THREE.Raycaster(),keys=new Set();let target=null,highlightedNotice=null,busy=false,yaw=0,pitch=0;
function highlightNotice(next){if(next===highlightedNotice)return;if(highlightedNotice)highlightedNotice.material.emissiveIntensity=0;highlightedNotice=next?.userData.type==='notice'?next:null;if(highlightedNotice)highlightedNotice.material.emissiveIntensity=.36;}
document.addEventListener('keydown',e=>{if(e.code==='F2'){e.preventDefault();if(menus.playing&&state.mode==='corridor'){if(editor.active)editor.exit();else if(!overlay.innerHTML)editor.enter();}return;}if(editor?.active){if(e.code==='Escape')editor.exit();return;}if(e.code==='KeyE'&&!e.repeat&&menus.playing&&state.mode==='corridor'&&!overlay.innerHTML&&!state.ended){e.preventDefault();coffee.drink();return;}if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();if(e.code==='Escape'){if($('#start-story'))return;if(menus.back())return;if(overlay.innerHTML)close();else pause();}if(!overlay.innerHTML)keys.add(e.code);});document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',release);
document.addEventListener('mousemove',e=>{if(!editor?.active&&document.pointerLockElement===canvas&&state.mode==='corridor'&&!overlay.innerHTML){yaw-=e.movementX*.002*menus.preferences.sensitivity;pitch=Math.max(-1.2,Math.min(1.2,pitch-e.movementY*.002*menus.preferences.sensitivity));camera.rotation.set(pitch,yaw,0);}});
canvas.addEventListener('click',async()=>{if(editor?.active||state.mode!=='corridor'||overlay.innerHTML||busy)return;sound();if(target){if(['coffeeMachine','coffeeCup'].includes(target.userData.type)){coffee.interact(target);return;}if(target.userData.type==='notice'){showNotice(target.userData.noticeIndex);return;}if(target.userData.type==='dutyOfficer'){briefing();return;}if(target.userData.type==='savePhone'){savePhone();return;}if(target.userData.type==='passageDoor'){togglePassageDoor();return;}busy=true;release();const selected=target;const hinge=selected.userData.hinge;const start=hinge.rotation.y;let t=0;const animate=()=>{t+=.07;hinge.rotation.y=start-Math.min(t,1)*1.15;if(t<1)requestAnimationFrame(animate);else{enter(selected.userData.type);hinge.rotation.y=start;busy=false;}};animate();}else{await captureMouse();}});
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
      try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,evidence:[...state.evidence],contradiction:state.contradiction,position:camera.position.toArray(),yaw,pitch,layoutVersion:2,briefed:state.briefed,accessDoorOpen:state.accessDoorOpen,coffee:coffee.snapshot()}));status.textContent='Дежурный: «Принято. Прогресс сохранён». В главном меню доступно «Продолжить».';toast('Игра сохранена');}
      catch{status.textContent='Не удалось сохранить. Браузер запрещает локальное хранилище.';}
    }else{digits=digit==='⌫'?digits.slice(0,-1):digits.length<3?digits+digit:digits;display.textContent=digits||'— — —';status.textContent='';}
  });
}
function resetGame(){coffee.restore();state.evidence.clear();state.contradiction=false;state.ended=false;state.briefed=false;state.accessDoorOpen=false;setPassageOpen(false);$('#count').textContent='0/3';camera.position.set(0,-1.715,3.4);yaw=Math.PI;pitch=0;camera.rotation.set(pitch,yaw,0);target=null;exitRoom();sound();
  panel('<div class="eyebrow">ДЕЛО № 041 · ПОСЛЕДНИЙ РАУНД</div><h2>Ваша ночная смена</h2><p class="lead">Вы — старший следователь отдела тяжких преступлений. Сегодня вы принимаете ночную смену в участке № 7.</p><p>После боксёрского турнира убит журналист Илья Громов. Он расследовал договорные бои. Подозреваемую, Марину «Сирень» Соколову, уже доставили в допросную.</p><p>Вам предстоит изучить материалы дела, проверить её показания и решить, достаточно ли улик для обвинения. Вы входите в участок через главный вход на первом этаже. Начните с разговора с дежурным Лебедевым за стеклом: он передаст сведения о деле и разрешит подняться к кабинетам на второй этаж.</p><button class="primary" id="start-story">Продолжить</button>');$('.close').hidden=true;$('#start-story').onclick=()=>{close();captureMouse();};
}
function loadGame(saved){coffee.restore(saved.coffee);state.evidence=new Set(saved.evidence);state.contradiction=saved.contradiction;state.ended=false;$('#count').textContent=`${state.evidence.size}/3`;camera.position.fromArray(saved.position);state.accessDoorOpen=!!saved.accessDoorOpen&&!!saved.briefed;setPassageOpen(state.accessDoorOpen);const relocate=!canWalk(camera.position.x,camera.position.z,camera.position.y,state.accessDoorOpen)||(!saved.layoutVersion&&!saved.briefed&&camera.position.y>.9);if(relocate){camera.position.set(0,-1.715,3.4);}camera.position.y=floorHeight(camera.position.x,camera.position.z,camera.position.y)+1.65;state.briefed=!!saved.briefed;yaw=relocate?Math.PI:saved.yaw;pitch=relocate?0:THREE.MathUtils.clamp(saved.pitch,-1.2,1.2);camera.rotation.set(pitch,yaw,0);target=null;exitRoom();sound();captureMouse();}
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
  const inCorridor=menus.playing&&state.mode==='corridor'&&!overlay.innerHTML&&!editor.active;
  if(inCorridor&&!busy){
    let x=0,z=0;
    if(keys.has('KeyW'))z-=1;if(keys.has('KeyS'))z+=1;
    if(keys.has('KeyA'))x-=1;if(keys.has('KeyD'))x+=1;
    const len=Math.hypot(x,z)||1,speed=coffee.order.phase==='paying'?0:2.6;
    const dx=(x*Math.cos(yaw)+z*Math.sin(yaw))/len*dt*speed,dz=(-x*Math.sin(yaw)+z*Math.cos(yaw))/len*dt*speed;
    if(canWalk(camera.position.x+dx,camera.position.z,camera.position.y,state.accessDoorOpen)&&!editor.blocked(camera.position.x+dx,camera.position.z,camera.position.y))camera.position.x+=dx;
    if(canWalk(camera.position.x,camera.position.z+dz,camera.position.y,state.accessDoorOpen)&&!editor.blocked(camera.position.x,camera.position.z+dz,camera.position.y))camera.position.z+=dz;
    camera.position.y=floorHeight(camera.position.x,camera.position.z,camera.position.y)+1.65;
    $('#location').textContent=`УЧАСТОК № 7 · ${floorNumber(camera.position.y)} ЭТАЖ`;
    ray.setFromCamera(new THREE.Vector2(0,0),camera);
    const hit=ray.intersectObjects(interactables.filter(object=>(object.userData.floor??1)===floorNumber(camera.position.y)&&coffee.canTarget(object)))[0];
    target=hit&&hit.distance<2.6?hit.object:null;
    highlightNotice(target);
    $('#hint').textContent=target?.userData.type==='notice'?'Нажмите, чтобы прочитать объявление':'';
  }
  const coffeeActive=inCorridor&&!state.ended;
  coffee.update(Math.min(elapsed,.25),coffeeActive);
  const coffeeHint=coffeeActive?coffee.hint(target):'';
  $('#hint').classList.toggle('coffee-hint',!!coffeeHint);
  if(coffeeHint)$('#hint').textContent=coffeeHint;
  if(!menus.exited&&state.mode==='corridor'&&(!overlay.innerHTML||!sceneRendered)){
    editor.update();updateStreet(now/1000);
    scene.getObjectByName('stationAmbient').intensity=THREE.MathUtils.lerp(.62,1.65,THREE.MathUtils.clamp((camera.position.y+.5)/2.15,0,1));
    renderer.render(scene,camera);sceneRendered=true;
  }
}
requestAnimationFrame(frame);window.addEventListener('resize',()=>{sceneRendered=false;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});intro();
if (import.meta.env.DEV) window.__nightShift = { state, camera, menus, renderer, editor, coffee, get target(){return target;} };
