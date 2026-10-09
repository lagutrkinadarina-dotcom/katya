import portrait from './assets/officer-lebedev.png';

const questions={
  start:{
    question:'С чего начать расследование?',
    lines:[
      'Начните с кабинета следователя. Там вы сможете ознакомиться с доступными делами и изучить первоначальные материалы.',
      'Если понадобится дополнительная информация, загляните в архив. Там хранятся документы, старые дела и другие материалы, которые могут пригодиться.',
      'А когда появятся вопросы к свидетелям или подозреваемым, отправляйтесь в допросную.',
      'В каком порядке действовать — решать вам. Главное, не упускайте детали. Иногда одна мелочь может изменить ход всего расследования.',
    ],
  },
  save:{
    question:'Как сохранить игру?',
    lines:[
      'Видите телефон рядом с Вами? Через него можно сохранить игру.',
      'Просто подойдите к телефону и взаимодействуйте с ним.',
    ],
  },
};
const welcome='Доброй ночи. Я Лебедев, дежурный. Вам передали дело об убийстве журналиста Ильи Громова. Марина Соколова ждёт наверху. Ваша задача — выяснить, что произошло, проверить её версию и принять решение на основании доказательств. После нашего разговора вы сможете открыть дверь в проходе к лестнице и подняться на второй этаж.';
const icon=paths=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const icons={
  start:icon('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.3 15.3 5 5"/>'),
  save:icon('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1Z"/>'),
};
const arrow=icon('<path d="m9 5 7 7-7 7"/>');

export function officerDialog(topic='welcome'){
  const reply=questions[topic];
  const conversation=reply?
    `<div class="officer-player"><span>Игрок</span><p>«${reply.question}»</p></div><div class="officer-answer" aria-live="polite"><span class="officer-speaker">Дежурный Лебедев:</span>${reply.lines.map(line=>`<p>— ${line}</p>`).join('')}</div>`:
    `<div class="officer-answer"><p>${welcome}</p></div>`;
  return `<article class="officer-dialog">
    <div class="officer-hero"><img src="${portrait}" alt="Дежурный Лебедев за стойкой участка" fetchpriority="high"></div>
    <div class="officer-content">
      <div class="officer-location">1 ЭТАЖ / ДЕЖУРНАЯ ЧАСТЬ</div>
      <h2 id="lebedev-title" tabindex="-1">Дежурный Лебедев</h2>
      ${conversation}
      <nav class="officer-questions" aria-label="Вопросы дежурному">${Object.entries(questions).map(([key,item])=>`<button class="officer-question" data-brief="${key}" aria-pressed="${key===topic}"><span class="officer-icon">${icons[key]}</span><span>${item.question}</span><span class="officer-arrow">${arrow}</span></button>`).join('')}</nav>
      <div class="officer-actions"><button class="officer-finish" id="leave-officer">Спасибо. Приступаю к делу.</button></div>
    </div>
  </article>`;
}
