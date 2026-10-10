"""Prepare the uploaded modular body without replacing the game's NPCs.
Usage: blender -b --factory-startup --python scripts/prepare-uploaded-male.py -- /path/to/extracted/files
The supplied package has no head mesh; this is a source preparation file.
"""
import bpy,sys,math,json
from pathlib import Path
from mathutils import Matrix
folder=Path(sys.argv[sys.argv.index('--')+1]);root=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
main=None
for filename in ['M_body.fbx','M_top.002_jacket.fbx','M_bot.004_skinnyjeans.fbx','F_shoes.006_lowsneakers.fbx','C_hair_short.001.fbx']:
    before=set(bpy.data.objects);bpy.ops.import_scene.fbx(filepath=str(folder/filename));new=set(bpy.data.objects)-before
    rigs=[o for o in new if o.type=='ARMATURE']
    if main is None:main=rigs[0]
    for obj in new:
        if obj.type!='MESH':continue
        world=obj.matrix_world.copy()
        for mod in obj.modifiers:
            if mod.type=='ARMATURE':
                old=mod.object
                # Never merge incompatible bind skeletons silently.
                used={obj.vertex_groups[g.group].name for v in obj.data.vertices for g in v.groups if g.weight>1e-5}
                for bone in old.data.bones:
                    if bone.name in main.data.bones and bone.name in used:
                        assert (old.matrix_world@bone.head_local-main.matrix_world@main.data.bones[bone.name].head_local).length<.0001,('Different bind pose',filename,bone.name)
                mod.object=main
        obj.parent=main;obj.matrix_world=world
        for p in obj.data.polygons:p.use_smooth=True
    for rig in rigs:
        if rig!=main:bpy.data.objects.remove(rig,do_unlink=True)
# Symmetric fuller torso field affects both vertices and bone rest positions.
def reshape(p):
    x,y,z=p
    belly=math.exp(-((z-1.035)/.19)**2)
    chest=math.exp(-((z-1.22)/.17)**2)
    radius=abs(x);centre=math.exp(-(radius/.25)**4)
    return type(p)((x*(1+.38*belly*centre+.10*chest*centre),y*(1+.60*belly*centre+.18*chest*centre),z))
for obj in list(main.children):
    if obj.type!='MESH':continue
    inv=obj.matrix_world.inverted()
    for v in obj.data.vertices:
        v.co=inv@reshape(obj.matrix_world@v.co)
        weights=[(g.group,g.weight) for g in v.groups];total=sum(w for _,w in weights)
        assert total>1e-8,('Unweighted source vertex',obj.name,v.index)
        for group,weight in weights:obj.vertex_groups[group].add([v.index],weight/total,'REPLACE')
    obj['sourceAsset']='user-uploaded Free Male Character.rar'
    sub=obj.modifiers.new('Editable smooth source surface','SUBSURF');sub.levels=1;sub.render_levels=2
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_move_up(modifier=sub.name)
# Update rest bones in the same deformation field and retain hierarchy/weights.
bpy.context.view_layer.objects.active=main;main.select_set(True);bpy.ops.object.mode_set(mode='EDIT');inv=main.matrix_world.inverted()
for bone in main.data.edit_bones:
    bone.head=inv@reshape(main.matrix_world@bone.head);bone.tail=inv@reshape(main.matrix_world@bone.tail)
bpy.ops.object.mode_set(mode='OBJECT')
for mat in bpy.data.materials:
    mat.use_nodes=True;bsdf=mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value=.8
    name=mat.name.lower()
    prefix='mat_top.002_jacket' if 'jacket' in name else 'mat_bot.004_skinny' if 'skinny' in name else 'mat_shoes.006_lowsneaker' if 'shoe' in name else 'hair_short.001' if 'hair' in name else None
    if prefix:
        path=folder/(prefix+'_RGBMap.png')
        if path.exists():
            image=bpy.data.images.load(str(path));image.pack();tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
        path=folder/(prefix+'_Normal.png')
        if path.exists():
            image=bpy.data.images.load(str(path));image.colorspace_settings.name='Non-Color';image.pack();tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;normal=mat.node_tree.nodes.new('ShaderNodeNormalMap');mat.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);mat.node_tree.links.new(normal.outputs['Normal'],bsdf.inputs['Normal'])
    else:bsdf.inputs['Base Color'].default_value=(.55,.30,.17,1)
main['status']='SOURCE PREPARATION ONLY: no head mesh supplied; not a finished reference character'
main['missing']='head, eyes, mouth, facial morphs, female model'
main['proportionEdit']='fuller waist and abdomen; vertex weights and bind bones transformed together'
bpy.context.preferences.filepaths.save_version=0
out=root/'public/models/source-preparation/uploaded-male-prepared.blend';bpy.ops.wm.save_as_mainfile(filepath=str(out))
report={'status':'incomplete supplied source','meshes':[o.name for o in main.children if o.type=='MESH'],'boneCount':len(main.data.bones),'missing':['head mesh','eyes','mouth','facial morphs','female character'],'gameNPCsReplaced':False}
(root/'public/models/source-preparation/source-inventory.json').write_text(json.dumps(report,indent=2))
print('PREPARED',report)
