import photoAtlasUrl from './assets/notice-photos.png';
const photoAtlas=new Image();
export const noticePhotosReady=new Promise((resolve,reject)=>{photoAtlas.onload=resolve;photoAtlas.onerror=reject;});
photoAtlas.src=photoAtlasUrl;
export function drawNoticePhoto(ctx,index,x,y,w,h){
  if(!photoAtlas.complete||!photoAtlas.naturalWidth)return false;
  const cellW=photoAtlas.naturalWidth/3,cellH=photoAtlas.naturalHeight/2;
  ctx.drawImage(photoAtlas,(index%3)*cellW,Math.floor(index/3)*cellH,cellW,cellH,x,y,w,h);return true;
}
// Fictional local notices, with distinct illustrated portraits and large readable copy.
export const noticeDocuments=[
  {title:'ПРОПАЛ РЕБЁНОК',name:'МИША СОКОЛОВ • 9 ЛЕТ',kind:'child',lines:['Ушёл из школы 8 октября.','Последний раз замечен у парка.','Синяя куртка, красный рюкзак.','Если видели Мишу — сообщите','дежурному. Не оставайтесь','равнодушными.'],footer:'ПОМОГИТЕ НАЙТИ • 102'},
  {title:'РАЗЫСКИВАЕТСЯ МУЖЧИНА',name:'ВИКТОР ОРЛОВ • 38 ЛЕТ',kind:'man',lines:['Разыскивается по делу о краже','в мастерской на Заводской, 12.','Рост 180 см. Шрам над бровью.','Носит тёмную кожаную куртку.','Самостоятельно не задерживать.','Сообщите приметы дежурному.'],footer:'ОРИЕНТИРОВКА № 041'},
  {title:'ОСТОРОЖНО!',name:'НАПАДЕНИЯ БЕЗДОМНЫХ СОБАК',kind:'street',lines:['Стая замечена у старого гаража','на улице Лесной. Есть пострадавшие.','Не подходите и не кормите собак.','Детей провожайте до школы.','При нападении ищите укрытие.','Сообщите место встречи в участок.'],footer:'ЭКСТРЕННАЯ ПОМОЩЬ • 112'},
  {title:'ПРОПАЛА ЖЕНЩИНА',name:'АННА БЕЛОВА • 67 ЛЕТ',kind:'woman',lines:['6 октября не вернулась с рынка.','Седые волосы, зелёное пальто,','небольшая сумка в клетку.','Может нуждаться в помощи.','Видели Анну на остановке?','Пожалуйста, обратитесь в участок.'],footer:'ВАЖНА ЛЮБАЯ ИНФОРМАЦИЯ • 102'},
  {title:'НУЖНЫ СВИДЕТЕЛИ',name:'УБИЙСТВО ИЛЬИ ГРОМОВА',kind:'crime',lines:['Журналист убит в клубе «Ринг».','Время: между 22:00 и 22:10.','Вы были на турнире или рядом?','Передайте записи и наблюдения','следователю в участке № 7.','Даже малая деталь может помочь.'],footer:'ДЕЛО «ПОСЛЕДНИЙ РАУНД» • 041'},
  {title:'ОРИЕНТИРОВКА',name:'НЕИЗВЕСТНЫЙ У СКЛАДА',kind:'cctv',lines:['Кадр камеры у склада № 3.','Мужчина замечен ночью 6 октября.','Тёмная куртка, светлая сумка.','Вы узнали человека на записи?','Сообщите дежурному участка № 7.','Не пытайтесь задержать его сами.'],footer:'КАМЕРА 03 • 06.10.2026 • 01:17'}
];
function illustration(ctx,kind){
  ctx.save();ctx.translate(100,250);ctx.beginPath();ctx.rect(0,0,824,380);ctx.clip();ctx.fillStyle='#9aa697';ctx.fillRect(0,0,824,380);
  ctx.fillStyle='#7b8b82';for(let i=0;i<8;i++)ctx.fillRect(i*112,60+i%3*35,65,320);
  if(['child','man','woman'].includes(kind)){
    const child=kind==='child',woman=kind==='woman';
    ctx.fillStyle=child?'#344d71':woman?'#4d6652':'#343738';ctx.beginPath();ctx.ellipse(412,390,child?156:210,190,0,Math.PI,2*Math.PI);ctx.fill();
    ctx.fillStyle=woman?'#b7b5ab':'#453b31';ctx.beginPath();ctx.ellipse(412,151,110,142,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#cfac88';ctx.beginPath();ctx.ellipse(412,169,91,117,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=woman?'#b7b5ab':'#453b31';ctx.beginPath();ctx.ellipse(407,70,100,52,-.15,Math.PI,2*Math.PI);ctx.fill();
    ctx.strokeStyle='#4d3d33';ctx.lineWidth=6;for(const x of [377,446]){ctx.beginPath();ctx.moveTo(x-15,147);ctx.lineTo(x+15,145);ctx.stroke();}
    ctx.fillStyle='#26322e';for(const x of [377,446]){ctx.beginPath();ctx.ellipse(x,163,7,9,0,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle='#8c6550';ctx.beginPath();ctx.moveTo(412,171);ctx.lineTo(403,208);ctx.lineTo(418,211);ctx.stroke();ctx.beginPath();ctx.moveTo(385,238);ctx.quadraticCurveTo(411,247,439,236);ctx.stroke();
    if(child){ctx.fillStyle='#99443c';ctx.fillRect(244,304,37,76);ctx.fillRect(542,304,37,76);}
    if(kind==='man'){ctx.strokeStyle='#c59b83';ctx.beginPath();ctx.moveTo(434,131);ctx.lineTo(462,142);ctx.stroke();}
    if(woman){ctx.strokeStyle='#4e4c44';ctx.lineWidth=5;ctx.strokeRect(350,149,58,35);ctx.strokeRect(421,149,58,35);ctx.beginPath();ctx.moveTo(408,162);ctx.lineTo(421,162);ctx.stroke();}
  }else{
    const cctv=kind==='cctv',crime=kind==='crime';
    ctx.fillStyle=cctv?'#667568':crime?'#454c50':'#a4aca2';ctx.fillRect(0,0,824,380);
    ctx.fillStyle=cctv?'#34483d':'#747b71';ctx.beginPath();ctx.moveTo(290,110);ctx.lineTo(500,110);ctx.lineTo(824,380);ctx.lineTo(0,380);ctx.fill();
    for(let i=0;i<4;i++){const x=i<2?i*120:570+(i-2)*135;ctx.fillStyle=i%2?'#646c61':'#858777';ctx.fillRect(x,30+i%2*25,110,240);ctx.fillStyle='#353f3c';for(let row=0;row<3;row++)for(let col=0;col<2;col++)ctx.fillRect(x+15+col*45,60+row*58,24,36);}
    if(crime){
      ctx.fillStyle='#c9bb94';ctx.fillRect(269,83,285,128);ctx.fillStyle='#293b39';ctx.fillRect(345,132,100,79);ctx.fillStyle='#dfd4ae';ctx.font='bold 32px Arial';ctx.textAlign='center';ctx.fillText('КЛУБ «РИНГ»',412,120);
      ctx.strokeStyle='#d1b645';ctx.lineWidth=28;ctx.beginPath();ctx.moveTo(45,280);ctx.lineTo(774,225);ctx.stroke();ctx.fillStyle='#2f3331';ctx.font='bold 25px Arial';ctx.save();ctx.translate(180,278);ctx.rotate(-.07);ctx.fillText('ПОЛИЦИЯ • НЕ ПЕРЕСЕКАТЬ',230,0);ctx.restore();
      ctx.fillStyle='#e5d5a2';ctx.beginPath();ctx.moveTo(481,352);ctx.lineTo(505,303);ctx.lineTo(529,352);ctx.fill();ctx.fillStyle='#303930';ctx.fillText('1',505,340);
    }else if(cctv){
      ctx.fillStyle='#1c2c26';ctx.beginPath();ctx.arc(413,172,23,0,Math.PI*2);ctx.fill();ctx.fillRect(388,194,50,88);ctx.fillRect(389,270,17,65);ctx.fillRect(420,270,17,65);ctx.fillStyle='#b9beb0';ctx.fillRect(447,237,43,56);
      ctx.strokeStyle='#c5d0bb';ctx.lineWidth=3;ctx.strokeRect(365,137,134,216);ctx.font='22px monospace';ctx.textAlign='left';ctx.fillStyle='#d0dbc5';ctx.fillText('CAM 03   06.10.2026  01:17:24',22,30);ctx.fillText('REC',700,350);ctx.fillStyle='#a74137';ctx.beginPath();ctx.arc(684,342,6,0,7);ctx.fill();
      ctx.fillStyle='#111c1720';for(let y=0;y<380;y+=5)ctx.fillRect(0,y,824,2);
    }else{ctx.fillStyle='#b6bdb0';ctx.beginPath();ctx.moveTo(412,170);ctx.lineTo(390,380);ctx.lineTo(415,380);ctx.fill();ctx.fillStyle='#534d40';ctx.fillRect(680,155,10,173);ctx.fillStyle='#d8d0ae';ctx.fillRect(625,135,130,61);ctx.fillStyle='#323e35';ctx.font='bold 23px Arial';ctx.textAlign='center';ctx.fillText('УЛ. ЛЕСНАЯ',690,174);}
  }
  // Grain and faded corners make these look like printed low-poly photographs.
  let seed=kind.length*731;for(let i=0;i<2200;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%824;seed=(seed*1664525+1013904223)>>>0;ctx.fillStyle=i%2?'#e8dfc014':'#10201b18';ctx.fillRect(x,seed%380,2,2);}
  ctx.restore();
}
function photo(ctx,kind,x,y,w,h){const index=noticeDocuments.findIndex(n=>n.kind===kind);if(drawNoticePhoto(ctx,index,x,y,w,h))return;ctx.save();ctx.translate(x,y);ctx.scale(w/824,h/380);ctx.translate(-100,-250);illustration(ctx,kind);ctx.restore();}
function copy(ctx,lines,x,y,width,size=43,gap=64){ctx.textAlign='left';ctx.font=`${size}px Arial`;ctx.fillStyle='#28342e';lines.forEach((line,i)=>ctx.fillText(line,x,y+i*gap,width));}
export function drawNotice(ctx,w,h,index){
  const n=noticeDocuments[index],papers=['#eee4cd','#d9ddcf','#ede4ba','#e4d3ba','#e5dfcf','#d1d8cd'];
  ctx.fillStyle=papers[index];ctx.fillRect(0,0,w,h);ctx.textAlign='center';
  const title=(y,size=67)=>{ctx.fillStyle=index===2?'#343c2e':'#793b30';ctx.font=`bold ${size}px Arial`;ctx.fillText(n.title,w/2,y,w-75);};
  const subtitle=y=>{ctx.fillStyle='#29382f';ctx.font='bold 43px Arial';ctx.fillText(n.name,w/2,y,w-75);};
  if(index===0){
    title(100);subtitle(175);photo(ctx,n.kind,290,225,444,370);ctx.strokeStyle='#8c4435';ctx.lineWidth=7;ctx.strokeRect(280,215,464,390);copy(ctx,n.lines,65,695,w-130,45,64);
  }else if(index===1){
    ctx.strokeStyle='#843f34';ctx.lineWidth=10;ctx.strokeRect(25,25,w-50,h-50);title(102,61);subtitle(182);photo(ctx,n.kind,75,238,490,403);
    ctx.textAlign='left';ctx.fillStyle='#763c32';ctx.font='bold 39px Arial';['РОСТ','180 см','ОСОБАЯ','ПРИМЕТА:','ШРАМ'].forEach((line,i)=>ctx.fillText(line,622,285+i*67));copy(ctx,n.lines,65,724,w-130,43,62);
  }else if(index===2){
    ctx.fillStyle='#a19242';ctx.fillRect(0,0,w,146);title(107,83);subtitle(211);photo(ctx,n.kind,55,259,914,305);copy(ctx,n.lines,65,674,w-130,44,68);
    ctx.strokeStyle='#625f3c';ctx.lineWidth=3;ctx.strokeRect(43,599,w-86,483);
  }else if(index===3){
    title(112,65);photo(ctx,n.kind,290,184,444,365);subtitle(628);copy(ctx,n.lines,65,721,w-130,44,62);
    ctx.strokeStyle='#8c775f';ctx.lineWidth=3;ctx.strokeRect(52,45,w-104,1044);
  }else if(index===4){
    ctx.fillStyle='#293b39';ctx.fillRect(0,0,w,143);ctx.fillStyle='#f5edda';ctx.font='bold 72px Arial';ctx.fillText(n.title,w/2,103,w-60);subtitle(218);photo(ctx,n.kind,47,264,930,364);copy(ctx,n.lines,65,728,w-130,44,61);
    ctx.fillStyle='#793b30';ctx.textAlign='right';ctx.font='bold 29px monospace';ctx.fillText('УЧАСТОК № 7 / ДЕЛО 041',w-64,1101);
  }else{
    ctx.textAlign='left';ctx.fillStyle='#293b39';ctx.font='bold 63px Arial';ctx.fillText(n.title,55,102,w-100);ctx.font='bold 37px Arial';ctx.fillText(n.name,55,174,w-100);photo(ctx,n.kind,50,231,924,421);copy(ctx,n.lines,65,741,w-130,43,60);
    ctx.strokeStyle='#475c4c';ctx.lineWidth=4;ctx.strokeRect(35,217,w-70,451);
  }
  ctx.fillStyle=index===2?'#5b613b':'#793b30';ctx.fillRect(42,1140,w-84,78);ctx.fillStyle='#f5edda';ctx.textAlign='center';ctx.font='bold 31px Arial';ctx.fillText(n.footer,w/2,1192,w-120);
  // Deterministic wear: edge stains, creases and tiny marks, away from the text.
  ctx.strokeStyle='#887e6040';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(17,0);ctx.lineTo(24,h);ctx.stroke();ctx.fillStyle='#8b76501b';for(let i=0;i<60;i++){const x=i%2?8:w-15;ctx.fillRect(x,(i*79+index*31)%h,5+(i%5),7);}
  ctx.strokeStyle='#806f4930';ctx.beginPath();ctx.moveTo(w-40,0);ctx.lineTo(w-22,38);ctx.lineTo(w,42);ctx.stroke();
}

export const noticeDetails=[
 ['Последним Мишу видел продавец у северного входа в парк. Мальчик спрашивал дорогу к автобусной остановке.', 'В красном рюкзаке была тетрадь с рисунками поездов. Он может искать дорогу к старому вокзалу.', 'Если встретите ребёнка, останьтесь рядом и позвоните 102. Не увозите его самостоятельно.'],
 ['Орлов подрабатывал в мастерской и знал, где хранятся инструменты. После закрытия дверь была открыта ключом.', 'Сосед заметил человека с длинной сумкой возле двора. Лица он не рассмотрел.', 'Следователю нужны сведения о перемещениях Орлова. Ориентировка не заменяет решение суда.'],
 ['Жители Лесной сообщают, что стая собирается возле заброшенного гаража после наступления темноты.', 'Особенно опасен узкий проход между гаражами: там трудно отойти в сторону.', 'Не бегите и не делайте резких движений. Медленно отступайте к подъезду; при угрозе звоните 112.'],
 ['Анна обычно возвращается с рынка одним маршрутом. На остановке её узнали, но в привычный автобус она не села.', 'В сумке мог лежать адрес родственницы. Женщина плохо ориентируется в незнакомых кварталах.', 'Не пугайте её вопросами. Предложите присесть в безопасном месте и сообщите дежурному.'],
 ['Громов готовил материал о договорных боях. Редакция ждала от него последнюю часть расследования вечером после турнира.', 'Следствию важны не только события в раздевалке, но и люди у служебного входа клуба между 21:30 и 22:15.', 'Фотографии зрителей и записи телефонов могут помочь восстановить последовательность событий. Сохраните оригиналы; не публикуйте материалы до разговора со следователем.'],
 ['Камера склада записывает без звука. Время на ней может отставать на несколько минут — это ещё проверяют.', 'Человек несколько раз подходил к двери, затем исчез из кадра. Светлая сумка осталась в его руке.', 'Если узнали походку или одежду, сообщите дежурному. По одному размытому кадру нельзя установить вину человека.']
];
