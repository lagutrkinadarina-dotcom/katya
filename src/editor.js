import * as THREE from 'three';
import defaultLayout from './default-layout.json';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';

const STORAGE='night-shift-interior-layout-v1';
export function createEditor({scene,camera,canvas,release,onExit}){
  const items=[];scene.traverse(object=>{if(object.userData.editor)items.push(object);});
  const defaults=new Map();
  for(const object of items){
    // Put handles at the visual centre, including assemblies authored in world space.
    object.updateMatrixWorld(true);
    const center=new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
    const localCenter=object.worldToLocal(center.clone());
    object.children.forEach(child=>child.position.sub(localCenter));
    object.position.add(localCenter.clone().multiply(object.scale).applyQuaternion(object.quaternion));
    object.updateMatrixWorld(true);
    defaults.set(object.userData.editor.id,{position:object.position.toArray(),rotation:object.rotation.toArray().slice(0,3)});
  }
  let active=false,selected=null,dirty=false,savedCamera=null;
  const panel=document.createElement('aside');panel.id='interior-editor';panel.hidden=true;
  panel.innerHTML='<h2>Редактор предметов</h2><p>Выберите предмет в сцене или списке. Тяните цветные стрелки. Правая кнопка — обзор, колесо — приближение.</p><label>Предмет<select id="editor-object"><option value="">Выберите предмет</option></select></label><div class="editor-row"><button id="editor-move">Перемещение</button><button id="editor-rotate">Поворот</button></div><div id="editor-fields"></div><div class="editor-row"><button id="editor-undo">Отменить изменение</button><button id="editor-default">Исходное положение</button></div><button id="editor-save">Сохранить расстановку</button><button id="editor-export">Скачать расстановку JSON</button><div class="editor-row"><button id="editor-import">Загрузить JSON</button><button id="editor-reset">Сбросить всё</button></div><input id="editor-file" type="file" accept="application/json,.json" hidden><p id="editor-status" role="status"></p><button id="editor-exit">Вернуться в игру · F2</button>';
  document.body.append(panel);
  const $=id=>panel.querySelector('#'+id),list=$('editor-object');
  for(const object of items){const option=document.createElement('option');option.value=object.userData.editor.id;option.textContent=object.userData.editor.label;list.append(option);}
  const orbit=new OrbitControls(camera,canvas);orbit.enabled=false;orbit.minDistance=.7;orbit.maxDistance=16;orbit.maxPolarAngle=Math.PI*.85;
  // Left button is reserved for picking and transform handles.
  orbit.mouseButtons.LEFT=null;orbit.mouseButtons.MIDDLE=THREE.MOUSE.DOLLY;orbit.mouseButtons.RIGHT=THREE.MOUSE.ROTATE;
  const transform=new TransformControls(camera,canvas);transform.enabled=false;transform.setSize(.8);const gizmo=transform.getHelper();gizmo.visible=false;scene.add(gizmo);
  const outline=new THREE.BoxHelper(undefined,0xd8bf78);outline.visible=false;scene.add(outline);
  const history=[];let dragStart=null;
  const snapshot=object=>({id:object.userData.editor.id,revision:object.userData.editor.revision||1,position:object.position.toArray(),rotation:[object.rotation.x,object.rotation.y,object.rotation.z]});
  function restore(object,data){object.position.fromArray(data.position);object.rotation.set(...data.rotation);object.updateMatrixWorld(true);}
  function status(message){$('editor-status').textContent=message;}
  function changed(){dirty=true;status('Есть несохранённые изменения.');fields();}
  function fields(){
    const holder=$('editor-fields');holder.replaceChildren();if(!selected)return;
    for(const [label,key,index]of [['X','position',0],['Y','position',1],['Z','position',2],['Поворот, °','rotation',1]]){
      const row=document.createElement('label');row.textContent=label;const input=document.createElement('input');input.type='number';input.step=key==='rotation'?'5':'0.05';input.value=(key==='rotation'?THREE.MathUtils.radToDeg(selected.rotation.y):selected.position.getComponent(index)).toFixed(2);input.setAttribute('aria-label','Редактор: '+label);
      input.onchange=()=>{const value=Number(input.value);if(!Number.isFinite(value))return;history.push(snapshot(selected));if(key==='rotation')selected.rotation.y=THREE.MathUtils.degToRad(value);else selected.position.setComponent(index,Math.max(-30,Math.min(30,value)));selected.updateMatrixWorld(true);changed();};row.append(input);holder.append(row);
    }
  }
  function select(object){selected=object||null;list.value=object?.userData.editor.id||'';transform.detach();outline.visible=!!object;if(object){transform.attach(object);outline.setFromObject(object);}fields();}
  list.onchange=()=>select(items.find(object=>object.userData.editor.id===list.value));
  const picker=new THREE.Raycaster();let down=null;
  canvas.addEventListener('pointerdown',event=>{if(active&&event.button===0)down={x:event.clientX,y:event.clientY};});
  canvas.addEventListener('pointerup',event=>{
    if(!active||!down||transform.dragging||transform.axis){down=null;return;}const start=down;down=null;if(Math.hypot(event.clientX-start.x,event.clientY-start.y)>4)return;
    const rect=canvas.getBoundingClientRect();picker.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
    const hit=picker.intersectObjects(items,true).find(result=>result.object.isMesh&&result.object.material.visible!==false);
    let object=hit?.object;while(object&&!object.userData.editor)object=object.parent;select(object);
  });
  transform.addEventListener('dragging-changed',event=>{orbit.enabled=active&&!event.value;if(event.value&&selected)dragStart=snapshot(selected);else if(dragStart){history.push(dragStart);dragStart=null;changed();}});
  transform.addEventListener('objectChange',()=>{if(selected)outline.setFromObject(selected);});
  $('editor-move').onclick=()=>transform.setMode('translate');$('editor-rotate').onclick=()=>transform.setMode('rotate');
  $('editor-undo').onclick=()=>{const previous=history.pop();if(!previous)return;const object=items.find(item=>item.userData.editor.id===previous.id);restore(object,previous);select(object);changed();};
  $('editor-default').onclick=()=>{if(!selected)return;history.push(snapshot(selected));restore(selected,defaults.get(selected.userData.editor.id));changed();};
  function layout(){return {version:1,objects:items.map(snapshot)};}
  function apply(data){
    if(data?.version!==1||!Array.isArray(data.objects))throw Error('Неподдерживаемый формат расстановки.');
    const valid=data.objects.map(entry=>{
      if(!entry||typeof entry.id!=='string'||!['position','rotation'].every(key=>Array.isArray(entry[key])&&entry[key].length===3&&entry[key].every(value=>Number.isFinite(value)&&Math.abs(value)<=100)))throw Error('Некорректные координаты в файле.');
      return [items.find(object=>object.userData.editor.id===entry.id),entry];
    });
    for(const [object,entry]of valid)if(object&&(entry.revision||1)===(object.userData.editor.revision||1))restore(object,entry);
  }
  // The approved project layout is the baseline for fresh browsers and reset actions.
  apply(defaultLayout);
  for(const object of items)defaults.set(object.userData.editor.id,snapshot(object));
  try{const stored=localStorage.getItem(STORAGE);if(stored)apply(JSON.parse(stored));}catch{status('Сохранённую расстановку не удалось загрузить.');}
  $('editor-save').onclick=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(layout()));dirty=false;status('Расстановка сохранена в этом браузере.');}catch{status('Браузер не разрешил сохранение. Скачайте JSON.');}};
  $('editor-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(layout(),null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='night-shift-layout.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('editor-import').onclick=()=>$('editor-file').click();$('editor-file').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;apply(JSON.parse(await file.text()));history.length=0;fields();changed();status('Файл загружен. Сохраните расстановку, чтобы применять её при запуске.');}catch(error){status(error.message);}finally{event.target.value='';}};
  $('editor-reset').onclick=()=>{if(!confirm('Вернуть исходную расстановку всех предметов?'))return;items.forEach(object=>restore(object,defaults.get(object.userData.editor.id)));history.length=0;changed();};
  function enter(){if(active)return;active=true;release();savedCamera={position:camera.position.clone(),rotation:camera.rotation.clone()};if(camera.position.y>0){camera.position.set(0,-1.25,3.2);}orbit.target.set(0,-1.7,-2);orbit.enabled=true;orbit.update();transform.enabled=true;gizmo.visible=true;panel.hidden=false;document.body.classList.add('editing-interior');status(dirty?'Есть несохранённые изменения.':'Сохранение расстановки не меняет прогресс расследования.');}
  function exit(){if(!active)return;if(dirty&&!confirm('Выйти без сохранения? Изменения останутся до закрытия страницы.'))return;active=false;orbit.enabled=false;transform.enabled=false;transform.detach();gizmo.visible=false;outline.visible=false;panel.hidden=true;document.body.classList.remove('editing-interior');camera.position.copy(savedCamera.position);camera.rotation.copy(savedCamera.rotation);onExit();}
  $('editor-exit').onclick=exit;
  const collisionCache=new Map();
  function blocked(x,z,eyeY){if(eyeY>0)return false;for(const object of items){if(!object.userData.editor.solid)continue;const key=[...object.position.toArray(),...object.rotation.toArray(),...object.scale.toArray()].join(',');let cache=collisionCache.get(object);if(!cache||cache.key!==key){cache={key,bounds:new THREE.Box3().setFromObject(object)};collisionCache.set(object,cache);}const bounds=cache.bounds;if(bounds.max.y<eyeY-1.5||bounds.min.y>eyeY+.2)continue;if(x>bounds.min.x-.19&&x<bounds.max.x+.19&&z>bounds.min.z-.19&&z<bounds.max.z+.19)return true;}return false;}
  return {enter,exit,blocked,items,get active(){return active;},update(){if(active&&selected)outline.setFromObject(selected);}};
}
