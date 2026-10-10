"""Build both referenced civilians with connected, weighted clothing joints.

Blender 4.3: blender -b --factory-startup --python-exit-code 1 --python scripts/build-detainees.py
Reuses the approved character proportions and welded shoulders, not the officer's outfit.
"""
import bpy
import importlib.util
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('character_rig',ROOT/'scripts/prepare-duty-officer.py')
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
outline=[(-.72,-1),(.72,-1),(1,-.64),(1,.64),(.72,1),(-.72,1),(-1,.64),(-1,-.64)]

def color(mat,hex):
    rgb=[int(hex[i:i+2],16)/255 for i in (0,2,4)]
    linear=lambda c:c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
    mat.diffuse_color=(*rgb,1)
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*map(linear,rgb),1)

def material(name,hex):
    m=bpy.data.materials.new(name);m.use_nodes=True;color(m,hex)
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.86
    return m

def bind(obj,rig,weights):
    obj.parent=rig
    modifier=obj.modifiers.new('Civilian skeleton','ARMATURE');modifier.object=rig
    for name,values in weights.items():
        group=obj.vertex_groups.new(name=name)
        for index,weight in values.items():
            if weight>0:group.add([index],weight,'REPLACE')
    return obj

def mesh(name,verts,faces,mats,rig,weights):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    for m in mats:data.materials.append(m)
    for p in data.polygons:p.material_index=[0,0,1,0,2,0,1,0][p.index%8]%len(mats)
    return bind(obj,rig,weights)

def loft(name,rings,mats,rig,bone,weights_for_ring=None):
    verts=[(cx+x*rx,cy+y*ry,z) for cx,cy,z,rx,ry in rings for x,y in outline]
    faces=[tuple(reversed(range(8)))]
    for r in range(len(rings)-1):
        for i in range(8):
            a=r*8+i;b=r*8+(i+1)%8;c=b+8;d=a+8
            faces.extend([(a,b,c),(a,c,d)])
    faces.append(tuple(range((len(rings)-1)*8,len(rings)*8)))
    groups={}
    for r in range(len(rings)):
        values=weights_for_ring(r) if weights_for_ring else {bone:1}
        assert abs(sum(values.values())-1)<1e-8
        for joint,weight in values.items():
            groups.setdefault(joint,{}).update({i:weight for i in range(r*8,(r+1)*8)})
    return mesh(name,verts,faces,mats,rig,groups)

def panel(name,points,depth,mat,rig,bone='spine'):
    verts=[(x,depth,z) for x,z in points]
    return mesh(name,verts,[tuple(range(len(verts)))],[mat],rig,{bone:{i:1 for i in range(len(verts))}})

def box(name,centre,scale,mat,rig,bone='spine'):
    x,y,z=centre;w,d,h=[v/2 for v in scale]
    verts=[(x+sx*w,y+sy*d,z+sz*h) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    return mesh(name,verts,faces,[mat],rig,{bone:{i:1 for i in range(8)}})

def delete(name):
    obj=bpy.data.objects.get(name)
    if obj:bpy.data.objects.remove(obj,do_unlink=True)

def disc(name,x,y,z,rx,rz,mat,rig,bone='head',segments=10):
    import math
    return panel(name,[(x+rx*math.cos(i*math.tau/segments),z+rz*math.sin(i*math.tau/segments)) for i in range(segments)],y,mat,rig,bone)

def face(rig,woman,skins):
    # A real faceted head, with a softer jaw for the woman and narrower male chin.
    delete('faceted-head');delete('angular-nose');delete('mouth')
    rings=[(0,.008,1.605,.057,.056),(0,.004,1.640,.079,.078),
           (0,.004,1.691,.097,.095),(0,.003,1.743,.112,.106),
           (0,.005,1.794,.110,.109),(0,.008,1.842,.105,.103),
           (0,.012,1.881,.084,.087),(0,.015,1.902,.037,.048)]
    if not woman:rings=[(x,y,z,rx*1.055,ry) for x,y,z,rx,ry in rings]
    loft('civilian-face',rings,skins,rig,'head')
    for side,label in [(-1,'L'),(1,'R')]:
        ear=bpy.data.objects['ear-'+label]
        for v in ear.data.vertices:
            v.co.x=side*(abs(v.co.x)-.009)
    dark=material('eye-pupil','25211E');white=material('eye-white','E5DDD0')
    iris=material('iris-brown','634B36' if woman else '5F5546')
    brow=material('brows','592C20' if woman else '846246')
    lips=material('lips','A96752' if woman else '86544C')
    lid=material('eyelid', 'C38E69' if woman else 'A66A58')
    for side in [-1,1]:
        x=side*.048
        eye=panel('eye-white-'+str(side),[(x-.025,1.779),(x-.012,1.790),(x+.012,1.790),(x+.025,1.779),(x+.012,1.768),(x-.013,1.768)],-.109,white,rig,'head')
        eye['blink_eye']=True
        for obj in [disc('iris-'+str(side),x,-.1105,1.779,.010,.010,iris,rig),disc('pupil-'+str(side),x,-.112,1.779,.005,.007,dark,rig),disc('eye-light-'+str(side),x-.0025,-.113,1.783,.0018,.0023,white,rig)]:obj['blink_eye']=True
        panel('upper-lid-'+str(side),[(x-.025,1.779),(x-.012,1.791),(x+.012,1.791),(x+.025,1.779),(x+.011,1.787),(x-.011,1.787)],-.114,lid,rig,'head')
        panel('brow-'+str(side),[(x-.027,1.809),(x-.012,1.819),(x+.014,1.816),(x+.027,1.808),(x+.025,1.801),(x+.01,1.806),(x-.013,1.808),(x-.027,1.803)],-.107,brow,rig,'head')
    verts=[(-.014,-.103,1.794),(.014,-.103,1.794),(-.019,-.127,1.727),(.019,-.127,1.727),(0,-.151,1.733),(-.024,-.115,1.718),(.024,-.115,1.718),(0,-.126,1.714)]
    mesh('sculpted-nose',verts,[(0,1,4),(0,4,2),(1,3,4),(2,4,7),(4,3,7),(2,7,5),(7,3,6)],skins,rig,{'head':{i:1 for i in range(8)}})
    # Small lips sit on the cheek plane, rather than projecting like a plate.
    panel('upper-lip',[(-.031,1.686),(-.010,1.692),(0,1.688),(.010,1.692),(.031,1.686),(.015,1.681),(-.015,1.681)],-.096,lips,rig,'head')
    panel('lower-lip',[(-.027,1.681),(.027,1.681),(.015,1.673),(-.012,1.673)],-.095,lips,rig,'head')
    panel('mouth-line',[(-.031,1.686),(-.015,1.681),(.015,1.681),(.031,1.686),(.015,1.678),(-.015,1.678)],-.098,dark,rig,'head')

def hair_and_hat(rig,woman):
    if woman:
        hair=[material('auburn-hair','8D3520'),material('hair-light','AC482A'),material('hair-shadow','66291C')]
        loft('auburn-scalp',[(0,.015,1.838,.112,.106),(0,.016,1.906,.118,.108),(0,.018,1.962,.071,.081),(0,.018,1.976,.020,.025)],hair,rig,'head')
        # Back and side curtain is open at the front; there is no hair shell over the face.
        import math
        verts=[]
        for z,rx,ry in [(1.91,.122,.113),(1.79,.135,.124),(1.60,.149,.133),(1.37,.184,.139)]:
            for i in range(9):
                angle=math.pi*i/8;verts.append((rx*math.cos(angle),.012+ry*math.sin(angle)-.026*abs(math.cos(angle)),z))
        faces=[]
        for r in range(3):
            for i in range(8):
                a=r*9+i;faces.extend([(a,a+1,a+10),(a,a+10,a+9)])
        weights={'head':{},'spine':{}}
        for r,h in enumerate([1,1,.85,.2]):
            for i in range(r*9,(r+1)*9):weights['head'][i]=h;weights['spine'][i]=1-h
        mesh('long-auburn-hair',verts,faces,hair,rig,weights)
        for side in [-1,1]:
            panel('hairline-'+str(side),[(side*.006,1.912),(side*.076,1.902),(side*.110,1.863),(side*.119,1.760),(side*.104,1.819),(side*.091,1.860),(side*.047,1.879),(side*.006,1.881)],-.105,hair[side==1],rig,'head')
    else:
        hair=material('short-hair','674C3E')
        loft('short-hair',[(0,.012,1.845,.114,.106),(0,.012,1.891,.104,.097),(0,.015,1.918,.070,.074)],[hair],rig,'head')
        cream=[material('hat-cream','D5CFAB'),material('hat-highlight','E6DDBB'),material('hat-shadow','A7A487')]
        loft('hat-brim',[(0,.014,1.905,.172,.154),(0,.014,1.923,.192,.170),(0,.014,1.944,.166,.149)],cream,rig,'head')
        loft('hat-crown',[(0,.014,1.930,.125,.114),(0,.014,2.015,.113,.103),(0,.014,2.067,.071,.074),(0,.014,2.078,.028,.034)],cream,rig,'head')
        band=material('hat-band','BAB596')
        loft('hat-band',[(0,.014,1.941,.127,.116),(0,.014,1.959,.126,.115)],[band],rig,'head')

def plaid(obj,rig,roots):
    """UV-mapped woven plaid stays continuous over large cloth polygons."""
    name='woven-shirt-plaid'
    tex=bpy.data.images.get(name)
    if not tex:
        tex=bpy.data.images.new(name,width=128,height=128)
        pixels=[]
        for y in range(128):
            for x in range(128):
                stripe_x=26<=x<49 or 102<=x<109
                stripe_y=26<=y<49 or 102<=y<109
                rgb=(.74,.81,.82) if stripe_x or stripe_y else (.86,.90,.87)
                if stripe_x and stripe_y:rgb=(.54,.65,.72)
                if x in [23,51,99,111] or y in [23,51,99,111]:rgb=(.68,.75,.77)
                pixels.extend((*rgb,1))
        tex.pixels=pixels;tex.pack()
    mat=bpy.data.materials.get(name)
    if not mat:
        mat=material(name,'FFFFFF');node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=tex
        mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    slot=len(obj.data.materials);obj.data.materials.append(mat)
    uv=obj.data.uv_layers.new(name='Plaid cloth coordinates')
    for p in obj.data.polygons:
        if obj.name.startswith('continuous') and p.center.z<1.17:continue
        p.material_index=slot
        for j in p.loop_indices:
            v=obj.data.vertices[obj.data.loops[j].vertex_index].co
            uv.data[j].uv=(v.x/.20,v.z/.20)

def build(kind):
    rig,roots=helper.prepare_rig();woman=kind=='woman'
    uniform=['547F9D','7097B2','3C617E'] if woman else ['CFD9D4','C1D1D4','9EB6C0']
    trousers=['A7B947','B8CA55','849636'] if woman else ['69704E','7E825B','515A40']
    for prefix,colors in [('uniform',uniform),('trousers',trousers)]:
        names=['uniform-blue','uniform-light-panel','uniform-dark-panel'] if prefix=='uniform' else ['trousers-blue','trousers-highlight','trousers-shadow']
        for name,c in zip(names,colors):color(bpy.data.materials[name],c)
    for name,c in zip(['skin','skin-light','skin-shadow'],['D7A579','E6B68B','BA875E'] if woman else ['A26F5D','B5806A','855644']):color(bpy.data.materials[name],c)
    skins=[bpy.data.materials[name] for name in ['skin','skin-light','skin-shadow']]
    cloth=bpy.data.materials['uniform-blue'];light=bpy.data.materials['uniform-light-panel'];shade=bpy.data.materials['uniform-dark-panel']
    for name in ['badge-patch','gold-shield','badge-understripe','cap-emblem','peaked-blue-cap','cap-band','cap-visor','tie-clip','collar-trim-L','collar-trim-R','belt-pouch-L','belt-pouch-R','pouch-flap-L','pouch-flap-R','duty-belt','belt-buckle','tie','glasses-brow','glasses-bridge','glasses-temple--1','glasses-temple-1','sunglass-lens--1','sunglass-lens-1','horseshoe-moustache']:
        delete(name)
    for side,label in [(-1,'L'),(1,'R')]:
        collar=bpy.data.objects['collar-'+label];collar.data.materials.clear();collar.data.materials.append(light)
        delete('cuff-'+label)
        sleeve=bpy.data.objects['continuous-sleeve-'+label]
        for m in skins:sleeve.data.materials.append(m)
        # Shared elbow rings continue as bare skin beneath the rolled/short sleeve.
        for v in sleeve.data.vertices:
            if v.co.z<1.16:
                cx=side*(.302 if v.co.z>1.02 else .306)
                factor=.73 if woman else .79
                v.co.x=cx+(v.co.x-cx)*factor;v.co.y=-.003+(v.co.y+.003)*factor
        for p in sleeve.data.polygons:
            if p.center.z<1.17:p.material_index=3+p.index%3
        loft('sleeve-hem-'+label,[(side*.30,.003,1.165,.066,.066),(side*.30,.003,1.201,.071,.071)],[light,cloth],rig,'forearm.'+label,
             lambda i:{'upper_arm.'+label:.25 if i==0 else .5,'forearm.'+label:.75 if i==0 else .5})
        delete('upper-trousers-'+label);delete('lower-trousers-'+label)
        heights=[.82,.76,.66,.53,.48,.46,.44,.40,.25,.12]
        radii=[(.095,.097),(.094,.094),(.088,.089),(.083,.085),(.082,.084),(.081,.083),(.080,.082),(.078,.080),(.070,.071),(.062,.063)]
        shin=[0,0,0,.06,.25,.5,.75,.97,1,1];hip=[1,.35,0,0,0,0,0,0,0,0]
        rings=[(side*.103,0,(.087 if woman and z==.12 else z),rx*(.80 if woman else 1),ry*(.80 if woman else 1)) for z,(rx,ry) in zip(heights,radii)]
        pants=skins if woman else [bpy.data.materials[name] for name in ['trousers-blue','trousers-highlight','trousers-shadow']]
        loft('continuous-leg-'+label,rings,pants,rig,'hips',lambda i:{'hips':hip[i],'thigh.'+label:(1-shin[i])*(1-hip[i]),'shin.'+label:shin[i]*(1-hip[i])})
        delete('hand-'+label)
        rings=[(side*.306,-.005,.833,.039,.025),(side*.306,-.005,.87,.047,.029),(side*.306,-.004,.925,.043,.030),(side*.306,-.004,.967,.041,.029)]
        wrist=[0,0,.55,1]
        loft('blended-hand-'+label,rings,skins,rig,'hand.'+label,lambda i:{'forearm.'+label:wrist[i],'hand.'+label:1-wrist[i]})
    color(bpy.data.materials['boots'],'343831' if woman else '35382D')
    if woman:
        for label in ['L','R']:
            for v in bpy.data.objects['boot-'+label].data.vertices:v.co.z=.025+(v.co.z-.025)*.62
    seat=bpy.data.objects['trouser-seat']
    if woman:
        for m in seat.data.materials:color(m,'A7BE3A')
        for v in seat.data.vertices:v.co.x*=.80
        green=material('lime-dress','B4D13B');greenlight=material('lime-dress-light','C2DD49');greendark=material('lime-dress-shadow','91AD2D')
        panel('dress-bodice',[(-.083,1.465),(.083,1.465),(.062,1.342),(.052,1.157),(0,1.035),(-.052,1.157),(-.062,1.342)],-.157,green,rig)
        # Waist is spine weighted; the skirt follows both thighs over the seated lap.
        verts=[];faces=[];weights={'spine':{},'hips':{},'thigh.L':{},'thigh.R':{}}
        rings=[(.99,.158,.116),(.86,.181,.125),(.71,.213,.136),(.57,.223,.140)]
        for r,(z,rx,ry) in enumerate(rings):
            for i,(x,y) in enumerate(outline):
                verts.append((x*rx,y*ry,z));j=r*8+i
                h=[1,.60,.12,0][r];l=(1-x)*.5
                weights['hips'][j]=h;weights['thigh.L'][j]=(1-h)*l;weights['thigh.R'][j]=(1-h)*(1-l)
        for r in range(3):
            for i in range(8):a=r*8+i;b=r*8+(i+1)%8;faces.extend([(a,b,b+8),(a,b+8,a+8)])
        skirt=mesh('seated-dress-skirt',verts,faces,[green,greenlight,greendark],rig,weights)
        for m in skirt.data.materials:m.use_backface_culling=False
        # Tailored waist, bust and hips shape the jacket without moving the shoulder perimeter.
        body=bpy.data.objects['tailored-jacket']
        for v in body.data.vertices:
            if any((v.co-helper.Vector(p)).length<1e-6 for root in roots.values() for p in root):continue
            if v.co.z<1.27:
                v.co.x*=.78 if v.co.z>.94 else .86
            if v.co.y<-.075 and 1.22<v.co.z<1.39:v.co.y-=.013
        knot=loft('denim-knot',[(0,-.141,.917,.020,.017),(0,-.151,.950,.046,.027),(0,-.145,.980,.033,.022)],[cloth,light,shade],rig,'spine')
        for side in [-1,1]:
            points=[(side*.025,.946),(side*.072,.934),(side*.109,.868),(side*.073,.845),(side*.023,.901)]
            panel('tied-denim-tail-'+str(side),points,-.151,cloth,rig)
            panel('jacket-opening-'+str(side),[(side*.081,1.48),(side*.112,1.477),(side*.076,1.205),(side*.061,1.12),(0,1.015),(side*.05,1.20)],-.137,shade,rig)
            panel('denim-pocket-'+str(side),[(side*.080,1.295),(side*.178,1.295),(side*.174,1.215),(side*.133,1.198),(side*.081,1.215)],-.141,cloth,rig)
            panel('pocket-flap-'+str(side),[(side*.077,1.303),(side*.181,1.303),(side*.171,1.278),(side*.133,1.266),(side*.086,1.279)],-.146,light,rig)
    else:
        for obj in [bpy.data.objects['tailored-jacket'],*[bpy.data.objects['continuous-sleeve-'+s] for s in ['L','R']]]:plaid(obj,rig,roots)
        panel('shirt-front-placket',[(-.012,.89),(.012,.89),(.012,1.498),(-.012,1.498)],-.127,light,rig)
        pocket=panel('shirt-pocket',[(.084,1.312),(.168,1.312),(.168,1.225),(.126,1.205),(.084,1.225)],-.137,light,rig)
        plaid(pocket,rig,roots)
    silver=material('shirt-buttons','CED5D1')
    for i in range(5):
        z=1.40-i*.095
        disc('shirt-button-'+str(i),-.076 if woman else 0,-.146 if woman else -.130,z,.006,.006,silver,rig,'spine',8)
    if woman:
        for side in [-1,1]:disc('pocket-button-'+str(side),side*.133,-.149,1.278,.006,.006,silver,rig,'spine',8)
    face(rig,woman,skins);hair_and_hat(rig,woman)
    # Record only actual eyeball vertices so blinking cannot distort face or hair.
    eye_positions=[tuple(v.co) for obj in rig.children if obj.type=='MESH' and obj.get('blink_eye') for v in obj.data.vertices]
    joined=helper.join_rig(rig,roots);joined.name='detainee-'+kind+'-skin';joined.data.name=joined.name
    joined.shape_key_add(name='Basis');blink=joined.shape_key_add(name='Blink')
    ids=[v.index for v in joined.data.vertices if any((v.co-helper.Vector(p)).length<1e-6 for p in eye_positions)]
    assert len(ids)>40,'Both eyes must be present'
    for i in ids:blink.data[i].co.z=1.779+(joined.data.vertices[i].co.z-1.779)*.03
    rig.name='detainee-'+kind+'-rig'
    out=ROOT/('src/assets/detainee-'+kind+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
    print('EXPORTED',kind,'26 joints; welded shoulders, continuous knees/wrists; eye blink')

build('woman')
build('man')
