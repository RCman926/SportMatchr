"""
Open Centrepointe Park in Blender and save a .blend.

  blender --background --python scripts/centrepointe_blender.py

If blender isn't on PATH, import assets/models/centrepointe-park.gltf
via File > Import > glTF 2.0, then File > Save As.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GLTF = ROOT / "assets" / "models" / "centrepointe-park.gltf"
BLEND = ROOT / "assets" / "models" / "centrepointe-park.blend"


def inside_blender() -> None:
    import bpy

    bpy.ops.wm.read_factory_settings(use_empty=True)
    if not GLTF.exists():
        raise SystemExit(f"Missing {GLTF} — run scripts/centrepointe_3d.py first")
    bpy.ops.import_scene.gltf(filepath=str(GLTF))
    # Top-down camera so fields read like the map
    cam_data = bpy.data.cameras.new("Centrepointe_cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 420
    cam = bpy.data.objects.new("Centrepointe_cam", cam_data)
    cam.location = (0, 280, 0)
    cam.rotation_euler = (1.5708, 0, 0)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    sun = bpy.data.lights.new("Sun", type="SUN")
    sun.energy = 3
    sun_ob = bpy.data.objects.new("Sun", sun)
    sun_ob.rotation_euler = (0.6, 0.2, 0.4)
    bpy.context.scene.collection.objects.link(sun_ob)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    print("wrote", BLEND)


def main() -> None:
    if "bpy" in sys.modules:
        inside_blender()
        return
    # Not inside Blender — try to launch it
    for cmd in ("blender", "blender.exe"):
        try:
            subprocess.check_call([cmd, "--background", "--python", str(Path(__file__).resolve())])
            return
        except (FileNotFoundError, subprocess.CalledProcessError):
            continue
    print("Blender isn't installed on PATH.")
    print(f"In Blender: File > Import > glTF 2.0 > {GLTF}")
    print("Then File > Save As > centrepointe-park.blend")


if __name__ == "__main__":
    main()
