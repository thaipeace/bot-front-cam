# Xoá biểu tượng MakeHuman giữa mặt trước áo male_casualsuit04: phủ vải trơn lấy từ mặt sau áo (cùng vị trí tương đối), viền mềm.
# Dùng: python3 cong-cu/xoa-logo-ao.py <male_casualsuit04_diffuse.png> <ra.png>
import sys
from PIL import Image, ImageDraw, ImageFilter
vao, ra = sys.argv[1], sys.argv[2]
im = Image.open(vao).convert('RGB')
k = im.size[0] / 2048
cx, cy, r = int(1148 * k), int(352 * k), int(160 * k)      # tâm + bán kính logo (đo trên ảnh 2048)
dx = int(-816 * k)                                          # mặt sau áo nằm lệch trái chừng này
vung = (cx - r, cy - r, cx + r, cy + r)
va = im.crop((vung[0] + dx, vung[1], vung[2] + dx, vung[3]))
mask = Image.new('L', va.size, 0)
ImageDraw.Draw(mask).ellipse((int(12 * k), int(12 * k), va.size[0] - int(12 * k), va.size[1] - int(12 * k)), fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(10 * k))
im.paste(va, vung[:2], mask)
im.save(ra)
print('đã lưu', ra)
