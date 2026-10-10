import * as THREE from 'three';
import {CoffeeOrder, drinks} from './coffee-order.js';
import {createDrinkCup, createSteam} from './drink-cup.js';
import {createPlayerHand} from './player-hand.js';

const clamp = THREE.MathUtils.clamp;
const ease = t => {t=clamp(t,0,1);return t*t*(3-2*t);};

export function createCoffeeInteraction({scene,camera,machine,panel,close,toast,sound=()=>{}}) {
  const order=new CoffeeOrder();
  const {model,cup,stream,screenMap}=machine;
  const handRig=new THREE.Group();handRig.name='held-drink';camera.add(handRig);
  // Camera children need to be in the scene to inherit its lighting and transforms.
  if (!camera.parent) scene.add(camera);
  const hand=createPlayerHand('cup');handRig.add(hand);
  const heldCup=createDrinkCup();handRig.add(heldCup.root);
  const handSteam=createSteam(heldCup.root),machineSteam=createSteam(cup.root);
  const transfer=createDrinkCup();transfer.root.name='drink-pickup';scene.add(transfer.root);
  // Payment lives outside the editable model, so it cannot enlarge its collision box.
  const paymentAnchor=new THREE.Group();paymentAnchor.name='coffee-payment';scene.add(paymentAnchor);
  const paymentHand=createPlayerHand('payment');paymentAnchor.add(paymentHand);
  let handsLoaded=false;
  const ready=Promise.all([hand.ready,paymentHand.ready]).then(()=>{handsLoaded=true;});
  ready.catch(()=>toast('Не удалось загрузить модель руки. Обновите страницу.'));
  const billCanvas=document.createElement('canvas');billCanvas.width=384;billCanvas.height=192;
  const ctx=billCanvas.getContext('2d');ctx.fillStyle='#b5c4c4';ctx.fillRect(0,0,384,192);ctx.strokeStyle='#3c6973';ctx.lineWidth=8;ctx.strokeRect(12,12,360,168);ctx.fillStyle='#355d68';ctx.textAlign='center';ctx.font='bold 82px Georgia';ctx.fillText('50 ₽',192,119);ctx.font='16px Arial';ctx.fillText('ПЯТЬДЕСЯТ РУБЛЕЙ',192,153);
  const billMap=new THREE.CanvasTexture(billCanvas);billMap.colorSpace=THREE.SRGBColorSpace;
  const bill=new THREE.Mesh(new THREE.PlaneGeometry(.105,.055),new THREE.MeshStandardMaterial({map:billMap,side:THREE.DoubleSide,roughness:.85}));paymentHand.add(bill);bill.position.set(-.017,.105,-.027);
  const basePosition=new THREE.Vector3(.20,-.27,-.48),startPosition=new THREE.Vector3(),endPosition=new THREE.Vector3();
  const startQuaternion=new THREE.Quaternion(),endQuaternion=new THREE.Quaternion(),worldScale=new THREE.Vector3();
  const billGrip=new THREE.Vector3(-.017,.105,-.027),gripOffset=new THREE.Vector3();
  let selectedId=null,clock=0,lastScreen='',menuRefresh=null;
  const cooldownText=()=>{const seconds=order.cooldownRemaining;return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};

  function showMenu() {
    selectedId=null;
    panel(`<article class="coffee-menu"><div class="eyebrow">КОФЕЙНЫЙ АВТОМАТ · ГОРЯЧИЕ НАПИТКИ</div><h2>Выбрать напиток</h2><div class="coffee-menu-meta"><span>После покупки — перезарядка 3 минуты</span><span id="coffee-cooldown" aria-live="polite"></span></div><div class="coffee-options">${drinks.map(drink=>`<button class="coffee-option" data-drink="${drink.id}" aria-pressed="false"><span class="coffee-cup-icon" aria-hidden="true">☕</span><strong>${drink.name}</strong><small>${drink.description}</small></button>`).join('')}</div><div class="coffee-checkout"><p id="coffee-selection" role="status"></p><button class="primary" id="pay-coffee" disabled>Купить кофе</button></div></article>`);
    const payment=document.querySelector('#pay-coffee'),status=document.querySelector('#coffee-selection'),cooldown=document.querySelector('#coffee-cooldown');
    let lastKey='';
    function refresh() {
      const key=`${selectedId}|${order.phase}|${order.cooldownRemaining}`;if(key===lastKey)return;lastKey=key;
      document.querySelectorAll('[data-drink]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.drink===selectedId)));
      const drink=drinks.find(drink=>drink.id===selectedId);
      cooldown.textContent=order.cooldownRemaining?`Перезарядка · ${cooldownText()}`:'Можно купить кофе';
      status.textContent=order.phase==='ready'?'Заберите готовый стаканчик из лотка.':
        ['paying','brewing'].includes(order.phase)?'Ваш напиток готовится…':
        order.phase!=='idle'?'Сначала выпейте напиток в руке — нажмите E.':
        order.cooldownRemaining?`Следующая покупка через ${cooldownText()}.`:
        drink?`${drink.name}. Стаканчик появится в лотке после покупки.`:'Выберите напиток.';
      payment.disabled=!drink||order.phase!=='idle'||order.cooldownRemaining>0;
    }
    document.querySelectorAll('[data-drink]').forEach(button=>button.onclick=()=>{selectedId=button.dataset.drink;refresh();});
    payment.onclick=()=>{
      if (!order.pay(selectedId)) return;
      payment.disabled=true;close();menuRefresh=null;syncVisuals(false);sound('pay');toast(`Готовится ${order.drink.name.toLowerCase()}. Следующая покупка — через 3 минуты.`);
    };
    menuRefresh=refresh;refresh();
  }
  function interact(target) {
    if(target.userData.type==='coffeeCup') {
      if(order.take()) {syncVisuals(true);sound('take');}
    } else showMenu();
  }
  function drink() {if(order.drinkNow()){sound('drink');syncVisuals(true);return true;}return false;}
  function hint(target) {
    if(target?.userData.type==='coffeeCup'&&order.phase==='ready')return 'Напиток готов · ЛКМ — взять стаканчик';
    if(target?.userData.type==='coffeeMachine')return 'Выбрать напиток · ЛКМ';
    if(order.phase==='holding')return `${order.drink.name} в руке · E — выпить`;
    if(order.phase==='taking')return 'Вы берёте стаканчик';
    if(order.phase==='drinking')return 'Вы пьёте горячий напиток';
    return '';
  }
  function updateScreen() {
    const idle=order.cooldownRemaining?['ПЕРЕЗАРЯДКА',cooldownText(),'']:['ВЫБЕРИТЕ','НАПИТОК',''];
    const lines={idle,paying:['ОПЛАЧЕНО','ГОТОВИМ',''],brewing:['ГОТОВИМ',(order.drink?.name??'НАПИТОК').toUpperCase(),`${Math.round(order.fill*100)}%`],ready:['ГОТОВО','ЗАБЕРИТЕ','СТАКАНЧИК'],taking:['ПРИЯТНОГО','ПЕРЕРЫВА',''],holding:idle,drinking:idle}[order.phase];
    const key=lines.join('|');if(key===lastScreen)return;lastScreen=key;
    const ctx=screenMap.image.getContext('2d');ctx.fillStyle='#223c32';ctx.fillRect(0,0,256,210);ctx.fillStyle='#b7d2a2';ctx.font='bold 29px monospace';ctx.textAlign='center';lines.forEach((line,i)=>ctx.fillText(line,128,[62,111,175][i],244));screenMap.needsUpdate=true;
  }
  function syncVisuals(visible) {
    const phase=order.phase,color=order.drink?.color;
    const onMachine=['brewing','ready'].includes(phase);
    cup.root.visible=onMachine;cup.root.position.y=.344+(phase==='brewing'?.12*(1-ease(order.elapsed/.55)):0);cup.setFill(order.fill,color);
    stream.visible=phase==='brewing'&&order.elapsed>.65&&order.elapsed<3.9;
    if(stream.visible) {
      const surface=.344+cup.liquid.position.y,length=.497-surface;
      stream.position.y=.497-length/2;stream.scale.set(1+Math.sin(clock*38)*.12,length,1);stream.material.color.set(color);
    }
    const holding=['taking','holding','drinking'].includes(phase);
    handRig.visible=visible&&holding&&handsLoaded;heldCup.root.visible=phase!=='taking';heldCup.setFill(order.fill,color);
    handRig.position.copy(basePosition);handRig.rotation.set(0,0,-.05);
    handRig.position.y+=Math.sin(clock*1.8)*.003;
    if(phase==='taking')handRig.position.y-=.30*(1-ease(order.progress));
    if(phase==='drinking') {
      const lift=ease(order.elapsed/.7),lower=ease((order.elapsed-2.8)/1);
      handRig.position.lerp(new THREE.Vector3(.065,-.20,-.34),lift);
      handRig.position.y-=lower*.55;
      handRig.rotation.x=lift*(1-lower)*(1.04+Math.sin(order.elapsed*11)*.035);
      handRig.rotation.z=-.05+lift*.12;
    }
    transfer.root.visible=visible&&phase==='taking'&&handsLoaded;
    if(phase==='taking') {
      cup.root.getWorldPosition(startPosition);cup.root.getWorldQuaternion(startQuaternion);
      camera.updateMatrixWorld();endPosition.copy(basePosition);camera.localToWorld(endPosition);camera.getWorldQuaternion(endQuaternion);
      const t=ease(order.progress);
      transfer.root.position.lerpVectors(startPosition,endPosition,t);transfer.root.position.y+=Math.sin(t*Math.PI)*.08;
      transfer.root.quaternion.slerpQuaternions(startQuaternion,endQuaternion,t);transfer.root.scale.setScalar(1);transfer.setFill(1,color);
    }
    paymentAnchor.visible=visible&&phase==='paying'&&handsLoaded;
    if(phase==='paying') {
      model.updateWorldMatrix(true,false);model.getWorldPosition(paymentAnchor.position);model.getWorldQuaternion(paymentAnchor.quaternion);model.getWorldScale(worldScale);paymentAnchor.scale.copy(worldScale);
      const t=order.progress,insertion=ease(t/.52),retreat=ease((t-.83)/.17);
      const wrist=ease((t-.08)/.4);
      paymentHand.rotation.set(-Math.PI/2*wrist*(1-retreat*.2),0,-.15*(1-insertion)+retreat*.05);
      gripOffset.copy(billGrip).applyEuler(paymentHand.rotation);
      paymentHand.position.set(.245+.12*(1-insertion),1.51-.18*(1-insertion)-retreat*.23,.41+.30*(1-insertion)+retreat*.20).sub(gripOffset);
      bill.visible=t<.83;bill.position.y=.105+ease((t-.54)/.25)*.10;
    }
    machineSteam.update(clock,onMachine&&order.fill>.1);
    handSteam.update(clock,phase==='holding'||phase==='drinking'&&order.fill>.05);
    updateScreen();
  }
  function update(dt,active) {
    const previous=order.phase;
    if(active&&handsLoaded){clock+=dt;order.update(dt);}
    if(order.phase!==previous) {
      if(order.phase==='brewing')sound('pour');
      if(order.phase==='ready'){sound('ready');toast(`${order.drink.name} готов. Заберите стаканчик из лотка.`);}
      if(order.phase==='holding')toast('Стаканчик в руке. Нажмите E, чтобы выпить.');
      if(previous==='drinking'&&order.phase==='idle')toast(`Вы выпили ${order.drink.name.toLowerCase()}.`);
    }
    if(menuRefresh){if(document.querySelector('.coffee-menu'))menuRefresh();else menuRefresh=null;}
    syncVisuals(active);
  }
  syncVisuals(false);
  return {order,ready,interact,drink,hint,update,snapshot:()=>order.snapshot(),restore(saved){order.restore(saved);clock=0;syncVisuals(false);},
    canTarget(target){return target.userData.type!=='coffeeCup'||order.phase==='ready';}};
}
