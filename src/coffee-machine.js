import * as THREE from 'three';
import {drinks} from './coffee-order.js';
import {createDrinkCup} from './drink-cup.js';

export function createCoffeeMachine(scene,{ground,rounded,mesh,panel,canvasMap,pipe}){
  const root=new THREE.Group();root.position.set(2.40,ground,-2.78);root.rotation.y=-Math.PI/2;scene.add(root);root.name='coffee-machine';root.userData.editor={id:'coffee-machine',label:'Кофейный автомат',solid:true};
  // The editor centres the root; this inner group keeps animation coordinates stable.
  const model=new THREE.Group();root.add(model);
  const mat=(color,roughness=.6,metalness=.2)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const body=mat('#292e2b'),metal=mat('#727870',.42,.65),black=mat('#151c19'),paper=mat('#d1c4a4'),brown=mat('#615044');
  rounded(.73,1.89,.57,0,.96,0,body,model);
  for(const x of [-.352,.352])rounded(.025,1.84,.035,x,.97,.302,metal,model);
  rounded(.51,1.23,.035,-.076,1.22,.302,black,model);
  const buttons=[];
  for(let row=0;row<6;row++)for(let col=0;col<2;col++){
    const x=-.196+col*.245,y=1.71-row*.187;
    rounded(.188,.145,.012,x,y,.327,paper,model);
    const drink=drinks[row*2+col];
    const label=canvasMap((ctx,w,h)=>{ctx.fillStyle=col?'#c9b383':'#d9cbb0';ctx.fillRect(0,0,w,h);ctx.fillStyle='#4d4133';ctx.fillRect(24,36,52,43);ctx.strokeStyle='#4d4133';ctx.lineWidth=6;ctx.strokeRect(74,43,16,22);ctx.fillStyle='#263b31';ctx.font='bold 20px Arial';ctx.textAlign='center';ctx.fillText(drink.name.toUpperCase(),w/2,109,w-12);},220,130);
    const button=panel(label,.178,.135,x,y,.336,model);button.userData={type:'coffeeMachine',drinkId:drink.id};buttons.push(button);
  }
  const light=new THREE.MeshStandardMaterial({color:'#d5e9d7',emissive:'#bcdbc9',emissiveIntensity:.7});
  for(const x of [-.322,.163])rounded(.008,1.20,.009,x,1.21,.329,light,model);
  rounded(.14,.30,.022,.245,1.58,.321,metal,model);
  const screenMap=canvasMap((ctx,w,h)=>{ctx.fillStyle='#223c32';ctx.fillRect(0,0,w,h);ctx.fillStyle='#b7d2a2';ctx.font='bold 34px monospace';ctx.textAlign='center';ctx.fillText('ВЫБЕРИТЕ',w/2,62);ctx.fillText('НАПИТОК',w/2,111);ctx.fillText('50 ₽',w/2,175);},256,210);
  const screen=panel(screenMap,.108,.088,.245,1.64,.335,model);
  rounded(.115,.011,.012,.245,1.51,.342,black,model);
  for(let row=0;row<4;row++)for(let col=0;col<3;col++)rounded(.022,.025,.01,.210+col*.032,1.32-row*.037,.334,paper,model);
  rounded(.09,.055,.016,.245,1.11,.334,metal,model);rounded(.064,.011,.004,.245,1.11,.345,black,model);
  rounded(.49,.23,.035,-.076,.44,.303,black,model);
  rounded(.47,.02,.18,-.076,.33,.38,metal,model);
  const cup=createDrinkCup();model.add(cup.root);cup.root.position.set(-.075,.344,.38);cup.root.visible=false;cup.body.userData={type:'coffeeCup'};
  rounded(.017,.054,.028,-.075,.524,.38,metal,model);
  const stream=mesh(new THREE.CylinderGeometry(.0025,.0035,1,8),brown,-.075,.48,.38,model);stream.scale.y=.05;stream.visible=false;stream.name='coffee-stream';
  for(let i=0;i<9;i++)rounded(.033,.002,.11,-.252+i*.044,.342,.38,black,model);
  for(const x of [-.28,.28])for(const z of [-.20,.20])rounded(.06,.024,.06,x,.012,z,black,model);
  const side=canvasMap((ctx,w,h)=>{ctx.fillStyle='#292e2b';ctx.fillRect(0,0,w,h);ctx.fillStyle='#c1b28f';ctx.font='bold 55px Georgia';ctx.textAlign='center';ctx.fillText('КОФЕ',w/2,120);ctx.fillRect(170,250,170,110);ctx.strokeStyle='#c1b28f';ctx.lineWidth=13;ctx.strokeRect(333,271,53,54);ctx.font='35px Georgia';ctx.fillText('НОЧНАЯ СМЕНА',w/2,480);for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(207+i*41,225);ctx.bezierCurveTo(177+i*41,198,231+i*41,180,207+i*41,153);ctx.stroke();}},512,640);
  const sidePanel=panel(side,.48,.60,.371,1.20,0,model);sidePanel.rotation.y=Math.PI/2;
  const target=new THREE.Mesh(new THREE.PlaneGeometry(.72,1.88),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));target.position.set(0,.96,.325);target.userData.type='coffeeMachine';model.add(target);
  // Trim follows the same body footprint, with no glass panel crossing the aisle.
  return {root,model,cup,stream,screenMap,screen,targets:[...buttons,target,cup.body]};
}
