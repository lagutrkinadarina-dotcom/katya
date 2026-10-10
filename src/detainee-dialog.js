const player = text => ({speaker:'Игрок',text});
const prisoner = text => ({speaker:'Алиса',text});
const exchange = (...lines) => lines.map((text,index)=>index%2?player(text):prisoner(text));
const option = (text,next) => ({text,next});
export const mainTopics = [
  option('А скидка для сотрудников есть?','discount'),
  option('За что вас задержали?','arrest'),
  option('Смотрю, чувство юмора вы ещё не потеряли.','humor'),
  option('Ладно, не буду мешать.','leave'),
];
export const detaineeNodes = {
  welcome:{lines:[player('Здравствуйте.'),prisoner('Если пришёл поглазеть, хотя бы билет купи.')],topics:true},
  discount:{lines:exchange('Для сотрудников в два раза дороже. Вы меня уже заебали.'),options:[
    option('А пенсионерам бесплатно?','pension'),
    option('За такие деньги можно и представление устроить.','show'),
    option('Пожалуй, откажусь от покупки.','decline'),
  ]},
  pension:{lines:exchange('Ты мне сейчас на сколько лет намекаешь, придурок?','Просто уточняю условия посещения.','Условия простые: ещё слово — и я тебе экскурсию по травмпункту устрою.'),topics:true},
  show:{lines:exchange('Представление? Сейчас будет. Открывай клетку, покажу цирк с конями.','А без открытия клетки?','Тогда смотри через решётку, жадина.'),topics:true},
  decline:{lines:exchange('Вот и правильно. Иди отсюда, пока я тебе абонемент не оформила.'),end:true},
  arrest:{lines:exchange('За то, что в этой стране детям всё можно, а взрослым даже замечание сделать нельзя!'),options:[
    option('В протоколе написано, что вы избили детей.','protocol'),
    option('Что дети вам сделали?','children'),
    option('Вы хоть понимаете, что натворили?','guilt'),
  ]},
  protocol:{lines:exchange('Ой, началось! «Избили, избили»! Слово-то какое громкое.','А как бы вы это назвали?','Конфликт поколений.','С применением физической силы?','Ну не шахматами же нам было выяснять отношения!'),unlock:'fight',topics:true},
  fight:{lines:exchange('Они первые начали! Я спокойно сидела, а они орали и качели раскачивали.','Кто первым применил силу?','Опять ты со своей силой. Я порядок наводила!'),topics:true},
  children:{lines:exchange('Один меня бабкой назвал!','И вы решили его ударить?','Нет, блядь, усыновить!','Сколько вам лет?','Тридцать девять.','Ясно.','ЧТО ТЕБЕ ЯСНО?!'),topics:true},
  guilt:{lines:exchange('Конечно понимаю! Я теперь тут сижу, а эти мелкие засранцы спокойно на качелях катаются!','Вы не считаете себя виноватой?','Я считаю, что качели надо убрать. С них всё началось.','При чём здесь качели?','А при том, что если бы их не было, мне бы не пришлось никого с них снимать!'),topics:true},
  humor:{lines:exchange('А ты, смотрю, чувство самосохранения ещё не приобрёл.'),options:[
    option('Это угроза сотруднику полиции?','threat'),
    option('С таким характером неудивительно, что вы здесь.','character'),
    option('Может, начнём сначала?','restart'),
  ]},
  threat:{lines:exchange('Господи, какие вы нежные. Я ещё даже материться толком не начала.','То есть это не угроза?','Это предупреждение о погодных условиях. Над тобой сгущаются пиздюли.'),topics:true},
  character:{lines:exchange('А ты с таким характером долго не женишься.','Мы сейчас не обо мне разговариваем.','А жаль. У тебя, по-моему, проблем побольше моих.'),topics:true},
  restart:{lines:exchange('Давай. Ты заходишь, здороваешься, я делаю вид, что рада.','Здравствуйте.','Блядь, опять ты.'),topics:true},
  leave:{lines:exchange('Ой, спасибо огромное! А то я тут, знаешь ли, так занята!'),options:[
    option('Чем именно?','vacation'),
    option('Всего доброго.','goodbye'),
    option('Я ещё вернусь.','return'),
  ]},
  vacation:{lines:exchange('Планирую отпуск. Думаю, куда поехать: на нары или к стенке.','У вас сегодня плохое настроение?','Нет, блядь, прекрасное. Просто от счастья решётку обнимаю.'),topics:true},
  goodbye:{lines:exchange('И тебе не хворать, начальник. Дверь за собой закрой.'),end:true,after:'Хотя какую нахуй дверь…'},
  return:{lines:exchange('Только цветы не забудь. И напильник.','Напильник зачем?','Ногти подпилить, блядь. Зачем ещё напильник в кпз?!'),end:true},
};

export function createDetaineeConversation(unlocked=[]){
  const known = new Set(unlocked.filter(id=>id==='fight'));
  let node='welcome',line=0,selected=null;
  return {
    get snapshot(){return [...known];},
    get view(){
      const current=detaineeNodes[node];
      const lines=selected?[player(selected),...current.lines]:current.lines;
      const finished=line===lines.length-1;
      const options=finished?(current.topics?[...mainTopics,...(known.has('fight')?[option('Кто начал драку?','fight')]:[])]:current.options??[]):[];
      return {node,line:lines[line],finished,options,end:finished&&!!current.end,after:current.after};
    },
    advance(){
      if(this.view.finished)return false;
      line++;if(this.view.finished&&detaineeNodes[node].unlock)known.add(detaineeNodes[node].unlock);return true;
    },
    choose(index){
      const choice=this.view.options[index];if(!choice)return false;
      selected=choice.text;node=choice.next;line=0;return true;
    },
  };
}

const escape = text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function detaineeDialog(){
  return `<article class="detainee-dialog" aria-label="Разговор с Алисой">
    <div class="detainee-topics"><h2 id="detainee-title">Алиса</h2><div class="detainee-ornament" aria-hidden="true"><span>◇</span></div>
      <nav aria-label="Варианты ответа" hidden></nav>
    </div>
    <div class="detainee-subtitle"><span class="detainee-speaker"></span><span class="detainee-text" aria-hidden="true"></span><span class="dialog-announcement" role="status"></span></div>
    <div class="detainee-help"><span class="detainee-typing-help">Алиса отвечает…</span><span class="detainee-navigation-help" hidden>↑ ↓ Выбор · Enter Ответить</span><button data-dialog-exit>Esc Выйти</button></div>
  </article>`;
}

// Each visit owns its animation and listeners. Closing a conversation cancels
// pending letters, automatic player lines and selection transitions together.
export function mountDetaineeDialog(element,conversation,{onUpdate,onClose}){
  const text=element.querySelector('.detainee-text'),speaker=element.querySelector('.detainee-speaker');
  const announcement=element.querySelector('.dialog-announcement'),nav=element.querySelector('nav');
  const typingHelp=element.querySelector('.detainee-typing-help'),navigationHelp=element.querySelector('.detainee-navigation-help');
  const subtitle=element.querySelector('.detainee-subtitle');
  const resize=new ResizeObserver(()=>element.style.setProperty('--subtitle-height',`${subtitle.getBoundingClientRect().height}px`));resize.observe(subtitle);
  const seen=new Set(),timers=new Set();
  let disposed=false,typing=false,selecting=false,transitioning=false,raf=0,letters=[],count=0,nextLetter=0;
  const later=(callback,delay)=>{const id=setTimeout(()=>{timers.delete(id);if(!disposed)callback();},delay);timers.add(id);};
  const clear=()=>{cancelAnimationFrame(raf);raf=0;for(const id of timers)clearTimeout(id);timers.clear();};
  const focus=button=>{
    nav.querySelectorAll('button').forEach(item=>item.classList.toggle('is-focused',item===button));
    button?.focus({preventScroll:true});button?.scrollIntoView({block:'nearest'});
  };
  function showOptions(){
    const view=conversation.view;
    // Keep the chosen, dimmed question visible during Alice's entire response;
    // only then crossfade it into the next set of topics.
    nav.classList.add('is-topics-out');transitioning=true;
    later(()=>{
      element.classList.remove('is-selecting');nav.classList.remove('is-topics-out');nav.hidden=false;
      nav.innerHTML=!view.finished?'<button class="detainee-choice" data-advance><span class="dialog-arrow">›</span>Продолжить</button>':
        view.end?'<button class="detainee-choice" data-end><span class="dialog-arrow">›</span>Завершить разговор</button>':
        view.options.map((item,index)=>`<button class="detainee-choice ${seen.has(item.next)?'is-visited':''}" data-response="${index}" style="--choice-delay:${index*90}ms"><span class="dialog-arrow" aria-hidden="true">›</span><span>${escape(item.text)}</span></button>`).join('');
      nav.querySelectorAll('button').forEach(button=>{button.onpointerenter=()=>{if(!selecting&&!transitioning)focus(button);};button.onclick=()=>activate(button);});
      typingHelp.hidden=true;navigationHelp.hidden=false;transitioning=false;focus(nav.querySelector('button'));
    },nav.hidden?0:360);
  }
  function complete(){
    if(disposed||!typing)return;
    typing=false;cancelAnimationFrame(raf);element.classList.remove('is-typing');
    announcement.textContent=`${conversation.view.line.speaker}: ${letters.join('')}`;onUpdate(conversation.snapshot);
    if(conversation.view.line.speaker==='Игрок'&&!conversation.view.finished){
      typingHelp.textContent='Продолжение разговора…';later(advance,900);return;
    }
    showOptions();
  }
  function tick(now){
    if(disposed||!typing||transitioning)return;
    if(now>=nextLetter&&count<letters.length){
      const letter=letters[count++],glyph=document.createElement('span');
      glyph.className='dialog-letter';glyph.textContent=letter;text.append(glyph);
      // Never catch up by dumping a whole sentence after a slow render frame.
      nextLetter=now+(/[.!?…]/.test(letter)?170:/[,;:]/.test(letter)?85:38);
    }
    if(count===letters.length)later(complete,160);else raf=requestAnimationFrame(tick);
  }
  function render({keepChoice=false}={}){
    clear();selecting=false;typing=true;transitioning=true;
    subtitle.classList.remove('is-line-visible');element.classList.add('is-typing');
    typingHelp.hidden=false;typingHelp.textContent=conversation.view.line.speaker==='Алиса'?'Алиса отвечает…':'Продолжение разговора…';navigationHelp.hidden=true;
    if(!keepChoice)nav.classList.add('is-topics-out');
    later(()=>{
      if(!keepChoice){nav.hidden=true;nav.innerHTML='';nav.classList.remove('is-topics-out');element.classList.remove('is-selecting');}
      letters=Array.from(conversation.view.line.text);count=0;nextLetter=0;text.replaceChildren();announcement.textContent='';
      speaker.textContent=`${conversation.view.line.speaker}: `;
      subtitle.classList.add('is-line-visible');transitioning=false;raf=requestAnimationFrame(tick);
    },240);
  }
  function advance(){
    if(disposed||typing||selecting||transitioning)return;
    if(conversation.advance())render();
  }
  function activate(button){
    if(disposed||typing||selecting||transitioning||!button)return;
    if(button.hasAttribute('data-advance')){advance();return;}
    if(button.hasAttribute('data-end')){onClose(conversation.view.after);return;}
    const index=Number(button.dataset.response),choice=conversation.view.options[index];
    if(!choice)return;clear();selecting=true;element.classList.add('is-selecting');button.classList.add('is-chosen');
    nav.querySelectorAll('button').forEach(item=>item.disabled=true);
    later(()=>{
      seen.add(choice.next);conversation.choose(index);
      // The chosen question remains on the right: start Alice's response directly
      // rather than printing the same player question again as a subtitle.
      conversation.advance();render({keepChoice:true});
    },480);
  }
  function keydown(event){
    if(!['ArrowUp','ArrowDown','Enter','Space','Escape','KeyE'].includes(event.code))return;
    event.preventDefault();event.stopImmediatePropagation();
    if(event.code==='Escape'){if(!event.repeat)onClose();return;}
    // Repeated inputs and clicks during typing never reveal the whole sentence.
    if(event.repeat||typing||selecting||transitioning)return;
    if(['Enter','Space','KeyE'].includes(event.code)){activate(nav.querySelector('.is-focused')??nav.querySelector('button'));return;}
    if(nav.hidden)return;
    const buttons=[...nav.querySelectorAll('button')],index=buttons.findIndex(button=>button.classList.contains('is-focused'));
    focus(buttons[(index+(event.code==='ArrowUp'?-1:1)+buttons.length)%buttons.length]);
  }
  document.addEventListener('keydown',keydown,true);
  element.querySelector('[data-dialog-exit]').onclick=()=>onClose();
  subtitle.onclick=()=>{if(!typing&&!transitioning&&!conversation.view.finished)advance();};
  render();
  return {dispose(){disposed=true;clear();resize.disconnect();document.removeEventListener('keydown',keydown,true);}};
}
