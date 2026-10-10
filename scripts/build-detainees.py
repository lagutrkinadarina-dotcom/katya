"""Author both civilian meshes and rigs from an empty scene; no reused officer geometry.
blender -b --factory-startup --python-exit-code 1 --python scripts/build-detainees.py
Coordinates: metres, Z up, front -Y. Native editable .blend and runtime GLB are exported.
"""
import math
import importlib.util
from pathlib import Path
import bpy
import bmesh
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
head_spec=importlib.util.spec_from_file_location('civilian_head',ROOT/'scripts/rounded-civilian-head.py')
head_builder=importlib.util.module_from_spec(head_spec);head_spec.loader.exec_module(head_builder)
TAU=math.tau
BODY=[(-.95,-.70),(-.65,-.94),(-.27,-1),(0,-1.035),(.27,-1),(.65,-.94),(.95,-.70),(1,-.36),(1,0),(1,.36),(.75,.9),(0,1.05),(-.75,.9),(-1,.36),(-1,0),(-1,-.36)]

def material(name,hex):
    rgb=[int(hex[i:i+2],16)/255 for i in (0,2,4)]
    lin=lambda c:c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*rgb,1)
    node=m.node_tree.nodes['Principled BSDF'];node.inputs['Base Color'].default_value=(*map(lin,rgb),1);node.inputs['Roughness'].default_value=.88
    return m

class Surface:
    def __init__(self,name,rig,mats):
        self.name=name;self.rig=rig;self.mats=mats;self.vertices=[];self.faces=[];self.weights=[];self.slots=[];self.blink=[]
    def vertex(self,p,w):
        w={b:v for b,v in w.items() if v>1e-7};assert abs(sum(w.values())-1)<1e-5
        self.vertices.append(tuple(p));self.weights.append(w);return len(self.vertices)-1
    def face(self,ids,slot=0):self.faces.append(tuple(ids));self.slots.append(slot)
    def strip(self,a,b,slot=0):
        assert len(a)==len(b)
        for i in range(len(a)):
            j=(i+1)%len(a);self.face((a[i],a[j],b[j]),slot);self.face((a[i],b[j],b[i]),slot)
    def object(self):
        d=bpy.data.meshes.new(self.name);d.from_pydata(self.vertices,[],self.faces);d.update()
        obj=bpy.data.objects.new(self.name,d);bpy.context.collection.objects.link(obj)
        for m in self.mats:d.materials.append(m)
        for p,slot in zip(d.polygons,self.slots):p.material_index=slot;p.use_smooth=False
        groups={name:obj.vertex_groups.new(name=name) for name in {name for w in self.weights for name in w}}
        for i,w in enumerate(self.weights):
            for name,v in w.items():groups[name].add([i],v,'REPLACE')
        obj.parent=self.rig;mod=obj.modifiers.new('Civilian skeleton','ARMATURE');mod.object=self.rig
        bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
        if self.blink:
            obj.shape_key_add(name='Basis');blink=obj.shape_key_add(name='Blink')
            for i,z in self.blink:blink.data[i].co.z=z+(blink.data[i].co.z-z)*.04
        return obj

def circle(s,c,rx,ry,z,w,n=12):return [s.vertex((c[0]+rx*math.sin(TAU*i/n),c[1]-ry*math.cos(TAU*i/n),z),w) for i in range(n)]
def loft(name,rig,rings,mat,bone,n=12):
    s=Surface(name,rig,[mat]);last=None
    for x,y,z,rx,ry in rings:
        ring=circle(s,(x,y),rx,ry,z,{bone:1},n)
        if last:s.strip(last,ring)
        else:s.face(tuple(reversed(ring)))
        last=ring
    s.face(last);return s.object()
def patch(name,rig,points,mat,bone='spine'):
    s=Surface(name,rig,[mat]);s.face([s.vertex(p,{bone:1}) for p in points]);return s.object()

def skeleton(woman):
    d=bpy.data.armatures.new('civilian-skeleton');rig=bpy.data.objects.new('detainee-rig',d);bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    def bone(name,head,tail,parent=None):
        b=d.edit_bones.new(name);b.head=head;b.tail=tail
        if parent:b.parent=d.edit_bones[parent]
    bone('hips',(0,0,.90),(0,0,1.03));bone('spine',(0,0,1.03),(0,0,1.43),'hips');bone('neck',(0,0,1.43),(0,0,1.55),'spine');bone('head',(0,0,1.55),(0,0,1.80),'neck')
    shoulder=.205 if woman else .228;elbow=.278 if woman else .300;wrist=.304 if woman else .327
    for sign,label in [(-1,'L'),(1,'R')]:
        bone('upper_arm.'+label,(sign*shoulder,0,1.39),(sign*elbow,0,1.12),'spine');bone('forearm.'+label,(sign*elbow,0,1.12),(sign*wrist,0,.91),'upper_arm.'+label);bone('hand.'+label,(sign*wrist,0,.91),(sign*wrist,0,.825),'forearm.'+label)
        for i in range(4):
            x=sign*wrist+(i-1.5)*.016;end=.773+abs(i-1.5)*.008
            bone(f'finger{i}.{label}',(x,.002,.835),(x,.006,end),'hand.'+label)
        bone('thumb.'+label,(sign*(wrist-.027),.007,.869),(sign*(wrist-.045),.015,.832),'hand.'+label)
        bone('thigh.'+label,(sign*.087,0,.88),(sign*.087,0,.48),'hips');bone('shin.'+label,(sign*.087,0,.48),(sign*.087,0,.09),'thigh.'+label);bone('foot.'+label,(sign*.087,0,.09),(sign*.087,-.14,.05),'shin.'+label)
    bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
    rig['seatedHipHeight']=.5625;rig['ankleHeight']=.09;rig['footMinHeight']=.012;rig['handPalmBind']='rear';rig['authoredFromScratch']=True
    return rig,shoulder,elbow,wrist

def body_and_arms(rig,woman,shoulder,elbow,wrist,mats):
    # The sleeves share the actual torso boundary, including all elbow/wrist rings.
    s=Surface('continuous-body-arms-hands',rig,mats);rings=[]
    fields=[(.96,.148,.098),(1.035,.147,.094),(1.17,.160,.106),(1.29,shoulder,.108),(1.365,shoulder,.110),(1.44,shoulder,.088),(1.475,.090,.070),(1.50,.056,.050),(1.55,.053,.048),(1.59,.052,.048)]
    for z,rx,ry in fields:
        w={'spine':1} if z<1.48 else ({'neck':1} if z<1.55 else {'neck':.5,'head':.5} if z<1.59 else {'head':1})
        rings.append([s.vertex((x*rx,y*ry,z),w) for x,y in BODY])
    s.face(tuple(reversed(rings[0])))
    for r in range(len(rings)-1):
        for i in range(16):
            if r in [3,4] and i in [7,8,13,14]:continue
            j=(i+1)%16;ids=(rings[r][i],rings[r][j],rings[r+1][j],rings[r+1][i]);slot=2 if r>=6 else 0
            if woman and i in [2,3] and r<6:slot=3
            s.face((ids[0],ids[1],ids[2]),slot);s.face((ids[0],ids[2],ids[3]),slot)
    s.face(rings[-1],2)
    for sign,label,start in [(-1,'L',13),(1,'R',7)]:
        root=[rings[3][start],rings[3][start+1],rings[3][start+2],rings[4][start+2],rings[5][start+2],rings[5][start+1],rings[5][start],rings[4][start]]
        root.sort(key=lambda i:math.atan2((s.vertices[i][2]-1.365)/.075,s.vertices[i][1]/(.110*.36)))
        angles=[math.atan2((s.vertices[i][2]-1.365)/.075,s.vertices[i][1]/(.110*.36)) for i in root];last=root
        fields=[(shoulder+.012,1.375,.060,.068,0,.40),(shoulder+.026,1.340,.058,.057,0,.80),(elbow-.017,1.260,.051,.048,.04,1),(elbow-.006,1.170,.048,.044,.22,1),(elbow,1.120,.049,.044,.50,1),(elbow+.005,1.078,.041,.037,.80,1),(wrist-.003,.970,.031,.029,1,1),(wrist,.910,.027,.022,1,1)]
        for r,(cx,z,ru,rv,f,arm) in enumerate(fields):
            axis=Vector((sign,0,0)) if r==0 else Vector((sign*(wrist-shoulder),0,-.48)).normalized();u=Vector((0,1,0));v=axis.cross(u)*sign
            w={'spine':1-arm,'upper_arm.'+label:(1-f)*arm,'forearm.'+label:f*arm}
            if r==7:w={'forearm.'+label:.5,'hand.'+label:.5}
            ring=[s.vertex(Vector((sign*cx,0,z))+u*(ru*math.cos(a))+v*(rv*math.sin(a)),w) for a in angles]
            s.strip(last,ring,0 if r<5 else 2);last=ring
        for z,rx,ry in [(.880,.031,.019),(.851,.035,.019),(.834,.033,.016)]:
            ring=[s.vertex((sign*wrist+rx*math.sin(a)*sign,ry*math.cos(a),z),{'hand.'+label:1}) for a in angles];s.strip(last,ring,2);last=ring
        s.face(last,2)
        for i in range(4):
            x=sign*wrist+(i-1.5)*.016;end=.773+abs(i-1.5)*.008;last=None
            for r,(z,rx,ry) in enumerate([(.848,.0085,.015),(.824,.0082,.013),((.824+end)/2,.0074,.012),(end,.006,.009),(end-.004,.0025,.004)]):
                w={'hand.'+label:1} if r==0 else {'hand.'+label:.45,f'finger{i}.{label}':.55} if r==1 else {f'finger{i}.{label}':1}
                ring=circle(s,(x,.002+r*.001),rx,ry,z,w,8)
                if last:s.strip(last,ring,2)
                else:s.face(tuple(reversed(ring)),2)
                last=ring
            s.face(last,2)
        last=None
        for r,(dx,y,z,rx,ry) in enumerate([(-.024,.005,.876,.012,.014),(-.033,.010,.860,.011,.012),(-.044,.013,.840,.010,.011),(-.046,.014,.827,.005,.006)]):
            w={'hand.'+label:1} if r==0 else {'hand.'+label:.5,'thumb.'+label:.5} if r==1 else {'thumb.'+label:1}
            ring=circle(s,(sign*(wrist+dx),y),rx,ry,z,w,8)
            if last:s.strip(last,ring,2)
            else:s.face(tuple(reversed(ring)),2)
            last=ring
        s.face(last,2)
    obj=s.object();bm=bmesh.new();bm.from_mesh(obj.data)
    for sign in [-1,1]:
        edges=[e for e in bm.edges if all(abs(v.co.x-sign*shoulder)<1e-6 and 1.289<v.co.z<1.441 and abs(v.co.y)<.045 for v in e.verts)]
        assert len(edges)==8 and all(len(e.link_faces)==2 for e in edges),'Open shoulder seam'
    bm.free();return obj

def legs_and_shoes(rig,woman,mats):
    s=Surface('continuous-legs',rig,mats)
    for sign,label in [(-1,'L'),(1,'R')]:
        last=None
        fields=[(.92,.074,.079,0,1),(.88,.078,.080,0,.6),(.79,.077,.078,0,.1),(.65,.066,.067,0,0),(.535,.058,.058,.12,0),(.48,.054,.055,.50,0),(.43,.052,.053,.88,0),(.31,.047,.050,1,0),(.17,.034,.036,1,0),(.092,.030,.032,1,0)]
        for z,rx,ry,f,h in fields:
            factor=1 if woman else 1.15;w={'hips':h,'thigh.'+label:(1-f)*(1-h),'shin.'+label:f*(1-h)}
            ring=circle(s,(sign*.087,0),min(rx*factor,.0825),ry*factor,z,w)
            if last:s.strip(last,ring)
            else:s.face(tuple(reversed(ring)))
            last=ring
        s.face(last)
        loft('shoe-'+label,rig,[(sign*.087,-.047,.012,.052,.116),(sign*.087,-.047,.028,.052,.116),(sign*.087,-.050,.051,.048,.109),(sign*.087,-.008,.094,.032,.055)],mats[1],'foot.'+label)
    legs=s.object()
    pelvis=loft('pelvis',rig,[(0,0,.83,.125,.063),(0,0,.88,.150,.099),(0,0,.985,.147,.100)],mats[2],'hips',16)
    if not woman:
        # Union removes interior leg caps and the separate pelvis hem. The
        # trousers are a single closed surface through hips and both knees.
        legs.modifiers.clear();bpy.context.view_layer.objects.active=legs
        union=legs.modifiers.new('Continuous trouser crotch','BOOLEAN');union.operation='UNION';union.solver='EXACT';union.object=pelvis;union.use_self=True
        bpy.ops.object.modifier_apply(modifier=union.name);bpy.data.objects.remove(pelvis,do_unlink=True)
        assert len(legs.data.vertices)>100 and len(legs.data.polygons)>100,'Trouser union removed the surface'
        legs.vertex_groups.clear()
        groups={name:legs.vertex_groups.new(name=name) for name in ['hips','thigh.L','thigh.R','shin.L','shin.R']}
        for v in legs.data.vertices:
            z=v.co.z;label='L' if v.co.x<0 else 'R'
            h=max(0,min(1,(z-.755)/.075));f=max(0,min(1,(.535-z)/.105))
            w={'hips':h,'thigh.'+label:(1-h)*(1-f),'shin.'+label:(1-h)*f}
            for name,value in w.items():
                if value>1e-7:groups[name].add([v.index],value,'REPLACE')
        arm=legs.modifiers.new('Civilian skeleton','ARMATURE');arm.object=rig
        bm=bmesh.new();bm.from_mesh(legs.data)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
        assert all(len(e.link_faces)==2 for e in bm.edges),'Open trousers after pelvis union'
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(legs.data);bm.free()

def plaid(obj,cloth_slot):
    img=bpy.data.images.get('civilian-plaid')
    if not img:
        img=bpy.data.images.new('civilian-plaid',width=128,height=128);pixels=[]
        for y in range(128):
            for x in range(128):
                sx=25<=x<48 or 100<=x<106;sy=25<=y<48 or 100<=y<106;rgb=(.76,.82,.82) if sx or sy else (.88,.91,.88)
                if sx and sy:rgb=(.59,.69,.75)
                if x in [22,50,98,109] or y in [22,50,98,109]:rgb=(.72,.77,.78)
                pixels.extend((*rgb,1))
        img.pixels=pixels;img.pack()
    mat=obj.data.materials[cloth_slot];node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=img;mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    uv=obj.data.uv_layers.new(name='Woven plaid')
    for p in obj.data.polygons:
        for j in p.loop_indices:
            v=obj.data.vertices[obj.data.loops[j].vertex_index].co;uv.data[j].uv=(v.x/.20,v.z/.20)

def clothes(rig,woman,cloth,skin,green,white):
    if woman:
        # These NPCs are seated. A closed, pre-draped skirt follows the hips
        # instead of rotating its entire lower hoop with two thigh bones.
        s=Surface('dress-skirt',rig,[green]);outer=[];inner=[]
        for inset,rings in [(False,outer),(True,inner)]:
            for z,rx,ry,cy in [(1.008,.150,.102,0),(.982,.165,.120,-.055),(.936,.180,.155,-.205),(.872,.194,.105,-.325)]:
                ring=[]
                for x,y in BODY:
                    ring.append(s.vertex((x*(rx-(.004 if inset else 0)),cy+y*(ry-(.004 if inset else 0)),z),{'hips':1}))
                rings.append(ring)
            for a,b in zip(rings,rings[1:]):s.strip(a,b)
        s.strip(inner[0],outer[0]);s.strip(outer[-1],inner[-1]);s.object()
        loft('denim-knot',rig,[(0,-.108,1.025,.012,.012),(0,-.120,1.045,.030,.023),(0,-.112,1.063,.020,.015)],cloth,'spine',8)
        for sign in [-1,1]:
            patch('denim-tie-'+str(sign),rig,[(sign*.008,-.120,1.042),(sign*.043,-.114,1.034),(sign*.075,-.115,.992),(sign*.045,-.126,.977),(sign*.018,-.132,1.017)],cloth)
            patch('breast-pocket-'+str(sign),rig,[(sign*.075,-.116,1.312),(sign*.138,-.116,1.310),(sign*.137,-.122,1.263),(sign*.106,-.123,1.249),(sign*.077,-.122,1.263)],cloth)
    else:patch('shirt-pocket',rig,[(.069,-.113,1.318),(.137,-.110,1.318),(.137,-.115,1.254),(.103,-.118,1.241),(.070,-.116,1.254)],cloth)
    for sign in [-1,1]:patch('collar-'+str(sign),rig,[(sign*.043,-.056,1.492),(sign*.092,-.070,1.468),(sign*.067,-.110,1.419),(sign*.015,-.103,1.466)],cloth)
    for i in range(5):
        z=1.388-i*.073;x=-.060 if woman else 0;y=-.114 if z<1.35 else -.108
        patch('button-'+str(i),rig,[(x+.004*math.cos(TAU*j/8),y,z+.004*math.sin(TAU*j/8)) for j in range(8)],white)

def build(kind):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    for collection in [bpy.data.meshes,bpy.data.materials,bpy.data.images,bpy.data.armatures]:
        for data in list(collection):
            if data.users==0:collection.remove(data)
    woman=kind=='woman';rig,shoulder,elbow,wrist=skeleton(woman)
    skin=material('civilian-skin','D5A87D' if woman else 'A57159');cloth=material('denim' if woman else 'plaid-shirt','5381A2' if woman else 'DCE4DD');shade=material('cloth-fold','416B8A' if woman else 'B7C8CB')
    green=material('lime-dress','B2CE42');pants=material('olive-trousers','6D7352');shoe=material('dark-shoes','30332C');white=material('buttons','C9D0CA')
    body=body_and_arms(rig,woman,shoulder,elbow,wrist,[cloth,shade,skin,green])
    if not woman:plaid(body,0)
    legs_and_shoes(rig,woman,[skin if woman else pants,shoe,green if woman else pants]);head_builder.build_head(rig,woman,skin,Surface,patch,material);clothes(rig,woman,cloth,skin,green,white)
    if not woman:
        # Give small shirt details the same projected plaid coordinates.
        for obj in rig.children:
            if obj.type!='MESH' or cloth not in obj.data.materials[:] or obj.data.uv_layers:continue
            uv=obj.data.uv_layers.new(name='Woven plaid')
            for loop in obj.data.loops:
                p=obj.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(p.x/.20,p.z/.20)
    # Bake modest smooth subdivision into the actual runtime meshes. Keep the
    # connected rig and weights; no smoothing illusion in screenshot rendering.
    for obj in list(rig.children):
        if obj.type!='MESH':continue
        for polygon in obj.data.polygons:polygon.use_smooth=True
        if obj.name.startswith(('continuous-body','continuous-legs','shoe-','pelvis','dress-skirt','denim-knot')):
            bpy.context.view_layer.objects.active=obj
            for polygon in obj.data.polygons:
                if obj.name.startswith('continuous-body') and polygon.material_index==1:polygon.material_index=0
            sub=obj.modifiers.new('Soft cartoon body','SUBSURF');sub.levels=1
            bpy.ops.object.modifier_apply(modifier=sub.name)
    rig.name='detainee-'+kind+'-rig';bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/f'public/models/detainee-{kind}.blend'))
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
    for obj in rig.children:obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/f'src/assets/detainee-{kind}.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
    print('EXPORTED',kind,'from empty scene,',len(rig.data.bones),'bones')
build('woman')
build('man')
