// Fictional local notices, with distinct illustrated portraits and large readable copy.
const notices=[
  {title:'ПРОПАЛ РЕБЁНОК',name:'МИША СОКОЛОВ • 9 ЛЕТ',kind:'child',lines:['Ушёл из школы 8 октября.','Последний раз замечен у парка.','Синяя куртка, красный рюкзак.','Если видели Мишу — сообщите','дежурному. Не оставайтесь','равнодушными.'],footer:'ПОМОГИТЕ НАЙТИ • 102'},
  {title:'РАЗЫСКИВАЕТСЯ МУЖЧИНА',name:'ВИКТОР ОРЛОВ • 38 ЛЕТ',kind:'man',lines:['Разыскивается по делу о краже','в мастерской на Заводской, 12.','Рост 180 см. Шрам над бровью.','Носит тёмную кожаную куртку.','Самостоятельно не задерживать.','Сообщите приметы дежурному.'],footer:'ОРИЕНТИРОВКА № 041'},
  {title:'ОСТОРОЖНО!',name:'НАПАДЕНИЯ БЕЗДОМНЫХ СОБАК',kind:'dog',lines:['Стая замечена у старого гаража','на улице Лесной. Есть пострадавшие.','Не подходите и не кормите собак.','Детей провожайте до школы.','При нападении ищите укрытие.','Сообщите место встречи в участок.'],footer:'ЭКСТРЕННАЯ ПОМОЩЬ • 112'},
  {title:'ПРОПАЛА ЖЕНЩИНА',name:'АННА БЕЛОВА • 67 ЛЕТ',kind:'woman',lines:['6 октября не вернулась с рынка.','Седые волосы, зелёное пальто,','небольшая сумка в клетку.','Может нуждаться в помощи.','Видели Анну на остановке?','Пожалуйста, обратитесь в участок.'],footer:'ВАЖНА ЛЮБАЯ ИНФОРМАЦИЯ • 102'},
  {title:'НУЖНЫ СВИДЕТЕЛИ',name:'ПРОИСШЕСТВИЕ У МОСТА',kind:'bridge',lines:['7 октября, примерно в 23:40,','у речного моста слышали крик.','С места уехал белый фургон.','Если вы были рядом или у вас','есть запись видеорегистратора,','передайте её следователю.'],footer:'МАТЕРИАЛЫ ДЕЛА № 041'},
  {title:'ПРИЁМ ГРАЖДАН',name:'УЧАСТОК № 7',kind:'station',lines:['Дежурная часть работает 24 часа.','Заявления принимаем ежедневно.','При себе желательно иметь паспорт.','Потеряли документы или вещи?','Расскажите дежурному о случившемся.','Он подскажет, к кому обратиться.'],footer:'ПОМНИТЕ: ВЫ МОЖЕТЕ ПОМОЧЬ'}
];
function illustration(ctx,kind){
  ctx.save();ctx.translate(100,250);ctx.fillStyle='#9aa697';ctx.fillRect(0,0,824,380);
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
  }else if(kind==='dog'){
    ctx.fillStyle='#665444';ctx.beginPath();ctx.ellipse(423,235,177,88,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(270,150,69,67,-.3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(214,139);ctx.lineTo(222,37);ctx.lineTo(269,107);ctx.fill();ctx.beginPath();ctx.moveTo(275,111);ctx.lineTo(313,42);ctx.lineTo(324,146);ctx.fill();ctx.fillStyle='#453b32';ctx.fillRect(309,266,27,96);ctx.fillRect(516,266,27,96);ctx.beginPath();ctx.ellipse(209,184,57,28,-.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e2caa2';ctx.beginPath();ctx.arc(253,145,7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#665444';ctx.lineWidth=28;ctx.beginPath();ctx.moveTo(566,217);ctx.quadraticCurveTo(660,140,622,103);ctx.stroke();
  }else{
    ctx.fillStyle='#475b62';ctx.fillRect(0,0,824,380);ctx.fillStyle='#c8bea1';
    if(kind==='bridge'){ctx.fillRect(40,165,744,25);for(let i=0;i<7;i++)ctx.fillRect(60+i*108,110,12,180);ctx.fillRect(40,110,744,10);ctx.fillStyle='#deddd0';ctx.fillRect(448,121,133,53);ctx.fillStyle='#242d32';ctx.beginPath();ctx.arc(472,178,14,0,7);ctx.arc(551,178,14,0,7);ctx.fill();}
    else{ctx.fillRect(170,50,480,330);ctx.fillStyle='#2e403e';ctx.fillRect(320,193,175,187);ctx.fillRect(195,96,115,79);ctx.fillRect(515,96,115,79);ctx.fillStyle='#e5dec6';ctx.font='bold 35px Arial';ctx.textAlign='center';ctx.fillText('УЧАСТОК № 7',412,85);}
  }
  ctx.restore();
}
export function drawNotice(ctx,w,h,index){
  const n=notices[index];ctx.fillStyle=index%2?'#e2dbc6':'#eee6d1';ctx.fillRect(0,0,w,h);
  ctx.textAlign='center';ctx.fillStyle='#793b30';ctx.font='bold 53px Arial';ctx.fillText(n.title,w/2,90,w-70);
  ctx.fillStyle='#29382f';ctx.font='bold 34px Arial';ctx.fillText(n.name,w/2,160,w-70);illustration(ctx,n.kind);
  ctx.textAlign='left';ctx.font='35px Arial';n.lines.forEach((line,i)=>ctx.fillText(line,65,710+i*65,w-130));
  ctx.fillStyle='#793b30';ctx.fillRect(42,1140,w-84,78);ctx.fillStyle='#f5edda';ctx.textAlign='center';ctx.font='bold 31px Arial';ctx.fillText(n.footer,w/2,1192,w-120);
}
