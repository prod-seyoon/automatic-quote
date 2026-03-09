import math
import numpy as np
from itertools import permutations

class HeightmapPacker:
    def __init__(self, width: float, depth: float, cell_size: float = 1.0):
        self.cell_size = cell_size
        self.width = math.ceil(width / cell_size)
        self.depth = math.ceil(depth / cell_size)
        self.heightmap = np.zeros((self.depth, self.width), dtype=np.uint16)
        self.last_x = 0
        self.last_y = 0
        self._max_z = 0

    def get_max_z(self, x: int, y: int, w: int, l: int) -> int:
        # Extract the region and find max
        # Boundaries have already been checked by can_place or find_best
        region = self.heightmap[y:y+l, x:x+w]
        if region.size == 0:
            return 0
        return int(np.max(region))

    def can_place(self, x: int, y: int, w: int, l: int, base_z: int, spacing: int) -> bool:
        start_y = max(0, y - spacing)
        end_y = min(self.depth, y + l + spacing)
        start_x = max(0, x - spacing)
        end_x = min(self.width, x + w + spacing)
        
        region = self.heightmap[start_y:end_y, start_x:end_x]
        if region.size == 0:
            return True
        return bool(np.all(region <= base_z))

    def place(self, x: int, y: int, w: int, l: int, h: int, spacing: int):
        base_z = self.get_max_z(x, y, w, l)
        top_z = base_z + h + spacing
        
        self.heightmap[y:y+l, x:x+w] = top_z
        self.last_x = x
        self.last_y = y
        if top_z > self._max_z:
            self._max_z = top_z

    def find_best(self, w: int, l: int, margin: int, spacing: int):
        s_x = max(0, self.last_x - margin)
        e_x = min(self.width - w, self.last_x + margin)
        s_y = max(0, self.last_y - margin)
        e_y = min(self.depth - l, self.last_y + margin)
        
        best = None
        
        for yy in range(s_y, e_y + 1):
            for xx in range(s_x, e_x + 1):
                base_z = self.get_max_z(xx, yy, w, l)
                if best is not None and base_z >= best['base_z']:
                    continue
                if not self.can_place(xx, yy, w, l, base_z, spacing):
                    continue
                best = {'x': xx, 'y': yy, 'base_z': base_z}
        return best

def get_surface_rotations(dims):
    w, l, h = sorted(dims)
    surface = [l, h]
    # Height is the smallest dimension to minimize Z
    return [
        (surface[0], surface[1], w),
        (surface[1], surface[0], w)
    ]

def calculate_3d_packing_layout(parts, box_dim, spacing=10.0, margin_percent=90.0, cell_size=7.0):
    bed_w, bed_d = box_dim
    margin_mm = max(bed_w, bed_d) * (margin_percent / 100.0)
    
    def to_cells(v):
        return math.ceil(v / cell_size)
    
    packer = HeightmapPacker(bed_w, bed_d, cell_size)
    
    # Flatten items and sort by volume descending
    items = []
    for part in parts:
        for _ in range(part['count']):
            dims = part['dimensions']
            vol = dims[0] * dims[1] * dims[2]
            items.append({
                'dims': dims,
                'name': part['name'],
                'volume': vol,
                'mesh': part.get('mesh')
            })
    
    items.sort(key=lambda x: x['volume'], reverse=True)
    placed = []
    
    for item in items:
        dims = item['dims']
        name = item['name']
        cands = []
        
        for rot in get_surface_rotations(dims):
            w, l, h = rot
            if w > bed_w or l > bed_d:
                continue
                
            w_c = to_cells(w)
            l_c = to_cells(l)
            h_c = to_cells(h)
            s_c = to_cells(spacing)
            m_c = to_cells(margin_mm)
            
            best = packer.find_best(w_c, l_c, m_c, s_c)
            if best:
                cands.append({
                    'rot': rot,
                    'x': best['x'],
                    'y': best['y'],
                    'base_z': best['base_z'],
                    'total_z': best['base_z'] + h_c,
                    'cell_dims': (w_c, l_c, h_c)
                })
        
        if not cands:
            return None # Failed to pack an item
            
        cands.sort(key=lambda x: x['total_z'])
        best_cand = cands[0]
        
        x = best_cand['x']
        y = best_cand['y']
        base_z = best_cand['base_z']
        w_c, l_c, h_c = best_cand['cell_dims']
        rot = best_cand['rot']
        
        w, l, orig_h = rot
        packer.place(x, y, w_c, l_c, h_c, to_cells(spacing))
        
        placed.append({
            'position': (x * cell_size, y * cell_size, base_z * cell_size),
            'dims': (w, l, orig_h),
            'name': name,
            'mesh': item.get('mesh')
        })
        
    final_height = 0
    if placed:
        final_height = max([p['position'][2] + p['dims'][2] for p in placed])
        
    return {
        'final_height': math.ceil(max(0, final_height)),
        'packed_parts': placed
    }
