import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

let timberMap;

// All furnishings are dimensional models. Canvas maps provide readable paper,
// instrument and screen faces; they never replace room geometry.
export function createInteriorPropKit(parent) {
  const mats=new Map(),geometries=new Map();
  const material=(color,roughness=.78,metalness=0)=>{
    const key=[color,roughness,metalness].join('/');
    if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));
    return mats.get(key);
  };
  const m={metal:material('#63716d',.45,.65),steel:material('#bcc5bd',.33,.77),dark:material('#263632',.7,.12),wood:material('#625241',.74),edge:material('#978269',.57),paper:material('#e2dccb'),ink:material('#2c3937'),plastic:material('#d4d8cb',.54),black:material('#20282a',.46),blue:material('#647d80'),red:material('#943d35'),glass:new THREE.MeshPhysicalMaterial({color:'#bed8d8',roughness:.18,metalness:.05,transparent:true,opacity:.4,depthWrite:false})};
  // This grain is the CC0 Wayfair chair texture; provenance is recorded with
  // the downloaded station kit. A shared map keeps six rooms inexpensive.
  if(!timberMap){timberMap=new THREE.TextureLoader().load(import.meta.env.BASE_URL+'assets/station-kit/wood-grain.jpg');timberMap.colorSpace=THREE.SRGBColorSpace;timberMap.wrapS=timberMap.wrapT=THREE.RepeatWrapping;timberMap.repeat.set(1.6,1);timberMap.anisotropy=4;}
  m.wood.map=timberMap;
  function mesh(geometry,mat,x=0,y=0,z=0,host=parent){const o=new THREE.Mesh(geometry,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;host.add(o);return o;}
  function box(w,h,d,x,y,z,mat=m.wood,host=parent,r=.012){
    const radius=Math.min(r,w/4,h/4,d/4),key=[w,h,d,radius].join('/');
    if(!geometries.has(key))geometries.set(key,new RoundedBoxGeometry(w,h,d,2,radius));
    return mesh(geometries.get(key),mat,x,y,z,host);
  }
  const cylinder=(r1,r2,h,x,y,z,mat=m.metal,host=parent,segments=16)=>mesh(new THREE.CylinderGeometry(r1,r2,h,segments),mat,x,y,z,host);
  function rod(a,b,r=.012,mat=m.metal,host=parent){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),v=to.clone().sub(from);const o=cylinder(r,r,v.length(),0,0,0,mat,host);o.position.copy(from.add(to).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
  function group(x=0,y=0,z=0,host=parent,yaw=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=yaw;host.add(g);return g;}
  function map(draw,w=768,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
  function plane(texture,w,h,x,y,z,host=parent){return mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:texture,roughness:.85}),x,y,z,host);}
  function label(text,w,h,x,y,z,host=parent,{bg='#253c36',fg='#e5ddbd',border=true}={}){
    const t=map((c,W,H)=>{c.fillStyle=bg;c.fillRect(0,0,W,H);if(border){c.strokeStyle='#adab8e';c.lineWidth=5;c.strokeRect(9,9,W-18,H-18);}c.fillStyle=fg;c.font='bold 56px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(text,W/2,H/2,W-34);},1024,192);
    return plane(t,w,h,x,y,z,host);
  }
  function paper(x,y,z,host=parent,{title='СЛУЖЕБНАЯ ЗАПИСКА',color='#e2dccb',rotation=0,w=.21,d=.29}={}){
    const g=group(x,y,z,host,rotation);box(w,.004,d,0,0,0,m.paper,g,.001);
    const texture=map((c,W,H)=>{c.fillStyle=color;c.fillRect(0,0,W,H);c.fillStyle='#46544c';c.font='bold 30px Arial';c.fillText(title,24,45,W-48);c.lineWidth=2;c.strokeStyle='#85867b';for(let i=0;i<13;i++){c.beginPath();c.moveTo(24,80+i*26);c.lineTo(W-(i%4===0?95:24),80+i*26);c.stroke();}c.strokeStyle='#497282';c.beginPath();c.moveTo(W*.55,H*.88);c.bezierCurveTo(W*.9,H*.95,W*.6,H*.80,W*.9,H*.87);c.stroke();},384,512);
    const top=plane(texture,w-.008,d-.008,0,.003,0,g);top.rotation.x=-Math.PI/2;return top;
  }
  function folder(x,y,z,host=parent,title='ДЕЛО № 041'){
    const g=group(x,y,z,host,-.07);box(.30,.015,.36,0,0,0,material('#aa9472'),g,.003);box(.105,.01,.045,-.075,.006,-.197,material('#aa9472'),g,.002);paper(0,.012,0,g,{title,w:.255,d:.29});return g;
  }
  function desk(x,z,w=1.75,d=.82,host=parent,yaw=0,{metal=false,drawers=true}={}){
    const g=group(x,0,z,host,yaw);g.name='desk';box(w,.055,d,0,.77,0,metal?m.steel:m.wood,g,.018);box(w-.03,.029,d-.03,0,.812,0,metal?material('#d2dad2',.39,.68):material('#837057'),g,.006);
    for(const X of [-w/2+.11,w/2-.11])for(const Z of [-d/2+.09,d/2-.09])box(.045,.725,.045,X,.365,Z,m.metal,g,.006);
    rod([-w/2+.11,.19,-d/2+.09],[w/2-.11,.19,-d/2+.09],.022,m.metal,g);
    if(drawers){box(.43,.49,d*.82,w/2-.27,.49,0,metal?m.plastic:m.wood,g);for(let i=0;i<3;i++){box(.396,.147,.025,w/2-.27,.325+i*.156,d*.42,metal?m.plastic:m.edge,g,.004);rod([w/2-.34,.325+i*.156,d*.444],[w/2-.20,.325+i*.156,d*.444],.009,m.metal,g);}}
    return g;
  }
  function chair(x,z,host=parent,yaw=0,{padded=false}={}){
    const g=group(x,0,z,host,yaw);const seat=padded?material('#344846'):m.wood;box(.45,.065,.43,0,.477,0,seat,g,.035);box(.43,.43,.05,0,.77,-.215,seat,g,.025);
    for(const X of [-.18,.18])for(const Z of [-.17,.17])rod([X,.035,Z],[X,.445,Z],.018,m.metal,g);
    for(const X of [-.19,.19])rod([X,.44,-.20],[X,.93,-.20],.017,m.metal,g);
    rod([-.18,.18,-.17],[.18,.18,-.17],.016,m.metal,g);return g;
  }
  function computer(x,y,z,host=parent,title='УЧАСТОК № 7'){
    const g=group(x,y,z,host);g.name='desktop-computer';box(.34,.017,.24,0,.012,0,m.black,g,.018);box(.047,.23,.046,0,.12,-.015,m.metal,g);const display=group(0,.34,-.04,g,-.025);display.rotation.x=-.09;
    box(.56,.345,.038,0,0,0,m.black,display,.018);
    const screen=map((c,W,H)=>{c.fillStyle='#172b32';c.fillRect(0,0,W,H);c.fillStyle='#36505a';c.fillRect(0,0,W,64);c.fillStyle='#c9ded8';c.font='bold 30px Arial';c.fillText(title,24,42,W-48);c.fillStyle='#75a29d';c.fillRect(20,90,140,H-114);c.fillStyle='#d0d7c7';for(let i=0;i<10;i++)c.fillRect(183,100+i*27,360-(i%3)*53,5);c.strokeStyle='#537577';c.strokeRect(175,85,W-199,H-110);},768,480);
    const s=plane(screen,.507,.294,0,.007,.0205,display);s.material.emissive=new THREE.Color('#6a8c88');s.material.emissiveIntensity=.25;
    cylinder(.005,.005,.002,.237,-.139,.022,m.blue,display).rotation.x=Math.PI/2;
    const keyboard=group(0,.025,.26,g);box(.48,.029,.16,0,0,0,m.plastic,keyboard,.008);
    for(let row=0;row<4;row++)for(let col=0;col<14;col++)box(.026,.008,.027,-.216+col*.033,.02,-.06+row*.033,m.paper,keyboard,.002);
    box(.12,.008,.025,.017,.02,.071,m.paper,keyboard,.002);
    const mouse=mesh(new THREE.SphereGeometry(.04,16,10),m.plastic,.335,.033,.265,g);mouse.scale.set(1,.45,1.4);rod([.335,.026,.24],[.35,.018,.18],.0018,m.black,g);
    const tower=group(.43,.295-y,-.20,g);box(.20,.56,.41,0,0,0,m.black,tower,.015);for(let i=0;i<9;i++)box(.136,.004,.002,0,.10+i*.018,.207,m.metal,tower,.0005);box(.09,.018,.01,0,.20,.208,m.dark,tower);cylinder(.009,.009,.006,.065,.25,.21,m.blue,tower).rotation.x=Math.PI/2;
    for(const X of [-.075,.075])for(const Z of [-.14,.14])box(.035,.015,.04,X,-.2875,Z,m.black,tower,.003);
    const cable=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.12,-.025),new THREE.Vector3(.03,-.1,-.17),new THREE.Vector3(.31,-.45,-.22),new THREE.Vector3(.43,-.45,-.29)]);mesh(new THREE.TubeGeometry(cable,18,.005,6,false),m.black,0,0,0,g);
    return g;
  }
  function lamp(x,y,z,host=parent){const g=group(x,y,z,host);cylinder(.10,.105,.024,0,.014,0,m.dark,g);rod([0,.03,0],[0,.31,-.02],.012,m.metal,g);rod([0,.31,-.02],[.13,.39,.025],.012,m.metal,g);const shade=cylinder(.073,.11,.11,.13,.365,.03,material('#48675b'),g);shade.rotation.z=.25;const glow=material('#e7dbac',.4);glow.emissive=new THREE.Color('#e7dbac');glow.emissiveIntensity=.4;cylinder(.097,.097,.006,.143,.310,.03,glow,g);return g;}
  function phone(x,y,z,host=parent){const g=group(x,y,z,host,-.08);box(.21,.07,.23,0,.035,0,m.black,g,.015);const handset=group(0,.11,-.07,g);box(.225,.042,.045,0,0,0,m.dark,handset,.018);for(const X of [-.098,.098])box(.059,.05,.077,X,-.016,0,m.black,handset,.02);for(let row=0;row<4;row++)for(let col=0;col<3;col++)box(.029,.004,.027,(col-1)*.039,.074,-.005+row*.032,m.paper,g,.002);const curve=new THREE.CatmullRomCurve3(Array.from({length:66},(_,i)=>new THREE.Vector3(-.118-Math.sin(i*.70)*.012,.075-i*.0006,.007+i*.0023)));mesh(new THREE.TubeGeometry(curve,66,.003,5,false),m.black,0,0,0,g);return g;}
  function cabinet(x,z,host=parent,{w=.9,h=1.95,d=.5,drawers=false,yaw=0,glass=false}={}){
    const g=group(x,0,z,host,yaw);g.name=drawers?'filing-cabinet':'storage-cabinet';box(w,h,d,0,h/2+.07,0,m.metal,g,.014);box(w-.055,h-.045,.005,0,h/2+.07,d/2+.004,m.dark,g,.001);
    if(drawers){for(let i=0;i<5;i++){const Y=.12+(i+.5)*(h-.09)/5;box(w-.075,(h-.12)/5,.024,0,Y,d/2+.023,m.plastic,g,.005);rod([-.10,Y+.012,d/2+.045],[.10,Y+.012,d/2+.045],.009,m.metal,g);label(String(2007+i*3),.12,.028,0,Y+.095,d/2+.040,g,{bg:'#d9d6c5',fg:'#384641',border:false});}}
    else for(const X of [-w/4,w/4]){box(w/2-.029,h-.068,.025,X,h/2+.07,d/2+.024,glass?m.glass:m.plastic,g,.006);rod([X+(X<0?.11:-.11),h*.47,d/2+.055],[X+(X<0?.11:-.11),h*.58,d/2+.055],.009,m.metal,g);for(let i=0;i<6&&!glass;i++)box(w*.31,.009,.003,X,h-.17-i*.032,d/2+.041,m.dark,g,.001);}
    for(const X of [-w/2+.08,w/2-.08])for(const Z of [-d/2+.07,d/2-.07])box(.055,.07,.055,X,.035,Z,m.dark,g,.005);return g;
  }
  function shelf(x,z,host=parent,{w=1.45,h=2.25,d=.45,yaw=0,kind='archive',row=0}={}){
    const g=group(x,0,z,host,yaw);g.name=kind+'-shelf';for(const X of [-w/2,w/2])for(const Z of [-d/2,d/2]){box(.038,h,.038,X,h/2,Z,m.metal,g,.004);for(let j=0;j<13;j++)box(.006,.006,.003,X+(X>0?.021:-.021),.22+j*.14,Z+.021,m.dark,g,.001);}
    for(let level=0;level<5;level++){const Y=.14+level*.43;box(w+.07,.035,d+.06,0,Y,0,m.metal,g,.006);if(kind==='archive'){for(let j=0;j<13;j++){const X=-w/2+.078+j*(w-.08)/13,shade=['#687777','#9b8770','#677958','#785d50'][(j+level+row)%4];const height=.255+(j%3)*.025;box(.071,height,.315,X,Y+.021+height/2,.012,material(shade),g,.002);box(.05,.038,.002,X,Y+.08,d/2+.015,m.paper,g,.001);box(.014,.026,.003,X,Y+.055,d/2+.016,m.dark,g,.001);}}
      else for(let j=0;j<3;j++){const X=-w*.32+j*w*.32;box(w*.28,.255,d*.8,X,Y+.146,0,material('#a59478'),g,.007);box(w*.282,.025,d*.81,X,Y+.266,0,material('#b6a68a'),g,.004);const tape=box(w*.045,.26,.003,X,Y+.145,d*.401,material('#735a43'),g,.001);label((row+1)+'/'+(level*3+j+1),w*.19,.038,X,Y+.145,d*.404,g,{bg:'#e1ddc7',fg:'#485248',border:false});if(kind==='evidence')box(w*.285,.018,.004,X,Y+.22,d*.405,m.red,g,.001);}
    }return g;
  }
  function bin(x,z,host=parent,{medical=false}={}){const g=group(x,0,z,host);cylinder(.125,.11,.28,0,.14,0,medical?material('#c2c8ad'):m.metal,g);cylinder(.128,.128,.017,0,.294,0,m.dark,g);if(medical)label('Б',.085,.08,0,.17,.125,g,{bg:'#c2c8ad',fg:'#9b4c32',border:false});return g;}
  function wallClock(x,y,z,host=parent){const g=group(x,y,z,host);const ring=cylinder(.22,.22,.038,0,0,0,m.metal,g,40);ring.rotation.x=Math.PI/2;const t=map((c,W,H)=>{c.fillStyle='#d9dccb';c.fillRect(0,0,W,H);c.translate(W/2,H/2);c.strokeStyle='#35403c';for(let i=0;i<12;i++){c.save();c.rotate(i*Math.PI/6);c.lineWidth=5;c.beginPath();c.moveTo(0,-W*.43);c.lineTo(0,-W*.36);c.stroke();c.restore();}for(const [a,l,w]of [[.78,.27,10],[4.3,.37,6]]){c.save();c.rotate(a);c.lineWidth=w;c.beginPath();c.moveTo(0,0);c.lineTo(0,-W*l);c.stroke();c.restore();}},512,512);mesh(new THREE.CircleGeometry(.199,48),new THREE.MeshStandardMaterial({map:t,roughness:.85}),0,0,.022,g);return g;}
  function radiator(x,z,host=parent,yaw=0){const g=group(x,0,z,host,yaw);for(let i=0;i<13;i++){const X=(i-6)*.07;box(.041,.46,.115,X,.42,0,m.plastic,g,.018);box(.061,.036,.122,X,.195,0,m.plastic,g,.006);box(.061,.036,.122,X,.645,0,m.plastic,g,.006);}for(const Y of [.2,.64])rod([-.48,Y,0],[.55,Y,0],.023,m.metal,g);const handle=cylinder(.042,.042,.055,.53,.64,0,m.plastic,g);handle.rotation.z=Math.PI/2;rod([.55,.20,0],[.60,.20,-.11],.016,m.metal,g);rod([.55,.64,0],[.60,.64,-.11],.016,m.metal,g);return g;}
  return {m,material,mesh,box,cylinder,rod,group,map,plane,label,paper,folder,desk,chair,computer,lamp,phone,cabinet,shelf,bin,wallClock,radiator};
}
