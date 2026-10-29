"""Cut the achievement badges and UI decor out of masterboard 04 and derive the nav "home" icon.

Run from the repo root: python scripts/extract-ui-assets.py
Needs Pillow, numpy and scipy. Outputs go to assets/badges/, assets/decor/ and assets/icons/home.webp.
The board is a flat illustration sheet, so each item sits on a near-white panel: the panel colour is
flood-filled from the crop border, the item nearest the crop centre is kept and its edge is softened.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

PACK = Path('assets/Hanzi_Studio_MayLong_Mascots_Asset')
BOARD = PACK / '07_original_boards/maylong_masterboard_04.png'

# (name, centre x, centre y, half width, half height) in board pixels (1536x1024).
BADGES = [('study', 990, 950), ('streak', 1060, 950), ('complete', 1132, 950), ('excellent', 1205, 950),
          ('hsk', 1349, 950)]
DECOR = [('nihao', 527, 934, 30, 26), ('check', 764, 934, 20, 22), ('book', 883, 934, 42, 26),
         ('question', 438, 981, 18, 26), ('stars', 662, 975, 22, 18), ('cap', 724, 981, 34, 26),
         ('scroll', 846, 981, 28, 26), ('target', 904, 981, 28, 28)]


def cut(board, cx, cy, hw, hh, tolerance=26, erode=0):
    box = board.crop((cx - hw, cy - hh, cx + hw, cy + hh)).convert('RGB')
    rgb = np.asarray(box).astype(np.int16)
    edge = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    background = np.median(edge, axis=0)
    distance = np.abs(rgb - background).max(axis=2)
    # Panel pixels connected to the border are background; enclosed light pixels (highlights) stay.
    near = distance < tolerance
    labels, _ = ndimage.label(near)
    border_labels = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
    background_mask = np.isin(labels, list(border_labels))
    foreground = ~background_mask
    if erode:
        # Badges sit on a light tile with a soft shadow; peel the leftover rim.
        foreground = ndimage.binary_erosion(foreground, iterations=erode)
    # Keep the component closest to the centre so neighbouring items do not bleed in.
    parts, count = ndimage.label(ndimage.binary_closing(foreground, iterations=2))
    if count > 1:
        h, w = parts.shape
        centre = parts[h // 4:3 * h // 4, w // 4:3 * w // 4]
        keep = np.bincount(centre[centre > 0]).argmax()
        foreground &= ndimage.binary_dilation(parts == keep, iterations=1)
    # Soft edge: partial alpha for pixels close to the panel colour along the outline.
    alpha = np.where(foreground, 255, 0).astype(np.float32)
    ring = foreground & ~ndimage.binary_erosion(foreground)
    alpha[ring] = np.clip(distance[ring] / tolerance, 0.35, 1) * 255
    rgba = np.dstack([rgb.astype(np.uint8), alpha.astype(np.uint8)])
    image = Image.fromarray(rgba, 'RGBA')
    return image.crop(image.getbbox())


def save(image, path, size=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    if size:
        image = image.resize(size, Image.LANCZOS)
    image.save(path, 'WEBP', quality=92, method=6)
    print(path, image.size, path.stat().st_size, 'bytes')


def main():
    board = Image.open(BOARD)
    for name, cx, cy in BADGES:
        save(cut(board, cx, cy, 33, 33, tolerance=44, erode=1), Path(f'assets/badges/{name}.webp'))
    for name, cx, cy, hw, hh in DECOR:
        save(cut(board, cx, cy, hw, hh), Path(f'assets/decor/{name}.webp'))
    # Home icon: Mây Long's head from the high-resolution "happy" expression.
    happy = Image.open(PACK / '02_expressions/01_happy.png').convert('RGBA')
    w, h = happy.size
    head = happy.crop((0, 0, w, int(h * 0.7)))
    head = head.crop(head.getbbox())
    side = max(head.size)
    square = Image.new('RGBA', (side, side))
    square.paste(head, ((side - head.width) // 2, (side - head.height) // 2))
    save(square, Path('assets/icons/home.webp'), (128, 128))


if __name__ == '__main__':
    main()
