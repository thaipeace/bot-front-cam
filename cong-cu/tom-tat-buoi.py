# Tóm tắt nhật ký kha-thi: mỗi động tác app yêu cầu → số lần đếm cuối cùng / mục tiêu, số lần "chuẩn", các câu nhắc kỹ thuật.
# Dùng: python3 cong-cu/tom-tat-buoi.py ket-qua/<lần>/nhat-ky.txt
import re, sys, json
dong = open(sys.argv[1], encoding='utf-8').read().splitlines()
MAU = json.load(open('src/dong-tac/mau/ht003.json', encoding='utf-8'))
TEN = {d['ten']: k for k, d in MAU['dongTac'].items()}
NHAC = {'NGHIÊNG THÊM', 'DUỖI THẲNG TAY', 'NGỰC NHÌN THẲNG', 'NÂNG KHUỶU LÊN', 'ĐỔI ĐỘNG TÁC NHÉ!', 'NHÓN CAO HƠN', 'DANG TAY RỘNG RA', 'ĐƯA TAY LÊN CAO', 'HÔNG ĐỨNG YÊN', 'VAI ĐỨNG YÊN'}
ds, hien = [], None
for d in dong:
    m = re.match(r'\s*([\d.]+)s\s+(.*)', d)
    if not m: continue
    t, nd = float(m.group(1)), m.group(2)
    if not nd.startswith('CHỮ MỚI'): continue
    chu = [c.replace('[cv] ', '').replace('[dom] ', '').strip() for c in nd[len('CHỮ MỚI: '):].split(' | ')]
    for c in chu:
        if c in TEN:
            if hien is None or hien['id'] != TEN[c] or hien.get('xong'):
                hien = {'id': TEN[c], 't': t, 'dem': None, 'nhac': {}}; ds.append(hien)
        elif hien and re.fullmatch(r'\d{1,2}/\d{1,2}', c):
            a, b = map(int, c.split('/'))
            if hien['dem'] is None or (b == hien['dem'][1] and a >= hien['dem'][0]) or hien['dem'][0] == 0: hien['dem'] = (a, b)
        elif hien and c in NHAC: hien['nhac'][c] = hien['nhac'].get(c, 0) + 1
        elif hien and c == 'XONG!': hien['xong'] = True
for h in ds:
    dem = f"{h['dem'][0]}/{h['dem'][1]}" if h['dem'] else '–'
    print(f"{h['t']:7.1f}s  {h['id']:<12} {dem:>6}  {'XONG' if h.get('xong') else '    '}  {', '.join(f'{k}×{v}' for k, v in h['nhac'].items())}")
