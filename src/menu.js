const SETTINGS_KEY='night-shift-settings-v1';
const defaults={volume:65,sensitivity:1};
function loadSettings(){try{const s=JSON.parse(localStorage.getItem(SETTINGS_KEY));return {volume:Number.isFinite(s?.volume)?Math.max(0,Math.min(100,s.volume)):65,sensitivity:Number.isFinite(s?.sensitivity)?Math.max(.5,Math.min(2,s.sensitivity)):1};}catch{return {...defaults};}}
export function createMenus({panel,clear,readSave,removeSave,startNew,resume,apply,stopSound}){
  const $=s=>document.querySelector(s);
  let screen='main',parent='main',playing=false,exited=false;
  const preferences=loadSettings();apply(preferences);
  function show(html){panel(html);$('.close').hidden=true;}
  function activate(){screen='game';playing=true;exited=false;document.body.classList.remove('in-menu');clear();}
  function main(){screen='main';playing=false;exited=false;document.body.classList.add('in-menu');stopSound();const saved=readSave();
    show(`<div class="eyebrow">ДЕТЕКТИВ / ДЕЛО № 041</div><h1>Ночная<br>смена</h1><p class="menu-tagline">У каждого есть версия. Только одна — правда.</p><nav class="main-actions" aria-label="Главное меню"><button class="menu-action" id="new-game">Новая игра <span aria-hidden="true">01</span></button><button class="menu-action" id="load-game" ${saved?'':'disabled'}>Продолжить <span aria-hidden="true">02</span></button><button class="menu-action" id="settings">Настройки <span aria-hidden="true">03</span></button><button class="menu-action" id="author">Автор <span aria-hidden="true">04</span></button><button class="menu-action" id="quit">Выход <span aria-hidden="true">05</span></button></nav><div class="menu-note">${saved?`Сохранение доступно · улик ${saved.evidence.length}/3`:'Нет сохранения · сохраните игру звонком на 007'}</div>`);
    $('.panel').classList.add('main-menu');$('#new-game').onclick=()=>{if(readSave())confirmNew();else{activate();startNew();}};$('#load-game').onclick=()=>{const current=readSave();if(current){activate();resume(current);}else main();};$('#settings').onclick=()=>settings('main');$('#author').onclick=author;$('#quit').onclick=quit;
  }
  function confirmNew(){
    screen='confirm-new';
    show('<h2 id="new-title">Начать новую игру?</h2><p id="new-warning">Сохранение будет удалено, а прогресс расследования — потерян. Это действие нельзя отменить.</p><div class="menu-buttons"><button class="choice" id="cancel-new">Отмена</button><button class="primary" id="confirm-new">Начать заново</button></div><p id="new-error" role="status"></p>');
    const dialog=$('.panel');dialog.setAttribute('role','alertdialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','new-title');dialog.setAttribute('aria-describedby','new-warning');
    $('#cancel-new').onclick=main;
    $('#confirm-new').onclick=()=>{try{removeSave();activate();startNew();}catch{$('#new-error').textContent='Не удалось удалить сохранение. Новая игра не начата.';}};
    $('#cancel-new').focus();
  }
  function pause(){screen='pause';show('<div class="eyebrow">НОЧНАЯ СМЕНА</div><h2>Пауза</h2><button class="choice" id="resume-game">Вернуться в игру</button><button class="choice" id="pause-settings">Настройки</button><button class="choice" id="to-main">Главное меню</button><p>Прогресс сохраняется через телефон. Выход в меню не создаёт сохранение.</p>');$('#resume-game').onclick=()=>{screen='game';clear();};$('#pause-settings').onclick=()=>settings('pause');$('#to-main').onclick=main;}
  function settings(from){parent=from;screen='settings';show(`<div class="eyebrow">НОЧНАЯ СМЕНА / ПАРАМЕТРЫ</div><h2>Настройки</h2><label class="setting">Громкость <output id="volume-value">${preferences.volume}%</output><input id="volume" type="range" min="0" max="100" value="${preferences.volume}"></label><label class="setting">Чувствительность мыши <output id="sensitivity-value">${preferences.sensitivity.toFixed(1)}</output><input id="sensitivity" type="range" min="0.5" max="2" step="0.1" value="${preferences.sensitivity}"></label><div class="menu-note" id="setting-status" role="status">Изменения применяются сразу и сохраняются в браузере.</div><div class="menu-buttons"><button class="choice" id="reset-settings">По умолчанию</button><button class="primary" id="back-menu">Назад</button></div>`);
    function change(key,value){preferences[key]=value;apply(preferences);$('#'+key+'-value').textContent=key==='volume'?value+'%':value.toFixed(1);try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(preferences));$('#setting-status').textContent='Настройки сохранены.';}catch{$('#setting-status').textContent='Применено. Браузер не разрешает сохранять настройки.';}}
    for(const key of ['volume','sensitivity'])$('#'+key).oninput=e=>change(key,Number(e.target.value));
    $('#reset-settings').onclick=()=>{Object.assign(preferences,defaults);apply(preferences);try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(preferences));}catch{}settings(from);};$('#back-menu').onclick=()=>from==='pause'?pause():main();
  }
  function author(){screen='author';show('<h2>Автор</h2><div class="author-space"></div><button class="primary" id="author-back">Назад</button>');$('#author-back').onclick=main;}
  function quit(){screen='exit';playing=false;exited=true;document.body.classList.add('in-menu');stopSound();if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});show('<div class="eyebrow">НОЧНАЯ СМЕНА</div><h2>Смена окончена</h2><p>Игра остановлена. Сохранение осталось в браузере. Можно закрыть вкладку или вернуться в меню.</p><button class="primary" id="return-menu">Вернуться в меню</button>');$('#return-menu').onclick=main;if(window.opener)window.close();}
  function back(){if(screen==='settings'){parent==='pause'?pause():main();return true;}if(screen==='author'||screen==='exit'||screen==='confirm-new'){main();return true;}if(screen==='pause'){screen='game';clear();return true;}return screen==='main';}
  document.addEventListener('keydown',event=>{
    if(screen!=='confirm-new'||event.key!=='Tab')return;
    const cancel=$('#cancel-new'),confirm=$('#confirm-new');
    if(event.shiftKey&&document.activeElement===cancel){event.preventDefault();confirm.focus();}
    else if(!event.shiftKey&&document.activeElement===confirm){event.preventDefault();cancel.focus();}
  });
  return {main,pause,back,preferences,get playing(){return playing;},get exited(){return exited;}};
}
