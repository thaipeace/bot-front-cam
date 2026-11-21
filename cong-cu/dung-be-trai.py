# Dựng bé trai 11 tuổi bằng MPFB2 (MakeHuman cho Blender, tài nguyên CC0) rồi xuất GLB cho sân khấu.
# Chạy:  <Blender> -b --factory-startup? (KHÔNG – cần add-on MPFB đã bật) →
#        ~/Applications/Blender.app/Contents/MacOS/Blender -b -P cong-cu/dung-be-trai.py -- assets/avatar/be-trai-11.glb
# Cần: Blender 4.5 + extension MPFB + gói makehuman_system_assets_cc0 đã giải nén vào thư mục dữ liệu MPFB (xem cong-cu/dung-avatar.md).
import bpy, sys, os

DU_AN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RA = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.path.join(DU_AN, 'assets/avatar/be-trai-11.glb')
RA = os.path.abspath(RA)
AO_KHONG_LOGO = os.path.join(DU_AN, 'assets/avatar/nguon/ao04-khong-logo.png')

from bl_ext.blender_org.mpfb.services import HumanService, ObjectService

# ---------- cảnh trống ----------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# ---------- hình dáng: nam, 11 tuổi, cân đối, người châu Á ----------
# Tuổi MakeHuman: 0 = 1 tuổi, 0.1875 = 11 tuổi, 0.5 = 25 tuổi.
thong_tin = HumanService._create_default_human_info_dict()
thong_tin['name'] = 'be_trai_11'
thong_tin['phenotype'].update({
    'gender': 1.0, 'age': 0.1875, 'muscle': 0.5, 'weight': 0.5, 'proportions': 0.5, 'height': 0.5,
    'race': {'asian': 1.0, 'caucasian': 0.0, 'african': 0.0},
})
thong_tin.update({
    'rig': 'default',                                   # có xương mặt: khoé miệng (cười), mí mắt (chớp)
    'eyes': 'high-poly/high-poly.mhclo',
    'eyebrows': 'eyebrow001/eyebrow001.mhclo',
    'eyelashes': 'eyelashes01/eyelashes01.mhclo',
    'teeth': 'teeth_base/teeth_base.mhclo',
    'tongue': 'tongue01/tongue01.mhclo',
    'hair': 'short02/short02.mhclo',
    'clothes': ['male_casualsuit04/male_casualsuit04.mhclo', 'shoes06/shoes06.mhclo'],
    'skin_mhmat': 'young_asian_male/young_asian_male.mhmat',
    'skin_material_type': 'MAKESKIN',                   # vật liệu đơn giản – xuất glTF được (SSS thì không)
    'eyes_material_type': 'MAKESKIN',
    'clothes_material_type': 'MAKESKIN',
})
cai_dat = HumanService.get_default_deserialization_settings()
cai_dat.update({'subdiv_levels': 0, 'override_skin_model': 'PRESET', 'override_rig': 'PRESET'})
than = HumanService.deserialize_from_dict(thong_tin, cai_dat)
print('[be-trai] đã dựng', than.name)

# ---------- áo không logo ----------
if os.path.exists(AO_KHONG_LOGO):
    for img in bpy.data.images:
        if 'male_casualsuit04_diffuse' in img.name or 'male_casualsuit04_diffuse' in os.path.basename(img.filepath):
            img.filepath = AO_KHONG_LOGO; img.reload(); print('[be-trai] đã thay áo không logo:', img.name)

# ---------- mắt nâu (MAKESKIN không đổi màu mắt theo cài đặt – thay ảnh trực tiếp) ----------
from bl_ext.blender_org.mpfb.services import LocationService
MAT_NAU = os.path.join(LocationService.get_user_data(), 'eyes/materials/brown_eye.png')
for o in bpy.data.objects:
    if o.type == 'MESH' and 'high-poly' in o.name and o.active_material and o.active_material.node_tree:
        for n in o.active_material.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image and 'eye' in n.image.name.lower() and 'normal' not in n.image.name.lower():
                print('[be-trai] mắt:', n.image.name, '→ brown_eye.png'); n.image = bpy.data.images.load(MAT_NAU, check_existing=True)

# ---------- nướng hình dáng vào lưới (shape key + mask + subdiv), giữ modifier Armature ----------
import bmesh
from bl_ext.blender_org.mpfb.services import TargetService

# Khối biểu cảm (gói faceunits01, CC0) giữ lại làm morph target – three.js điều khiển (cười, chớp mắt)
BIEU_CAM = ['mouthSmileLeft', 'mouthSmileRight', 'cheekSquintLeft', 'cheekSquintRight', 'eyeBlinkLeft', 'eyeBlinkRight']

def chon(obj):
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

def xoa_dinh_theo_mask(obj, m):
    """Làm điều modifier MASK làm, nhưng bằng bmesh – giữ được shape key (áp modifier thì không được)."""
    nhom = obj.vertex_groups.get(m.vertex_group)
    if nhom is None:
        return
    bm = bmesh.new(); bm.from_mesh(obj.data)
    dv = bm.verts.layers.deform.active
    xoa = []
    for v in bm.verts:
        trong = dv is not None and nhom.index in v[dv] and v[dv][nhom.index] > 0
        if trong == m.invert_vertex_group:          # mask GIỮ đỉnh trong nhóm (đảo thì ngược lại)
            xoa.append(v)
    bmesh.ops.delete(bm, geom=xoa, context='VERTS')
    bm.to_mesh(obj.data); bm.free(); obj.data.update()

def nuong(obj, bieu_cam=None):
    chon(obj)
    if obj.data.shape_keys:
        bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
    if bieu_cam:
        TargetService.bulk_load_targets(obj, [{'target': t, 'value': 0.0} for t in bieu_cam])
        for k in obj.data.shape_keys.key_blocks:
            if k.name.startswith('!ex-'): k.name = k.name[4:]
        print('[be-trai] biểu cảm:', [k.name for k in obj.data.shape_keys.key_blocks])
    for m in list(obj.modifiers):
        if m.type == 'ARMATURE':
            continue
        if not m.show_viewport:
            obj.modifiers.remove(m); continue
        if obj.data.shape_keys:
            if m.type == 'MASK' and m.mode == 'VERTEX_GROUP':
                xoa_dinh_theo_mask(obj, m)
            elif m.type == 'SUBSURF' and m.levels == 0:
                pass
            else:
                print('[be-trai] bỏ modifier (có shape key)', obj.name, m.name, m.type)
            obj.modifiers.remove(m); continue
        try:
            bpy.ops.object.modifier_apply(modifier=m.name)
        except Exception as e:
            print('[be-trai] bỏ modifier', obj.name, m.name, e); obj.modifiers.remove(m)

for o in list(bpy.data.objects):
    if o.type == 'MESH':
        nuong(o, BIEU_CAM if o == than else None)

# xoá lưới phụ trợ còn sót (helpers đã bị mask cắt; đối tượng rỗng thì bỏ)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and len(o.data.vertices) == 0:
        bpy.data.objects.remove(o)

tong_dinh = sum(len(o.data.vertices) for o in bpy.data.objects if o.type == 'MESH')
print('[be-trai] lưới:', [(o.name, len(o.data.vertices)) for o in bpy.data.objects if o.type == 'MESH'], 'tổng đỉnh', tong_dinh)
cao = max(v.co.z for o in bpy.data.objects if o.type == 'MESH' for v in o.data.vertices) if tong_dinh else 0
print('[be-trai] chiều cao (m):', round(cao, 3))

# ---------- xuất GLB ----------
os.makedirs(os.path.dirname(RA), exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=RA, export_format='GLB', use_selection=False,
    export_apply=True, export_yup=True, export_skins=True, export_animations=False, export_morph=True, export_morph_normal=False,
    export_image_format='JPEG', export_jpeg_quality=88, export_texcoords=True, export_normals=True,
)
print('[be-trai] đã xuất', RA, os.path.getsize(RA) // 1024, 'KB')
