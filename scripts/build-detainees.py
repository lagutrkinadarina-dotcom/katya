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

def build(kind):
    rig,roots=helper.prepare_rig()
    hoodie=kind=='hoodie'
    palettes={
        'uniform':['426C48','5D8056','304E3B'] if hoodie else ['A4CEBD','C8E1CC','7BA99E'],
        'trousers':['99774F','B39161','765C40'] if hoodie else ['303046','494156','252639'],
    }
    for prefix,names in [('uniform',['uniform-blue','uniform-light-panel','uniform-dark-panel']),('trousers',['trousers-blue','trousers-highlight','trousers-shadow'])]:
        for name,hex in zip(names,palettes[prefix]):color(bpy.data.materials[name],hex)
    color(bpy.data.materials['skin'],'D8B991' if hoodie else 'DBBD94')
    color(bpy.data.materials['skin-light'],'E8CEA0')
    color(bpy.data.materials['skin-shadow'],'C0A17C')
    color(bpy.data.materials['boots'],'242935')
    color(bpy.data.materials['dark-brown-moustache'],'96805C' if hoodie else '34303B')
    color(bpy.data.materials['belt-and-tie'],'28302F' if hoodie else '292735')
    for name in ['badge-patch','gold-shield','badge-understripe','cap-emblem','peaked-blue-cap','cap-band','cap-visor','tie-clip','collar-trim-L','collar-trim-R','belt-pouch-L','belt-pouch-R','pouch-flap-L','pouch-flap-R']:
        delete(name)
    if hoodie:
        for name in ['duty-belt','belt-buckle','tie','collar-L','collar-R','glasses-brow','glasses-bridge','glasses-temple--1','glasses-temple-1','sunglass-lens--1','sunglass-lens-1','horseshoe-moustache']:
            delete(name)
    else:
        red=material('red-tie','C54136');bpy.data.objects['tie'].data.materials.clear();bpy.data.objects['tie'].data.materials.append(red)
        collar=material('shirt-collar','C2DDC9')
        for label in ['L','R']:
            obj=bpy.data.objects['collar-'+label];obj.data.materials.clear();obj.data.materials.append(collar)

    cloth=bpy.data.materials['uniform-blue'];light=bpy.data.materials['uniform-light-panel']
    cuff=material('civilian-cuff',palettes['uniform'][0])
    for label in ['L','R']:
        obj=bpy.data.objects['cuff-'+label];obj.data.materials.clear();obj.data.materials.append(cuff)
    pants=[bpy.data.materials[name] for name in ['trousers-blue','trousers-highlight','trousers-shadow']]
    skins=[bpy.data.materials[name] for name in ['skin','skin-light','skin-shadow']]
    # Whole leg surfaces, with shared knee rings and fixed hip cuffs.
    for side,label in [(-1,'L'),(1,'R')]:
        delete('upper-trousers-'+label);delete('lower-trousers-'+label)
        heights=[.82,.76,.66,.53,.48,.46,.44,.40,.25,.12]
        radii=[(.095,.097),(.094,.094),(.088,.089),(.083,.085),(.082,.084),(.081,.083),(.080,.082),(.078,.080),(.070,.071),(.062,.063)]
        shin=[0,0,0,.06,.25,.5,.75,.97,1,1]
        hip=[1,.35,0,0,0,0,0,0,0,0]
        rings=[(side*.103,0,z,rx,ry) for z,(rx,ry) in zip(heights,radii)]
        def knee_weights(i):return {'hips':hip[i],'thigh.'+label:(1-shin[i])*(1-hip[i]),'shin.'+label:shin[i]*(1-hip[i])}
        loft('continuous-trousers-'+label,rings,pants,rig,'hips',knee_weights)
        # Skin under the cuff follows the forearm; the palm follows the hand.
        delete('hand-'+label)
        rings=[(side*.306,-.005,.833,.039,.025),(side*.306,-.005,.87,.047,.029),(side*.306,-.004,.925,.043,.030),(side*.306,-.004,.955,.043,.030)]
        wrist=[0,0,.55,1]
        loft('blended-hand-'+label,rings,skins,rig,'hand.'+label,lambda i:{'forearm.'+label:wrist[i],'hand.'+label:1-wrist[i]})
        if hoodie:
            sole=material('sneaker-sole-'+label,'BEC3B5');laces=material('sneaker-laces-'+label,'C7CBB9')
            loft('sneaker-sole-'+label,[(side*.103,-.048,.012,.083,.139),(side*.103,-.048,.035,.083,.139)],[sole],rig,'foot.'+label)
            for i in range(3):box('shoelace-'+label+str(i),(side*.103,-.110-i*.024,.122-i*.014),(.056,.009,.004),laces,rig,'foot.'+label)

    head=bpy.data.objects['faceted-head']
    beard=[material('beard-main','A38B62' if hoodie else '35313D'),material('beard-light','C0A778' if hoodie else '48414B'),material('beard-shadow','826C4E' if hoodie else '242632')]
    offset=len(head.data.materials)
    for m in beard:head.data.materials.append(m)
    for p in head.data.polygons:
        verts=[head.data.vertices[i].co for i in p.vertices]
        mean=sum((v for v in verts),helper.Vector())/len(verts)
        if mean.z<1.727 and mean.y<.022:p.material_index=offset+p.index%3
    if hoodie:
        # A connected faceted beard follows the jaw and tapers at the chin.
        beard_verts=[(-.080,-.112,1.705),(-.050,-.121,1.670),(-.050,-.090,1.600),
                     (0,-.095,1.565),(.050,-.090,1.600),(.050,-.121,1.670),
                     (.080,-.112,1.705),(0,-.132,1.702),(0,-.140,1.630)]
        beard_faces=[(0,1,7),(1,8,7),(1,2,8),(2,3,8),(3,4,8),(4,5,8),(5,7,8),(5,6,7)]
        mesh('angular-blond-beard',beard_verts,beard_faces,beard,rig,{'head':{i:1 for i in range(len(beard_verts))}})
        for vertex in bpy.data.objects['mouth'].data.vertices:vertex.co.y=-.143
        purples=[material('beanie-wool','6A5478'),material('beanie-highlight','80658A'),material('beanie-fold','453951')]
        loft('purple-beanie',[(0,0,1.84,.137,.116),(0,0,1.895,.142,.119),(0,0,1.956,.130,.113),(0,0,1.976,.098,.093)],purples,rig,'head')
        loft('folded-beanie-rim',[(0,0,1.827,.138,.117),(0,0,1.861,.144,.122),(0,0,1.883,.139,.117)],[purples[2]],rig,'head')
        eyes=material('civilian-eyes','302D2B')
        for side in [-1,1]:
            box('eye-'+str(side),(side*.050,-.113,1.779),(.029,.005,.006),eyes,rig,'head')
            box('brow-'+str(side),(side*.050,-.113,1.801),(.035,.005,.004),beard[2],rig,'head')
        inner=material('hoodie-inner-shirt','CAD3AA');zipper=material('hoodie-zip','B6BEAC');string=material('hood-strings','C5CCB6')
        panel('inner-shirt',[(-.118,1.53),(.118,1.53),(.09,1.38),(0,1.20),(-.09,1.38)],-.135,inner,rig)
        hood=loft('hood-collar',[(0,.014,1.475,.143,.114),(0,.014,1.54,.116,.105),(0,.021,1.585,.100,.092)],[cloth,light,bpy.data.materials['uniform-dark-panel']],rig,'spine')
        for v in hood.data.vertices:
            if v.co.y<0:v.co.z-=.08
        for side in [-1,1]:
            panel('zip-edge-'+str(side),[(side*.13,1.53),(side*.145,1.515),(side*.019,1.197),(0,1.197)],-.140,bpy.data.materials['uniform-dark-panel'],rig)
            box('hood-string-'+str(side),(side*.093,-.145,1.42),(.010,.008,.16),string,rig)
        box('jacket-zip',(0,-.125,1.035),(.011,.008,.28),zipper,rig)
        box('zip-pull',(0,-.132,1.175),(.014,.006,.022),zipper,rig)
    else:
        hairs=[material('hair-dark','35303A'),material('hair-highlight','4B4146'),material('hair-shadow','272732')]
        loft('faceted-hair',[(0,.001,1.81,.130,.112),(0,.001,1.867,.124,.108),(0,.005,1.912,.075,.073),(0,.005,1.917,.008,.008)],hairs,rig,'head')
        panel('mouth-skin',[(-.044,1.679),(-.024,1.689),(.024,1.689),(.044,1.679),(.030,1.667),(-.030,1.667)],-.118,skins[0],rig,'head')
        panel('mouth-line',[(-.024,1.673),(.024,1.673),(.024,1.669),(-.024,1.669)],-.121,beard[2],rig,'head')

    joined=helper.join_rig(rig,roots)
    joined.name='detainee-'+kind+'-skin';joined.data.name=joined.name
    if hoodie:
        # Blink the real eye vertices before skeletal deformation, without plates.
        joined.shape_key_add(name='Basis')
        blink=joined.shape_key_add(name='Blink')
        eyes=[v for v in joined.data.vertices if .034<abs(v.co.x)<.066 and -.116<v.co.y<-.110 and 1.775<v.co.z<1.783]
        assert len(eyes)==16, 'Both eye boxes must be present'
        for vertex in eyes:blink.data[vertex.index].co.z=1.779+(vertex.co.z-1.779)*.05
    rig.name='detainee-'+kind+'-rig'
    out=ROOT/('src/assets/detainee-'+kind+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
    print('EXPORTED',kind,'26-joint rig; welded shoulders, continuous knees, blended wrists')

build('hoodie')
build('shirt')
