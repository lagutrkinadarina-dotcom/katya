"""Build a faceted, rigged officer from the user's single front-view reference.

Blender 4.3: blender -b --factory-startup --python-exit-code 1 --python scripts/build-reference-officer.py
The unseen back is an original continuation of the uniform, not a recovered scan.
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models'
PREVIEW = ROOT / 'docs/previews'
bpy.context.preferences.filepaths.save_version = 0
OUT.mkdir(parents=True, exist_ok=True)
PREVIEW.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, roughness=.85):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*[int(color[i:i+2], 16)/255 for i in (0, 2, 4)], 1)
    m.use_nodes = True
    linear = lambda c: c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*[linear(c) for c in m.diffuse_color[:3]], 1)
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = roughness
    return m

blue = [material('uniform-blue', '145EA6'), material('uniform-light-panel', '2477B5'), material('uniform-dark-panel', '17447E')]
navy = [material('trousers-blue', '183C75'), material('trousers-highlight', '24548E'), material('trousers-shadow', '14284C')]
skin = [material('skin', 'D7B58B'), material('skin-light', 'E6C79D'), material('skin-shadow', 'C19D7B')]
black = material('belt-and-tie', '192237')
shoe = material('boots', '172036')
gold = material('brass', 'DFAC49', .55)
goldlight = material('brass-highlight', 'F1CB6F', .55)
hair = material('dark-brown-moustache', '594039')
lens = material('dark-blue-glasses', '15233C', .35)
frame = material('glasses-frame', '34323A')
parts = []

def mesh(name, verts, faces, mats, bone, varied=False):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    mats = mats if isinstance(mats, list) else [mats]
    for m in mats: data.materials.append(m)
    for p in data.polygons:
        p.use_smooth = False
        if varied and len(mats)>1: p.material_index = [0,0,1,0,2,0,1,0,0,2,0,1][p.index%12] % len(mats)
    parts.append((obj, bone))
    return obj

# Eight corners give the broad flat planes and bevels visible in the reference.
outline = [(-.72,-1),(.72,-1),(1,-.64),(1,.64),(.72,1),(-.72,1),(-1,.64),(-1,-.64)]
def loft(name, rings, mats, bone, varied=False, triangulate=False):
    verts=[(cx+x*rx, cy+y*ry,z) for cx,cy,z,rx,ry in rings for x,y in outline]
    faces=[tuple(reversed(range(8)))]
    for r in range(len(rings)-1):
        for i in range(8):
            a=r*8+i;b=r*8+(i+1)%8;c=b+8;d=a+8
            if triangulate:
                faces.extend([(a,b,d),(b,c,d)] if (r+i)%2 else [(a,b,c),(a,c,d)])
            else: faces.append((a,b,c,d))
    faces.append(tuple(range((len(rings)-1)*8,len(rings)*8)))
    return mesh(name,verts,faces,mats,bone,varied)

def box(name, center, scale, mat, bone, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    if bevel:
        modifier=o.modifiers.new('Small fabric edges','BEVEL');modifier.width=bevel;modifier.segments=1
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    parts.append((o,bone))
    return o

def panel(name, points, depth, mat, bone):
    # Points are (X,Z); the face looks along Blender -Y.
    verts=[(x,depth,z) for x,z in points]
    return mesh(name,verts,[tuple(range(len(verts)))],mat,bone)

def segment(name, a,b,rx,ry,mat,bone):
    a=Vector(a);b=Vector(b);axis=(b-a).normalized()
    u=Vector((1,0,0));u=(u-axis*u.dot(axis)).normalized();v=axis.cross(u)
    verts=[]
    for p,ratio in [(a,1),(b,.84)]:
        for x,y in outline:verts.append(tuple(p+u*x*rx*ratio+v*y*ry*ratio))
    return mesh(name,verts,[tuple(reversed(range(8))),tuple(range(8,16))]+[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)],mat,bone,True)

loft('tailored-jacket',[(0,0,.88,.205,.11),(0,0,1.06,.215,.115),(0,0,1.28,.245,.12),(0,0,1.48,.25,.12),(0,0,1.54,.14,.105)],blue,'spine',True,True)
loft('trouser-seat',[(0,0,.79,.20,.11),(0,0,.91,.205,.115)],navy,'hips',True)
loft('neck',[(0,0,1.50,.066,.063),(0,0,1.63,.069,.064)],skin,'neck')
loft('faceted-head',[(0,0,1.59,.067,.070),(0,-.003,1.63,.103,.086),(0,0,1.70,.122,.100),(0,0,1.80,.124,.105),(0,.002,1.85,.105,.098)],skin,'head',True)
for side,label in [(-1,'L'),(1,'R')]:
    loft('ear-'+label,[(side*.122,0,1.715,.019,.024),(side*.127,0,1.77,.019,.025),(side*.12,0,1.791,.016,.022)],skin,'head')
    segment('upper-sleeve-'+label,(side*.239,0,1.46),(side*.298,.004,1.20),.078,.086,blue,'upper_arm.'+label)
    loft('angular-shoulder-'+label,[(side*.244,0,1.41,.079,.082),(side*.246,0,1.49,.074,.088),(side*.215,0,1.54,.065,.081)],blue,'upper_arm.'+label,True,True)
    segment('lower-sleeve-'+label,(side*.298,.004,1.20),(side*.306,-.005,.96),.067,.065,blue,'forearm.'+label)
    loft('cuff-'+label,[(side*.306,-.005,.947,.057,.057),(side*.305,-.004,.99,.061,.061)],navy,'forearm.'+label)
    loft('hand-'+label,[(side*.306,-.005,.833,.039,.025),(side*.306,-.005,.87,.047,.029),(side*.306,-.004,.955,.043,.030)],skin,'hand.'+label)
    for i in range(4):
        x=side*.306+(i-1.5)*.018
        segment('finger-'+label+'-'+str(i),(x,-.006,.859),(x,-.009,.813+abs(i-1.5)*.005),.010,.013,skin,'hand.'+label)
    segment('thumb-'+label,(side*.272,-.017,.912),(side*.254,-.023,.865),.017,.020,skin,'hand.'+label)
    loft('upper-trousers-'+label,[(side*.103,0,.46,.082,.085),(side*.103,0,.65,.095,.091),(side*.102,0,.82,.095,.097)],navy,'thigh.'+label,True,True)
    loft('lower-trousers-'+label,[(side*.103,0,.12,.062,.063),(side*.103,0,.28,.072,.072),(side*.103,0,.46,.082,.084)],navy,'shin.'+label,True,True)
    loft('boot-'+label,[(side*.103,-.048,.025,.082,.138),(side*.103,-.049,.080,.080,.135),(side*.103,-.003,.14,.061,.067)],shoe,'foot.'+label)
    # Blue collar with small gold accents, as in the supplied uniform.
    panel('collar-'+label,[(side*.025,1.545),(side*.115,1.515),(side*.072,1.466)],-.130,blue[2],'spine')
    panel('collar-trim-'+label,[(side*.045,1.536),(side*.100,1.516),(side*.079,1.500)],-.132,gold,'spine')
    box('belt-pouch-'+label,(side*.180,-.098,.917),(.070,.060,.087),black,'hips',.008)
    panel('pouch-flap-'+label,[(side*.148,.960),(side*.216,.960),(side*.192,.930)],-.135,navy[2],'hips')

loft('duty-belt',[(0,0,.898,.211,.120),(0,0,.947,.211,.120)],black,'hips')
box('belt-buckle',(0,-.132,.925),(.083,.014,.038),gold,'hips',.003)
panel('tie',[(0,1.539),(.025,1.511),(.014,1.479),(.024,1.161),(0,1.111),(-.023,1.15),(-.015,1.478),(-.024,1.510)],-.137,black,'spine')
box('tie-clip',(0,-.144,1.377),(.032,.006,.007),goldlight,'spine')
box('badge-patch',(.120,-.128,1.378),(.079,.009,.112),navy[2],'spine')
panel('gold-shield',[(.087,1.420),(.105,1.413),(.12,1.420),(.135,1.413),(.151,1.420),(.146,1.373),(.12,1.352),(.094,1.373)],-.139,goldlight,'spine')
box('badge-understripe',(.12,-.140,1.342),(.060,.006,.006),goldlight,'spine')

# Sunglasses have a dark broad top and polygonal lenses, rather than spherical eyes.
for side in [-1,1]:
    points=[(side*.012,1.787),(side*.107,1.789),(side*.098,1.746),(side*.072,1.733),(side*.027,1.744)]
    panel('sunglass-lens-'+str(side),points,-.113,lens,'head')
    box('glasses-temple-'+str(side),(side*.116,-.029,1.778),(.008,.157,.010),frame,'head')
box('glasses-brow',(0,-.119,1.786),(.224,.012,.015),frame,'head')
box('glasses-bridge',(0,-.122,1.773),(.034,.008,.009),frame,'head')
mesh('angular-nose',[(-.016,-.11,1.772),(.016,-.11,1.772),(-.022,-.15,1.713),(.022,-.15,1.713),(0,-.165,1.721),(0,-.119,1.707)],[(0,1,4),(0,4,2),(1,3,4),(2,4,5),(4,3,5)],skin,'head',True)
panel('horseshoe-moustache',[(-.085,1.65),(-.080,1.69),(-.054,1.713),(0,1.721),(.054,1.713),(.080,1.69),(.085,1.65),(.063,1.650),(.055,1.683),(.035,1.695),(-.035,1.695),(-.055,1.683),(-.063,1.650)],-.117,hair,'head')
panel('mouth',[(-.033,1.665),(.033,1.665),(.029,1.661),(-.029,1.661)],-.109,hair,'head')
loft('cap-band',[(0,0,1.81,.132,.107),(0,0,1.849,.139,.115)],navy[2],'head')
loft('peaked-blue-cap',[(0,0,1.85,.147,.125),(0,0,1.90,.184,.141),(0,0,1.942,.117,.095),(0,0,1.958,.008,.008)],blue,'head',True,True)
mesh('cap-visor',[(-.136,-.082,1.844),(.136,-.082,1.844),(.13,-.156,1.828),(.075,-.184,1.826),(-.075,-.184,1.826),(-.13,-.156,1.828)],[(0,1,2,3,4,5)],black,'head')
box('cap-emblem',(0,-.144,1.888),(.052,.018,.060),gold,'head',.002)

# A reusable skeleton is included; geometry can be posed instead of rebuilt.
bpy.ops.object.armature_add(enter_editmode=True)
rig=bpy.context.object;rig.name='reference-officer-rig'
rig.data.edit_bones.remove(rig.data.edit_bones[0])
bones={}
def bone(name,head,tail,parent=None):
    b=rig.data.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=bones[parent]
    bones[name]=b
bone('hips',(0,0,.85),(0,0,1.02))
bone('spine',(0,0,1.02),(0,0,1.50),'hips')
bone('neck',(0,0,1.50),(0,0,1.62),'spine')
bone('head',(0,0,1.62),(0,0,1.91),'neck')
for side,label in [(-1,'L'),(1,'R')]:
    bone('upper_arm.'+label,(side*.239,0,1.46),(side*.298,.004,1.20),'spine')
    bone('forearm.'+label,(side*.298,.004,1.20),(side*.306,-.005,.95),'upper_arm.'+label)
    bone('hand.'+label,(side*.306,-.005,.95),(side*.306,-.005,.835),'forearm.'+label)
    bone('thigh.'+label,(side*.103,0,.85),(side*.103,0,.46),'hips')
    bone('shin.'+label,(side*.103,0,.46),(side*.103,0,.12),'thigh.'+label)
    bone('foot.'+label,(side*.103,0,.12),(side*.103,-.12,.04),'shin.'+label)
bpy.ops.object.mode_set(mode='OBJECT')
for obj,joint in parts:
    obj.vertex_groups.new(name=joint).add(list(range(len(obj.data.vertices))),1,'REPLACE')
    mod=obj.modifiers.new('Officer skeleton','ARMATURE');mod.object=rig;mod.use_deform_preserve_volume=True
    obj.parent=rig
    # Recalculate outward winding, including left-side mirrored cloth panels.
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');obj.select_set(False)
rig['reference']='User-provided front view; unseen surfaces reconstructed.'
rig['height_metres']=1.958
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
for obj,_ in parts:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'officer-reference.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)

floor=material('preview-floor','8A9F96')
bpy.ops.mesh.primitive_plane_add(size=200)
bpy.context.object.data.materials.append(floor)
world=bpy.context.scene.world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.46,.55,.51,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.7
def aim(obj,point):obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='AREA',location=(-3,-4,6))
bpy.context.object.data.energy=450;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=4
aim(bpy.context.object,(0,0,1))
bpy.ops.object.camera_add(location=(2.1,-8,3.0))
camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=2.20
aim(camera,(0,0,.98));bpy.context.scene.camera=camera
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64
scene.cycles.use_denoising=False
scene.render.resolution_x=700;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard'
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(PREVIEW/'officer-reference.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'officer-reference.blend'))
bpy.ops.render.render(write_still=True)
print('EXPORTED rigged officer and actual 3D render')
