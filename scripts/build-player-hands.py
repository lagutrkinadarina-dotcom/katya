"""Rebuild the authored hands: blender --background --factory-startup --python scripts/build-player-hands.py.
Blender is only needed for asset authoring; the game loads the bundled GLB files.
Coordinates below use the game's Y-up system, in metres, with the cup base at (0, 0, 0).
"""
import bpy
import bmesh
import math
import random
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / 'src' / 'assets'
random.seed(41)


def xyz(p):
    return Vector((p[0], -p[2], p[1]))


def game(p):
    return Vector((p[0], p[2], -p[1]))


def linear(c):
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4


def rgb(hex_color):
    return tuple(linear(int(hex_color[i:i+2], 16) / 255) for i in (0, 2, 4))


def material(name, color, rough=.65):
    m = bpy.data.materials.new(name); m.use_nodes = True
    shader = m.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*rgb(color), 1)
    shader.inputs['Roughness'].default_value = rough
    return m


def mesh(name, verts, faces, mat=None):
    data = bpy.data.meshes.new(name); data.from_pydata([xyz(v) for v in verts], [], faces); data.update()
    bm = bmesh.new(); bm.from_mesh(data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(data); bm.free()
    obj = bpy.data.objects.new(name, data); bpy.context.collection.objects.link(obj)
    if mat: data.materials.append(mat)
    for polygon in data.polygons: polygon.use_smooth = True
    return obj


def curve(points, t):
    pts = [Vector(p) for p in points]
    u = min(max(t, 0), .999999) * (len(pts)-1); i = int(u); f = u-i
    a, b, c, d = pts[max(0,i-1)], pts[i], pts[i+1], pts[min(len(pts)-1,i+2)]
    return .5 * (2*b + (c-a)*f + (2*a-5*b+4*c-d)*f*f + (-a+3*b-3*c+d)*f*f*f)


def profile(values, t):
    u = min(max(t,0),.999999)*(len(values)-1);i=int(u);f=u-i
    f = f*f*(3-2*f)
    return values[i]*(1-f)+values[i+1]*f


def finger_radius(values, t):
    if t <= .90:
        return profile(values[:-1], t/.90)
    return max(.0001, values[-2]*math.sqrt(max(0,1-((t-.90)/.10)**2)))


def frame(points, t):
    center = curve(points, t)
    tangent = (curve(points,min(t+.001,1))-curve(points,max(t-.001,0))).normalized()
    n = Vector((0,0,1)); n = (n-tangent*n.dot(tangent)).normalized()
    if n.length < .1: n=Vector((0,1,0))
    b = tangent.cross(n).normalized()
    return center, tangent, n, b


def tube(name, points, radii, mat=None, steps=72, sides=24, wrinkles=True):
    verts=[];faces=[]
    for i in range(steps+1):
        t=i/steps;c,axis,n,b=frame(points,t);r=finger_radius(radii,t) if wrinkles else profile(radii,t)
        for j in range(sides):
            angle=j/sides*math.tau
            # Tendons and shallow joint folds change the silhouette, not just its colour.
            groove=0
            if wrinkles:
                for joint in (.46,.70):
                    groove += .00045*math.exp(-((t-joint)/.012)**2)*(max(0,math.cos(angle))**2)
            v=c+n*math.cos(angle)*(r*.93-groove)+b*math.sin(angle)*r*.82
            verts.append(v)
    for i in range(steps):
        for j in range(sides):
            a=i*sides+j;b=i*sides+(j+1)%sides
            faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(reversed(range(sides))),tuple(range(steps*sides,(steps+1)*sides))])
    return mesh(name,verts,faces,mat)


def ellipsoid(name, p, scale):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=xyz(p))
    obj=bpy.context.object;obj.name=name;obj.scale=(scale[0],scale[2],scale[1])
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return obj


def palm():
    rings=[(-.07,.085,.026,.020,.019),(-.038,.082,.018,.018,.018),
           (-.015,.081,.014,.019,.020),(.004,.079,.011,.024,.024),
           (.027,.079,.009,.027,.026),(.055,.078,.009,.026,.024),
           (.080,.082,.011,.023,.022),(.097,.085,.013,.018,.018),(.109,.085,.013,.005,.008)]
    verts=[];faces=[];sides=40
    for y,x,z,rx,rz in rings:
        for j in range(sides):
            a=j/sides*math.tau;dorsal=max(0,math.sin(a))
            verts.append((x+math.cos(a)*rx,y,z+math.sin(a)*rz*(1-.16*dorsal)))
    for i in range(len(rings)-1):
        for j in range(sides):
            a=i*sides+j;b=i*sides+(j+1)%sides;faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(reversed(range(sides))),tuple(range((len(rings)-1)*sides,len(rings)*sides))])
    return mesh('palm-and-wrist',verts,faces)


CUP = [
 ('index',[(.084,.096,.012),(.073,.108,.034),(.042,.110,.044),(.018,.105,.055),(-.012,.100,.054)], [.011,.0106,.0098,.0081,.0015]),
 ('middle',[(.085,.079,.015),(.074,.089,.036),(.043,.088,.044),(.012,.083,.054),(-.029,.078,.046)], [.0115,.011,.0102,.0083,.0015]),
 ('ring',[(.087,.058,.017),(.073,.065,.037),(.040,.065,.042),(.012,.059,.052),(-.022,.053,.048)], [.0105,.010,.0094,.0077,.0015]),
 ('little',[(.085,.035,.016),(.071,.043,.034),(.040,.043,.040),(.017,.037,.046),(-.006,.031,.050)], [.0092,.0088,.0082,.0069,.0015]),
 ('thumb',[(.073,.044,-.010),(.067,.069,-.020),(.056,.098,-.034),(.037,.108,-.053),(.015,.113,-.060)], [.015,.014,.012,.0098,.002]),
]
PINCH = [
 ('index',[(.084,.093,.012),(.068,.112,.012),(.044,.121,.015),(.014,.119,.019),(-.014,.111,.022)], [.011,.0105,.0095,.008,.0015]),
 ('middle',[(.085,.077,.011),(.071,.081,.031),(.045,.071,.051),(.043,.053,.049),(.060,.054,.034)], [.0115,.011,.010,.0082,.0015]),
 ('ring',[(.086,.054,.012),(.073,.058,.034),(.046,.050,.051),(.045,.031,.048),(.061,.033,.029)], [.0105,.010,.009,.0075,.0015]),
 ('little',[(.085,.033,.011),(.072,.036,.032),(.050,.025,.045),(.051,.011,.040),(.067,.016,.026)], [.009,.0085,.0078,.0064,.0015]),
 ('thumb',[(.066,.029,.009),(.055,.050,.028),(.035,.077,.037),(.008,.100,.038),(-.012,.110,.036)], [.015,.0135,.0118,.009,.002]),
]


def nail(name, points, radii, mat, edge_mat, cuticle_mat):
    # Convex nail plates follow the final phalanx, including a pale free edge.
    start,end=.835,.965;rows,cols=14,16;verts=[];faces=[]
    for i in range(rows+1):
        u=i/rows;t=start+(end-start)*u;c,_,n,b=frame(points,t);r=finger_radius(radii,t)
        width=.70 * (.78+.22*math.sin(math.pi*u)**.45)
        for j in range(cols+1):
            a=(j/cols*2-1)*width
            verts.append(c+n*(r*.93*math.cos(a)+.0006)+b*(r*.82*math.sin(a)))
    for i in range(rows):
        for j in range(cols):
            a=i*(cols+1)+j;faces.append((a,a+1,a+cols+2,a+cols+1))
    obj=mesh(name+'-nail',verts,faces,mat);obj.data.materials.append(edge_mat)
    for face in obj.data.polygons:
        # Last two rows make a thin natural nail edge, rather than a white painted nail.
        if face.index//cols>=rows-1:face.material_index=1
    # Narrow flesh lip joins the plate to the finger at its base.
    p=[]
    for j in range(13):
        a=(j/12*2-1)*.52;c,_,n,b=frame(points,start+.01)
        r=finger_radius(radii,start+.01);p.append(c+n*(r*.93*math.cos(a)+.0005)+b*r*.82*math.sin(a))
    tube(name+'-cuticle',p,[.00045]*4,cuticle_mat,steps=16,sides=8,wrinkles=False)
    return obj


def skin_details(obj, pose):
    # Linear vertex colours: slight mottling, warmer joints, and subdued wrist veins.
    colors=obj.data.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='POINT')
    base=rgb('b99b88')
    joint_frames=[frame(points,t) for _,points,_ in (CUP if pose=='hand-cup' else PINCH) for t in (.46,.70)]
    for i,v in enumerate(obj.data.vertices):
        p=game(v.co);x,y,z=p
        noise=(math.sin(x*1320+y*938+z*1301)+math.sin(x*2311-y*1131+z*869))*.008
        joint=sum(math.exp(-((y-height)/.009)**2) for height in (.038,.059,.083,.105))*.022
        fold=0
        for c,axis,n,b in joint_frames:
            delta=p-c
            if delta.length<.014 and delta.dot(n)>.004:
                fold+=math.exp(-(delta.dot(axis)/.0006)**2)*.023
        dorsal=max(0,min(1,(z-.015)/.025))
        vein=math.exp(-((x-(.080+.04*y))/.002)**2)*dorsal*max(0,1-abs(y-.025)/.06)*.015
        colors.data[i].color=(*[max(0,base[k]*(1+noise-fold)+[joint,-joint*.25,-joint*.4][k]-[vein,vein*.3,0][k]) for k in range(3)],1)
    mat=material(pose+'-skin','ffffff',.68);obj.data.materials.clear();obj.data.materials.append(mat)
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;shader=nodes.get('Principled BSDF')
    attr=nodes.new('ShaderNodeVertexColor');attr.layer_name='Col';links.new(attr.outputs['Color'],shader.inputs['Base Color'])
    noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=2100;noise.inputs['Detail'].default_value=2
    coordinates=nodes.new('ShaderNodeTexCoord');links.new(coordinates.outputs['Object'],noise.inputs['Vector'])
    bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.10;bump.inputs['Distance'].default_value=.00016;links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],shader.inputs['Normal'])
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.2,island_margin=.01);bpy.ops.object.mode_set(mode='OBJECT')
    image=bpy.data.images.new(pose+'-skin-pores',width=1024,height=1024);image.colorspace_settings.name='Non-Color'
    texture=nodes.new('ShaderNodeTexImage');texture.image=image;nodes.active=texture
    bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.samples=8
    bpy.context.scene.render.bake.margin=6;bpy.context.scene.render.bake.use_clear=True
    bpy.ops.object.bake(type='NORMAL')
    links.remove(shader.inputs['Normal'].links[0]);normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.35;links.new(texture.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],shader.inputs['Normal'])
    image.pack()


def sleeve(pose):
    cloth=material('uniform-cloth','34414a',.93);shirt=material('shirt-cuff','d2cfbf',.82);seam=material('tailored-seam','29353d',.96)
    points=[(.085,-.056,.026),(.090,-.095,.033),(.117,-.21,.083),(.158,-.33,.146),(.215,-.46,.224)]
    if pose=='hand-payment':points=[(.085,-.056,.026),(.090,-.095,.011),(.117,-.21,-.045),(.158,-.33,-.123),(.215,-.46,-.20)]
    # Cloth folds, a separate shirt cuff and a seam make the forearm read as a sleeve.
    obj=tube('tailored-sleeve',points,[.024,.028,.031,.035,.041],cloth,steps=80,sides=32,wrinkles=False)
    for v in obj.data.vertices:
        p=game(v.co);y=p.y;amount=.0011*(.5+.5*math.sin(y*112))
        p.x+=amount*math.sin(p.z*190+y*43);p.z+=amount*math.cos(p.x*230+y*51);v.co=xyz(p)
    tube('visible-shirt-cuff',[(.084,-.039,.023),(.086,-.058,.026)],[.0238,.0245],shirt,steps=12,sides=32,wrinkles=False)
    tube('cuff-seam',[(.088,-.083,.030),(.089,-.085,.030)],[.0273,.0273],seam,steps=3,sides=32,wrinkles=False)
    button=ellipsoid('cuff-button',(.116,-.088,.041),(.003,.003,.0012));button.data.materials.append(material('cuff-button','7b8284',.4))


def build(pose, fingers):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    pieces=[palm(),ellipsoid('thenar',(.062,.036,-.004),(.019,.028,.023)),ellipsoid('hypothenar',(.091,.025,.007),(.015,.026,.022))]
    for name,points,radii in fingers:pieces.append(tube(name,points,radii))
    bpy.ops.object.select_all(action='DESELECT')
    for piece in pieces:piece.select_set(True)
    bpy.context.view_layer.objects.active=pieces[0];bpy.ops.object.join();skin=bpy.context.object;skin.name=pose+'-continuous-skin'
    skin.data.remesh_voxel_size=.00085;skin.data.use_remesh_preserve_volume=True;bpy.ops.object.voxel_remesh()
    smooth=skin.modifiers.new('Surface relaxation','SMOOTH');smooth.factor=.48;smooth.iterations=5;bpy.ops.object.modifier_apply(modifier=smooth.name)
    decimate=skin.modifiers.new('Game mesh','DECIMATE');decimate.ratio=min(1,12500/len(skin.data.polygons));bpy.ops.object.modifier_apply(modifier=decimate.name)
    for p in skin.data.polygons:p.use_smooth=True
    skin_details(skin,pose)
    bpy.ops.object.select_all(action='DESELECT')
    nails=material('natural-nails','cfb4a3',.38);edges=material('nail-free-edge','d9c8b6',.48);cuticles=material('cuticles','b49480',.75)
    for name,points,radii in fingers:nail(name,points,radii,nails,edges,cuticles)
    sleeve(pose)
    root=bpy.data.objects.new(pose,None);bpy.context.collection.objects.link(root)
    for obj in list(bpy.context.scene.objects):
        if obj!=root:obj.parent=root
    bpy.ops.export_scene.gltf(filepath=str(OUT/(pose+'.glb')),export_format='GLB',export_yup=True,export_apply=True,export_texcoords=True,export_normals=True,export_attributes=False)
    print('EXPORTED',pose,len(skin.data.vertices),'vertices',len(skin.data.polygons),'faces')


build('hand-cup',CUP)
build('hand-payment',PINCH)
