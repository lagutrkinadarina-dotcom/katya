const player = text => ({speaker:'Игрок',text});
const prisoner = text => ({speaker:'Заключённая',text});
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
export function detaineeDialog(view){
  return `<article class="detainee-dialog"><div class="eyebrow">КАМЕРА ВРЕМЕННОГО СОДЕРЖАНИЯ</div><h2 id="detainee-title">Заключённая</h2>
    <div class="detainee-line" aria-live="polite"><span>${view.line.speaker}</span><p>— ${escape(view.line.text)}</p></div>
    <nav aria-label="Варианты ответа">${!view.finished?'<button class="detainee-choice" data-advance>Продолжить <span>↵</span></button>':view.end?'<button class="detainee-choice" data-end>Завершить разговор <span>↵</span></button>':view.options.map((item,index)=>`<button class="detainee-choice" data-response="${index}"><span class="dialog-arrow">›</span>${escape(item.text)}</button>`).join('')}</nav>
    <div class="detainee-help">↑ ↓ — выбрать · Enter — ответить · Esc — выйти</div></article>`;
}
