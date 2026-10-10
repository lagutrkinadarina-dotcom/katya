import * as THREE from 'three';

export function createDrinkCup() {
  const root = new THREE.Group(); root.name = 'takeaway-cup';
  const paper = new THREE.MeshStandardMaterial({color: '#dccdaf', roughness: .8, side: THREE.DoubleSide});
  const add = (geometry, material, y = 0) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.y = y; root.add(mesh); return mesh;
  };
  const body = add(new THREE.CylinderGeometry(.05, .037, .13, 20, 1, true), paper, .065);
  const bottom = add(new THREE.CircleGeometry(.037, 20), paper, .004); bottom.rotation.x = -Math.PI / 2;
  const rim = add(new THREE.TorusGeometry(.049, .0028, 6, 24), paper, .13); rim.rotation.x = Math.PI / 2;
  const band = add(new THREE.CylinderGeometry(.0436, .0413, .023, 20, 1, true), new THREE.MeshStandardMaterial({color:'#917458',roughness:.95}), .055);
  const liquid = add(new THREE.CircleGeometry(1, 32), new THREE.MeshStandardMaterial({color:'#48291b',roughness:.3}), .017);
  liquid.rotation.x = -Math.PI / 2; liquid.name = 'drink-surface';
  function setFill(fill, color) {
    const level = Math.max(0, Math.min(1, fill));
    liquid.position.y = .016 + .098 * level;
    liquid.scale.setScalar(.034 + liquid.position.y / .13 * .013);
    liquid.visible = level > .005;
    liquid.material.color.set(color ?? '#48291b');
  }
  setFill(0);
  return {root, body, liquid, band, setFill};
}

export function createSteam(parent) {
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const fade = ctx.createLinearGradient(0,128,0,0);fade.addColorStop(0,'#ffffff00');fade.addColorStop(.4,'#ffffffe0');fade.addColorStop(1,'#ffffff00');
  ctx.strokeStyle=fade;ctx.lineWidth=9;ctx.filter='blur(7px)';ctx.beginPath();ctx.moveTo(32,124);ctx.bezierCurveTo(12,86,53,58,29,4);ctx.stroke();
  const map = new THREE.CanvasTexture(canvas);
  const group = new THREE.Group(); parent.add(group); group.name = 'drink-steam';
  const puffs = Array.from({length:8},()=>{
    const puff = new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,opacity:0,depthWrite:false}));puff.position.y=.14;puff.scale.set(.026,.055,1);group.add(puff);return puff;
  });
  return {
    group,
    update(time, hot) {
      group.visible = hot;
      if (!hot) return;
      puffs.forEach((puff,i)=>{
        const t=(time*.38+i/8)%1;
        puff.position.set(Math.sin(t*5+i*1.7)*(.006+t*.015),.14+t*.20,Math.cos(i*2.1+t*3)*.012);
        puff.scale.set(.026+t*.045,.055+t*.075,1);
        puff.material.opacity=Math.sin(t*Math.PI)*.30;
      });
    },
  };
}
