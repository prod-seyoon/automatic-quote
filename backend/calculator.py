import math
import itertools
import trimesh
import numpy as np
from binpacking import calculate_3d_packing_layout

def calculate_fdm(mesh: trimesh.Trimesh, is_hollow: bool = False, shell_thickness: float = 2.0, price_per_gram: float = 500, min_cost: int = 20000) -> int:
    """Calculate FDM cost based on approximate material consumption.
    The mesh should already be in optimal orientation (from find_optimal_print_orientation).
    """
    volume_mm3 = abs(mesh.volume)

    # Shell thickness approximation:
    surface_area_mm2 = mesh.area
    
    if is_hollow:
        # If printing hollow, we only print the shell. No infill.
        shell_volume_approx = surface_area_mm2 * shell_thickness
        inner_volume_approx = 0
    else:
        # Standard wall line count 3, nozzle 0.4mm => ~1.2mm per side
        shell_volume_approx = surface_area_mm2 * 1.2
        inner_volume_approx = max(0, volume_mm3 - shell_volume_approx)

    # Infill 20%, overlap 15% adds a small amount
    infill_volume = inner_volume_approx * 0.20 * 1.15

    # Support estimation based on overhang analysis
    face_normals = mesh.face_normals
    face_areas = mesh.area_faces
    # Support angle 60 degrees: faces with normal Z < -cos(60) = -0.5
    overhang_mask = face_normals[:, 2] < -0.5
    overhang_area = face_areas[overhang_mask].sum()
    # Support density 15%, approximate support as column area * height
    bbox = mesh.bounding_box.extents
    avg_support_height = bbox[2] * 0.3  # rough estimate
    support_volume = overhang_area * avg_support_height * 0.15

    # Brim: perimeter * layer height * brim width (~8mm default)
    brim_volume = mesh.bounding_box.extents[0] * 2 + mesh.bounding_box.extents[1] * 2
    brim_volume = brim_volume * 0.2 * 8.0  # height 0.2mm, width 8mm

    total_material_vol_mm3 = shell_volume_approx + infill_volume + support_volume + brim_volume

    # Convert mm^3 to cm^3
    total_material_vol_cm3 = total_material_vol_mm3 / 1000.0

    # Weight: PLA density ~1.24 g/cm3
    weight_g = total_material_vol_cm3 * 1.24

    cost = weight_g * price_per_gram
    return max(min_cost, int(cost))


def calculate_sla(mesh: trimesh.Trimesh, is_hollow: bool = False, shell_thickness: float = 2.0, price_per_gram: float = 600, min_cost: int = 20000) -> int:
    """SLA cost: volume * 1.5 (density factor for resin + support weight).
    Tiered pricing removed; using user-defined dynamic price_per_gram and min_cost.
    """
    volume_mm3 = abs(mesh.volume)
    
    if is_hollow:
        # When hollow, we calculate volume based on surface area * shell thickness
        shell_volume_approx = mesh.area * shell_thickness
        # Ensure we don't accidentally compute a volume larger than the solid bound
        effective_volume_mm3 = min(volume_mm3, shell_volume_approx)
    else:
        effective_volume_mm3 = volume_mm3

    # User formula: 부피(mm³) * 1.5 to get weight in grams
    # This implicitly accounts for resin density + support weight
    volume_cm3 = effective_volume_mm3 / 1000.0
    weight_g = volume_cm3 * 1.5

    cost = weight_g * price_per_gram
    return max(min_cost, int(cost))


def calculate_sls(items_list, is_hollow: bool = False, shell_thickness: float = 2.0, price_per_gram: float = 1000, equipment_fee: int = 50000, min_cost: int = 50000):
    """Calculate SLS cost for multiple items using optimized flat bin packing.
    
    Args:
        items_list: list of dicts with keys:
            - 'mesh': trimesh.Trimesh
            - 'quantity': int
            - 'name': str
        is_hollow: boolean indicating whether parts are printed hollow
        shell_thickness: float indicating mm thickness of the hollow shell
        price_per_gram: Dynamic cost per gram configured in settings
        equipment_fee: Equipment usage fee per batch
        min_cost: Floor price
    
    Returns:
        dict with details.
    """
    BIN_W, BIN_D, BIN_H = 380, 284, 380  # mm

    # Prepare parts for new heightmap bin-packer
    parts = []
    for item in items_list:
        mesh = item['mesh']
        bbox = mesh.bounding_box.extents
        parts.append({
            'dimensions': [float(bbox[0]), float(bbox[1]), float(bbox[2])],
            'name': item['name'],
            'count': item['quantity'],
            'mesh': mesh # Store mesh for weight calculations later
        })

    # Use the new TypeScript ported logic for 3D Packing (Spacing 10mm, Cell 7mm, Margin 90%)
    packing_result = calculate_3d_packing_layout(parts, [BIN_W, BIN_D], spacing=10.0, margin_percent=90.0, cell_size=7.0)

    if not packing_result or packing_result['final_height'] > BIN_H:
        # If it doesn't fit horizontally or exceeds max height
        return {
            'total_cost': -1,
            'equipment_cost': 0,
            'material_cost': 0,
            'height_cm': 0,
            'fits': False,
            'details': []
        }

    max_z_mm = packing_result['final_height']
    height_cm = max_z_mm / 10.0
    equipment_cost = int(height_cm * equipment_fee) # Height based multiplier plus base equipment fee? Following previous logic roughly:
    if equipment_cost == 0: equipment_cost = equipment_fee

    # Material cost per item
    total_material_cost = 0
    details = []
    for item in items_list:
        mesh = item['mesh']
        qty = item['quantity']
        volume_mm3 = abs(mesh.volume)
        
        if is_hollow:
            shell_volume_approx = mesh.area * shell_thickness
            effective_volume_mm3 = min(volume_mm3, shell_volume_approx)
        else:
            effective_volume_mm3 = volume_mm3
            
        weight_per_part_g = (effective_volume_mm3 / 1000.0) * 1.0  # Nylon ~1.0 g/cm3
        rounded_weight_g = math.ceil(weight_per_part_g / 5.0) * 5.0
        part_material_cost = int(rounded_weight_g * price_per_gram) * qty
        total_material_cost += part_material_cost
        details.append({
            'name': item['name'],
            'quantity': qty,
            'weight_per_part_g': weight_per_part_g,
            'rounded_weight_g': rounded_weight_g,
            'material_cost': part_material_cost
        })

    final_cost = equipment_cost + total_material_cost
    final_cost = max(min_cost, final_cost)

    return {
        'total_cost': final_cost,
        'equipment_cost': equipment_cost,
        'material_cost': total_material_cost,
        'height_cm': height_cm,
        'fits': True,
        'details': details
    }
