"""
Procedurally build + render the 5 Lexica Knights enemies in Blender.

Run with:
  /Applications/Blender.app/Contents/MacOS/Blender \
    --background --python scripts/blender/render_enemies.py

Outputs PNGs (1024x1024, transparent background, Eevee renderer) to
resources/enemies/ and copies them to public/enemies/ so Vite serves them
at the same paths declared in src/types/enemies.ts.

Each enemy is a stylized chibi composed of Blender primitives — sphere head,
sphere body, cylinder limbs — with per-enemy silhouette variations (tusks,
clubs, hoods, etc.) so they're recognizable at small sprite sizes.
"""

import bpy
import math
import sys
from pathlib import Path

# ─── Output paths ──────────────────────────────────────────────────────────
# Blender's __file__ points to the script. Two parents up is the repo root.
REPO_ROOT = Path(bpy.path.abspath(__file__)).resolve().parent.parent.parent
RESOURCES_DIR = REPO_ROOT / "resources" / "enemies"
PUBLIC_DIR = REPO_ROOT / "public" / "enemies"
RESOURCES_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)


# ─── Scene + render setup ──────────────────────────────────────────────────

def reset_scene():
    """Delete everything in the current scene."""
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes:
        bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        bpy.data.materials.remove(block)
    for block in bpy.data.lights:
        bpy.data.lights.remove(block)
    for block in bpy.data.cameras:
        bpy.data.cameras.remove(block)


def setup_render(width=1024, height=1024):
    scene = bpy.context.scene
    # Blender 4.2+ ships Eevee Next; prefer it but fall back gracefully.
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    # Some color management to keep saturation pop.
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"


def setup_camera():
    """Front-facing orthographic camera, framed to capture full chibi body."""
    bpy.ops.object.camera_add(location=(0, -10, 1.25))
    cam = bpy.context.object
    cam.rotation_euler = (math.radians(90), 0, 0)
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 3.6
    bpy.context.scene.camera = cam


def setup_lighting():
    """Three-point: key (warm top-right), fill (cool left), rim (back-top)."""
    bpy.ops.object.light_add(type="AREA", location=(3, -4, 5))
    key = bpy.context.object
    key.rotation_euler = (math.radians(50), math.radians(30), 0)
    key.data.energy = 800
    key.data.color = (1.0, 0.95, 0.85)
    key.data.size = 4

    bpy.ops.object.light_add(type="AREA", location=(-4, -3, 3))
    fill = bpy.context.object
    fill.rotation_euler = (math.radians(70), math.radians(-30), 0)
    fill.data.energy = 350
    fill.data.color = (0.7, 0.85, 1.0)
    fill.data.size = 4

    bpy.ops.object.light_add(type="AREA", location=(0, 5, 4))
    rim = bpy.context.object
    rim.rotation_euler = (math.radians(115), 0, 0)
    rim.data.energy = 600
    rim.data.color = (1.0, 0.75, 1.0)
    rim.data.size = 3


# ─── Material / primitive helpers ──────────────────────────────────────────

def make_material(name, color, roughness=0.55, metallic=0.0, emission=0.0,
                  alpha=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = metallic
    # 'Emission' was renamed to 'Emission Color' in Blender 4.0+.
    if emission > 0:
        emission_key = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
        bsdf.inputs[emission_key].default_value = (*color, 1.0)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission
    if alpha < 1.0 and "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = alpha
        mat.blend_method = "BLEND" if hasattr(mat, "blend_method") else mat.blend_method
    return mat


def sphere(name, location, scale, material, segments=24, rings=16, smooth=True):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    if smooth:
        bpy.ops.object.shade_smooth()
    obj.data.materials.append(material)
    return obj


def cube(name, location, scale, material, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.rotation_euler = rotation
    obj.data.materials.append(material)
    return obj


def cyl(name, location, radius, depth, material, rotation=(0, 0, 0),
        smooth=True):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=radius, depth=depth, vertices=24, location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = rotation
    if smooth:
        bpy.ops.object.shade_smooth()
    obj.data.materials.append(material)
    return obj


def cone(name, location, radius, depth, material, rotation=(0, 0, 0),
         smooth=True):
    bpy.ops.mesh.primitive_cone_add(
        radius1=radius, radius2=0, depth=depth, vertices=20, location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = rotation
    if smooth:
        bpy.ops.object.shade_smooth()
    obj.data.materials.append(material)
    return obj


# ─── Shared chibi body parts ───────────────────────────────────────────────

def base_legs(skin_mat, leg_color, height=0.6, x_spread=0.25):
    """Legs from z=0 (feet bottom) to z=height. Feet sit ON the ground plane."""
    leg_mat = make_material("LegMat", leg_color)
    foot_mat = make_material("FootMat", (0.18, 0.10, 0.05), roughness=0.7)
    cyl("LeftLeg", (-x_spread, 0, height / 2 + 0.05),
        radius=0.16, depth=height, material=leg_mat)
    cyl("RightLeg", (x_spread, 0, height / 2 + 0.05),
        radius=0.16, depth=height, material=leg_mat)
    # Feet — wider than legs so they read as feet, not stumps.
    sphere("LeftFoot", (-x_spread, -0.10, 0.05),
           (0.22, 0.32, 0.10), foot_mat)
    sphere("RightFoot", (x_spread, -0.10, 0.05),
           (0.22, 0.32, 0.10), foot_mat)
    return height + 0.05  # top-of-leg z


def base_arms(skin_mat, length=0.65, x_offset=0.55, z_center=1.0, tilt=15):
    """Arms hanging slightly outward from body center at z=z_center."""
    cyl("LeftArm", (-x_offset, 0, z_center),
        radius=0.12, depth=length, material=skin_mat,
        rotation=(0, math.radians(tilt), 0))
    cyl("RightArm", (x_offset, 0, z_center),
        radius=0.12, depth=length, material=skin_mat,
        rotation=(0, math.radians(-tilt), 0))
    # Hand spheres at the lower end of each arm.
    hand_z = z_center - length / 2 + 0.05
    hand_x = x_offset + 0.10
    sphere("LeftHand", (-hand_x, 0, hand_z), (0.16, 0.16, 0.16), skin_mat)
    sphere("RightHand", (hand_x, 0, hand_z), (0.16, 0.16, 0.16), skin_mat)


def base_eyes(head_y_front, z_center, x_spread=0.16,
              color=(0.05, 0.05, 0.08), size=0.075, glow=0.0):
    """Eye spheres pushed JUST past the front of the head so they read clearly."""
    eye_mat = make_material("EyeMat", color, roughness=0.3, emission=glow)
    # head_y_front is the front Y of the head (typically negative). Push eyes
    # forward of it by size so they sit ON the surface, not inside it.
    y = head_y_front - size * 0.6
    sphere("LeftEye", (-x_spread, y, z_center),
           (size, size, size), eye_mat, segments=14, rings=10)
    sphere("RightEye", (x_spread, y, z_center),
           (size, size, size), eye_mat, segments=14, rings=10)
    # White glints — only on solid eyes (skip for glowing ones).
    if glow == 0:
        glint_mat = make_material("Glint", (1, 1, 1), roughness=0.1)
        sphere("LeftGlint",
               (-x_spread - size * 0.25, y - size * 0.6, z_center + size * 0.3),
               (size * 0.3, size * 0.3, size * 0.3), glint_mat,
               segments=8, rings=6)
        sphere("RightGlint",
               (x_spread + size * 0.25, y - size * 0.6, z_center + size * 0.3),
               (size * 0.3, size * 0.3, size * 0.3), glint_mat,
               segments=8, rings=6)


def base_smile(head_y_front, z_center, color=(0.15, 0.05, 0.05),
               width=0.18, height=0.04):
    """Small horizontal mouth on the front surface of the head."""
    mouth_mat = make_material("MouthMat", color, roughness=0.5)
    cube("Mouth", (0, head_y_front - 0.015, z_center),
         (width, 0.02, height), mouth_mat)


# ─── Per-enemy builders ────────────────────────────────────────────────────

def build_goblin():
    skin = make_material("GoblinSkin", (0.42, 0.65, 0.28))
    leather = make_material("GoblinLeather", (0.42, 0.26, 0.13), roughness=0.7)
    base_legs(skin, (0.30, 0.20, 0.10), height=0.45, x_spread=0.22)
    # Body — squat
    sphere("Body", (0, 0, 1.00), (0.55, 0.42, 0.55), leather)
    # Head — pointy chin, slightly forward
    head_scale = (0.62, 0.55, 0.68)
    sphere("Head", (0, -0.05, 1.85), head_scale, skin)
    head_front_y = -0.05 - head_scale[1]  # = -0.60
    # Long pointed ears jutting from sides — outside head bounds
    cone("LeftEar", (-0.72, 0, 1.95), 0.16, 0.60, skin,
         rotation=(0, math.radians(-95), 0))
    cone("RightEar", (0.72, 0, 1.95), 0.16, 0.60, skin,
         rotation=(0, math.radians(95), 0))
    base_arms(skin, length=0.6, x_offset=0.55, z_center=1.05, tilt=12)
    base_eyes(head_front_y, z_center=1.92, x_spread=0.17,
              color=(0.90, 0.18, 0.12), size=0.08)
    base_smile(head_front_y, z_center=1.62, color=(0.12, 0.04, 0.04),
               width=0.20, height=0.04)
    # Snaggle-fang
    fang_mat = make_material("Fang", (1.0, 0.95, 0.85), roughness=0.35)
    cone("Fang", (0.04, head_front_y - 0.02, 1.55), 0.035, 0.13, fang_mat,
         rotation=(math.radians(180), 0, math.radians(8)))
    # Inky quill jaunted over the shoulder
    ink_mat = make_material("Ink", (0.04, 0.04, 0.10), roughness=0.3)
    cyl("QuillShaft", (0.85, 0.30, 1.45), 0.04, 1.4, ink_mat,
        rotation=(math.radians(50), math.radians(15), 0))
    cone("QuillFeather", (1.10, 0.55, 2.05), 0.14, 0.5, ink_mat,
         rotation=(math.radians(50), math.radians(15), 0))


def build_orc():
    skin = make_material("OrcSkin", (0.32, 0.52, 0.22))
    armor = make_material("OrcArmor", (0.28, 0.22, 0.16), roughness=0.6,
                          metallic=0.45)
    leather = make_material("OrcLeather", (0.18, 0.11, 0.05), roughness=0.8)
    base_legs(skin, (0.14, 0.09, 0.05), height=0.55, x_spread=0.28)
    # Chunky chest armor
    cube("Chest", (0, 0, 1.05), (0.62, 0.40, 0.50), armor)
    cube("Belt", (0, -0.01, 0.62), (0.66, 0.42, 0.08), leather)
    # Head — square jaw
    head_scale = (0.55, 0.50, 0.55)
    sphere("Head", (0, -0.05, 1.95), head_scale, skin)
    head_front_y = -0.05 - head_scale[1]  # = -0.55
    # Mohawk — two stacked cones, red
    hair_mat = make_material("OrcHair", (0.55, 0.10, 0.10))
    cone("Mohawk1", (0, 0.05, 2.55), 0.10, 0.40, hair_mat)
    cone("Mohawk2", (0, 0.20, 2.55), 0.07, 0.30, hair_mat,
         rotation=(math.radians(25), 0, 0))
    # Tusks — protrude upward from the lower jaw
    tusk_mat = make_material("Tusk", (0.96, 0.92, 0.80), roughness=0.4)
    cone("LeftTusk", (-0.17, head_front_y - 0.02, 1.62), 0.045, 0.22, tusk_mat,
         rotation=(math.radians(0), 0, math.radians(8)))
    cone("RightTusk", (0.17, head_front_y - 0.02, 1.62), 0.045, 0.22, tusk_mat,
         rotation=(math.radians(0), 0, math.radians(-8)))
    # Shoulder pauldrons sit ON the chest cube corners
    sphere("LeftPauldron", (-0.65, 0, 1.30), (0.28, 0.24, 0.22), armor)
    sphere("RightPauldron", (0.65, 0, 1.30), (0.28, 0.24, 0.22), armor)
    base_arms(skin, length=0.65, x_offset=0.68, z_center=1.05, tilt=10)
    base_eyes(head_front_y, z_center=2.00, x_spread=0.16,
              color=(0.95, 0.85, 0.18), size=0.075, glow=0.6)
    # Brow scowl above eyes
    brow_mat = make_material("OrcBrow", (0.18, 0.30, 0.12), roughness=0.8)
    cube("LBrow", (-0.18, head_front_y - 0.02, 2.10), (0.12, 0.02, 0.025),
         brow_mat, rotation=(0, math.radians(-15), 0))
    cube("RBrow", (0.18, head_front_y - 0.02, 2.10), (0.12, 0.02, 0.025),
         brow_mat, rotation=(0, math.radians(15), 0))
    # Axe gripped in the right hand, head behind shoulder. The shaft runs
    # diagonally and the blade is attached to its upper end.
    handle_mat = make_material("AxeHandle", (0.32, 0.18, 0.08), roughness=0.6)
    blade_mat = make_material("AxeBlade", (0.80, 0.80, 0.84),
                              roughness=0.20, metallic=0.85)
    # Shaft: bottom (grip) near right hand at ~(0.78, 0, 0.8), top behind shoulder.
    # Rotate cylinder around Y by ~25° so it leans right-up.
    cyl("AxeShaft", (1.0, 0.20, 1.55), 0.06, 1.5, handle_mat,
        rotation=(0, math.radians(20), 0))
    # Blade — flat box at upper end of the shaft.
    cube("AxeBlade", (1.20, 0.20, 2.20), (0.06, 0.28, 0.22), blade_mat,
         rotation=(0, math.radians(20), 0))
    # Blade horn point above
    cone("AxeSpike", (1.25, 0.20, 2.50), 0.08, 0.18, blade_mat,
         rotation=(0, math.radians(20), 0))


def build_troll():
    skin = make_material("TrollSkin", (0.35, 0.42, 0.48), roughness=0.7)
    skin_dark = make_material("TrollSkinDark", (0.22, 0.28, 0.34),
                              roughness=0.85)
    loincloth = make_material("Loincloth", (0.35, 0.24, 0.14), roughness=0.85)
    base_legs(skin, (0.36, 0.30, 0.18), height=0.55, x_spread=0.32)
    # Big stocky body
    sphere("Body", (0, 0, 1.05), (0.78, 0.55, 0.65), skin)
    # Belly highlight
    sphere("Belly", (0, -0.32, 0.85), (0.50, 0.18, 0.30), skin_dark)
    # Loincloth around hips
    cone("Loincloth", (0, 0, 0.55), 0.55, 0.45, loincloth,
         rotation=(math.radians(180), 0, 0))
    # Head — wide, squashed
    head_scale = (0.72, 0.58, 0.55)
    sphere("Head", (0, -0.05, 1.95), head_scale, skin)
    head_front_y = -0.05 - head_scale[1]  # = -0.63
    # Big bulbous nose
    sphere("Nose", (0, head_front_y - 0.10, 1.85),
           (0.20, 0.25, 0.18), skin)
    # Brow ridge — heavy
    cube("BrowRidge", (0, head_front_y - 0.05, 2.10),
         (0.55, 0.10, 0.07), skin_dark, rotation=(math.radians(-10), 0, 0))
    # Curved horns
    horn_mat = make_material("Horn", (0.55, 0.45, 0.32), roughness=0.55)
    cone("LeftHorn", (-0.50, 0.05, 2.35), 0.10, 0.50, horn_mat,
         rotation=(0, math.radians(-30), 0))
    cone("RightHorn", (0.50, 0.05, 2.35), 0.10, 0.50, horn_mat,
         rotation=(0, math.radians(30), 0))
    # Tiny eyes deep set under brow
    base_eyes(head_front_y, z_center=1.98, x_spread=0.20,
              color=(0.95, 0.55, 0.12), size=0.075, glow=0.5)
    # Lower fangs poking up
    fang_mat = make_material("TrollFang", (0.96, 0.92, 0.82), roughness=0.4)
    cone("LFang", (-0.18, head_front_y - 0.05, 1.62),
         0.05, 0.20, fang_mat,
         rotation=(0, 0, math.radians(8)))
    cone("RFang", (0.18, head_front_y - 0.05, 1.62),
         0.05, 0.20, fang_mat,
         rotation=(0, 0, math.radians(-8)))
    base_arms(skin, length=0.85, x_offset=0.80, z_center=1.05, tilt=8)
    # Massive club resting on shoulder
    wood = make_material("ClubWood", (0.30, 0.18, 0.10), roughness=0.75)
    cyl("ClubShaft", (1.0, 0.30, 1.7), 0.08, 1.5, wood,
        rotation=(math.radians(45), math.radians(10), 0))
    sphere("ClubHead", (1.30, 0.65, 2.40), (0.32, 0.32, 0.34), wood)
    # Studs on club head
    stud_mat = make_material("ClubStud", (0.75, 0.75, 0.78),
                             roughness=0.3, metallic=0.7)
    for i, (dx, dy, dz) in enumerate([(0.20, 0, 0.20), (-0.10, 0.18, 0.18),
                                       (0, -0.15, 0.20), (0.18, 0.10, -0.18)]):
        sphere(f"Stud{i}",
               (1.30 + dx, 0.65 + dy, 2.40 + dz),
               (0.06, 0.06, 0.06), stud_mat, segments=10, rings=8)


def build_undead():
    bone = make_material("Bone", (0.92, 0.88, 0.78), roughness=0.5)
    bone_dark = make_material("BoneDark", (0.55, 0.50, 0.42), roughness=0.7)
    robe = make_material("UndeadRobe", (0.18, 0.12, 0.22), roughness=0.9)
    robe_torn = make_material("RobeTorn", (0.10, 0.06, 0.13), roughness=0.95)
    # Tattered robe — broad cone from feet upward
    cone("Robe", (0, 0, 0.05), 0.75, 1.70, robe,
         rotation=(math.radians(180), 0, 0))
    # Inner darker layer for depth
    cone("RobeInner", (0, 0, 0.10), 0.48, 1.55, robe_torn,
         rotation=(math.radians(180), 0, 0))
    # Skeletal ribs poking through the front
    sphere("RibCage", (0, -0.38, 1.10), (0.30, 0.08, 0.35), bone_dark)
    for i, z in enumerate([0.95, 1.10, 1.25]):
        cube(f"Rib{i}", (0, -0.42, z), (0.28, 0.02, 0.025), bone)
    # Skull head
    head_scale = (0.55, 0.50, 0.55)
    sphere("Skull", (0, -0.05, 1.95), head_scale, bone)
    head_front_y = -0.05 - head_scale[1]  # = -0.55
    # Sunken eye sockets
    socket = make_material("Socket", (0.02, 0.02, 0.03), roughness=0.95)
    sphere("LSocket", (-0.16, head_front_y + 0.05, 2.00),
           (0.13, 0.08, 0.13), socket, segments=14, rings=10)
    sphere("RSocket", (0.16, head_front_y + 0.05, 2.00),
           (0.13, 0.08, 0.13), socket, segments=14, rings=10)
    # Glowing pinpricks inside the sockets
    glow_mat = make_material("EyeGlow", (0.10, 0.95, 0.55),
                             emission=8.0)
    sphere("LGlow", (-0.16, head_front_y - 0.02, 2.00),
           (0.05, 0.05, 0.05), glow_mat, segments=10, rings=8)
    sphere("RGlow", (0.16, head_front_y - 0.02, 2.00),
           (0.05, 0.05, 0.05), glow_mat, segments=10, rings=8)
    # Nose hole
    cube("NoseHole", (0, head_front_y - 0.01, 1.80),
         (0.04, 0.02, 0.08), socket)
    # Jaw + teeth
    cube("Jaw", (0, -0.32, 1.65), (0.28, 0.20, 0.08), bone)
    for i, x in enumerate([-0.18, -0.06, 0.06, 0.18]):
        cube(f"Tooth{i}", (x, head_front_y - 0.04, 1.66),
             (0.022, 0.03, 0.05), bone)
    # Bony arms emerging from frayed sleeves
    cyl("LArm", (-0.50, -0.05, 1.05), 0.08, 0.7, bone_dark,
        rotation=(0, math.radians(15), 0))
    cyl("RArm", (0.50, -0.05, 1.05), 0.08, 0.7, bone_dark,
        rotation=(0, math.radians(-15), 0))
    sphere("LHand", (-0.65, -0.05, 0.72), (0.10, 0.10, 0.10), bone)
    sphere("RHand", (0.65, -0.05, 0.72), (0.10, 0.10, 0.10), bone)
    # Tall hood implied behind skull
    cone("Hood", (0, 0.15, 2.45), 0.55, 0.55, robe,
         rotation=(math.radians(8), 0, 0))


def build_wraith():
    # Tall hooded shadow figure. No legs — the shroud trails from the hood
    # down to a tattered hem, with skeletal hands emerging at the sides.
    shroud = make_material("Shroud", (0.22, 0.18, 0.34), roughness=0.85)
    shroud_inner = make_material("ShroudInner", (0.06, 0.04, 0.12),
                                 roughness=0.95)
    glow_eye = make_material("WraithEye", (0.45, 0.90, 1.0), emission=15.0)
    glow_aura = make_material("WraithEyeAura", (0.45, 0.90, 1.0),
                              emission=3.0)
    # Main shroud — tall narrow cone, base just below the head, tip near the
    # ground. Center placed so base lands at ~z=2.0 (where the head sits).
    cone("Shroud", (0, 0, 1.05), 0.85, 2.30, shroud,
         rotation=(math.radians(180), 0, 0))
    # Inner darker layer — visible as a vertical slit down the middle.
    cone("ShroudInner", (0, -0.02, 1.05), 0.55, 2.25, shroud_inner,
         rotation=(math.radians(180), 0, 0))
    # Head shadow — black sphere nestled INSIDE the top of the shroud, so
    # the silhouette is continuous from hood to body.
    sphere("Head", (0, -0.05, 2.15), (0.45, 0.42, 0.48), shroud_inner)
    # Hood — cone covering the top of the head, tip up, base around the
    # head at z=1.95 so it overlaps the head and the shroud collar.
    cone("Hood", (0, 0.05, 2.55), 0.62, 0.75, shroud,
         rotation=(math.radians(5), 0, 0))
    # Glowing eyes deep in the hood shadow.
    sphere("LEye", (-0.13, -0.42, 2.15), (0.075, 0.075, 0.075), glow_eye,
           segments=14, rings=10)
    sphere("REye", (0.13, -0.42, 2.15), (0.075, 0.075, 0.075), glow_eye,
           segments=14, rings=10)
    # Soft glow halos in front of the eyes.
    sphere("LEyeAura", (-0.13, -0.46, 2.15), (0.16, 0.04, 0.16), glow_aura,
           segments=12, rings=8)
    sphere("REyeAura", (0.13, -0.46, 2.15), (0.16, 0.04, 0.16), glow_aura,
           segments=12, rings=8)
    # Skeletal hands emerging from frayed sleeves at the sides of the shroud.
    bone = make_material("WraithBone", (0.82, 0.86, 0.95), roughness=0.4)
    cyl("LArm", (-0.55, -0.20, 1.20), 0.08, 0.6, bone,
        rotation=(math.radians(15), math.radians(20), 0))
    cyl("RArm", (0.55, -0.20, 1.20), 0.08, 0.6, bone,
        rotation=(math.radians(15), math.radians(-20), 0))
    sphere("LHand", (-0.75, -0.30, 0.92), (0.12, 0.09, 0.12), bone)
    sphere("RHand", (0.75, -0.30, 0.92), (0.12, 0.09, 0.12), bone)
    # Tattered tendrils at the hem.
    for i, (x, tilt) in enumerate([(-0.30, -20), (0.30, 20),
                                    (-0.10, 0), (0.10, 0)]):
        cone(f"Tendril{i}", (x, 0, -0.10), 0.10, 0.45, shroud,
             rotation=(math.radians(180), 0, math.radians(tilt)))


def build_hero():
    """The player character: a knight-scribe.

    Built here with the enemies rather than beside them, because the shared
    camera and lighting are exactly what make a cast look like one cast — the
    hero previously existed only as hand-drawn vectors in the combat overlay and
    never quite matched the sprites it fought.

    The title is "Lexica Knights" and the verb is spelling words, so the
    character is a knight whose weapon is a quill: armour and a sword silhouette
    for the knight, a plumed nib and a glowing blade for the word-magic. Violet
    and gold match the app's own palette.
    """
    skin = make_material("HeroSkin", (0.96, 0.80, 0.66))
    steel = make_material("HeroSteel", (0.72, 0.75, 0.85), roughness=0.28,
                          metallic=0.85)
    violet = make_material("HeroViolet", (0.36, 0.24, 0.62), roughness=0.55)
    gold = make_material("HeroGold", (1.0, 0.78, 0.25), roughness=0.25,
                         metallic=0.9)
    rune = make_material("HeroRune", (0.35, 0.85, 1.0), roughness=0.2,
                         emission=6.0)

    base_legs(skin, (0.22, 0.20, 0.34), height=0.52, x_spread=0.23)

    # Torso — a violet tabard with a steel breastplate sitting proud of it. The
    # plate is a squashed sphere rather than a box: a cube reads as a flat
    # signboard from the camera's near-front angle.
    sphere("Body", (0, 0, 1.02), (0.50, 0.38, 0.52), violet)
    sphere("Breastplate", (0, -0.12, 1.02), (0.44, 0.30, 0.44), steel)
    # Belt sits inside the tabard's silhouette; a wider disc pokes out at the
    # hips and reads as a stray ring.
    cyl("Belt", (0, 0, 0.72), 0.38, 0.11, gold,
        rotation=(math.radians(90), 0, 0))

    # Pauldrons — the widest points of the silhouette, which is most of what
    # survives at 86px.
    sphere("LeftPauldron", (-0.54, -0.02, 1.30), (0.25, 0.23, 0.18), steel)
    sphere("RightPauldron", (0.54, -0.02, 1.30), (0.25, 0.23, 0.18), steel)

    # Cloak hanging behind the shoulders. Cones point +Z, so flip it to hang.
    cone("Cloak", (0, 0.26, 0.98), 0.56, 1.30, violet,
         rotation=(math.radians(180), 0, 0))

    head_scale = (0.56, 0.52, 0.58)
    head_z = 1.86
    sphere("Head", (0, -0.05, head_z), head_scale, skin)
    head_front_y = -0.05 - head_scale[1]  # = -0.57

    # Open helm. The band sits at the BROW, not the crown: any higher and it
    # reads as a hairline rather than a helmet, which is the whole difference
    # between a knight and a person. Gold so it separates from the steel plate.
    cyl("HelmBand", (0, -0.05, head_z + 0.22), 0.575, 0.17, gold,
        rotation=(math.radians(90), 0, 0))
    # Dome over the crown, slightly proud of the head so it is clearly a shell.
    sphere("HelmDome", (0, -0.03, head_z + 0.24), (0.56, 0.52, 0.42), steel)
    # Crest, big enough to survive the sprite's downscale.
    cone("HelmCrest", (0, 0.04, head_z + 0.86), 0.15, 0.60, violet)

    base_arms(skin, length=0.62, x_offset=0.54, z_center=1.06, tilt=12)
    base_eyes(head_front_y, z_center=head_z + 0.06, x_spread=0.16,
              color=(0.10, 0.18, 0.42), size=0.08)
    base_smile(head_front_y, z_center=head_z - 0.22, color=(0.45, 0.20, 0.18),
               width=0.16, height=0.035)

    # The rune-blade, held up from the right hand. Everything is stacked on one
    # vertical line through x=0.78 so the parts genuinely overlap: a tilted
    # chain of primitives is how you end up with a sword floating beside a fist.
    sword_x = 0.78
    cyl("SwordGrip", (sword_x, 0.02, 0.98), 0.05, 0.36, gold)
    cyl("SwordPommel", (sword_x, 0.02, 0.78), 0.075, 0.10, gold)
    cube("SwordGuard", (sword_x, 0.02, 1.18), (0.22, 0.07, 0.05), gold)
    # Blade base overlaps the guard deeply; a marginal join opens up under any
    # later tweak.
    cone("SwordBlade", (sword_x, 0.02, 1.86), 0.115, 1.42, steel)
    # Rune light up the flat of the blade. It has to stand clearly proud of the
    # front face — buried inside the steel it contributes nothing, and this glow
    # is the one cue that says the weapon is a word rather than a blade.
    cyl("SwordRune", (sword_x, -0.10, 1.74), 0.045, 1.05, rune)


# ─── Render driver ─────────────────────────────────────────────────────────

# The hero rides along with the enemies so the whole cast shares one camera and
# one lighting rig; the app loads it from the same directory.
ENEMIES = [
    ("goblin", build_goblin),
    ("orc", build_orc),
    ("troll", build_troll),
    ("undead", build_undead),
    ("wraith", build_wraith),
    ("hero", build_hero),
]


def render_enemy(name, builder):
    reset_scene()
    setup_render()
    setup_camera()
    setup_lighting()
    builder()

    out_path = RESOURCES_DIR / f"{name}.png"
    bpy.context.scene.render.filepath = str(out_path)
    print(f"[render] {name} → {out_path}")
    bpy.ops.render.render(write_still=True)

    # Mirror to public/ so Vite serves it from /enemies/<name>.png at runtime.
    public_path = PUBLIC_DIR / f"{name}.png"
    public_path.write_bytes(out_path.read_bytes())
    print(f"[copy]   {public_path}")


def main():
    only = None
    if "--" in sys.argv:
        args = sys.argv[sys.argv.index("--") + 1:]
        if args:
            only = args[0]

    for name, builder in ENEMIES:
        if only and only != name:
            continue
        render_enemy(name, builder)

    print(f"\nDone — {len(ENEMIES) if not only else 1} enemy/enemies rendered.")


if __name__ == "__main__":
    main()
