# Dựng bé trai 11 tuổi (assets/avatar/be-trai-11.glb)

Chỉ cần làm lại khi muốn đổi ngoại hình. Bản đã dựng nằm sẵn trong git.

## Nhân vật
| | |
|---|---|
| Hình dáng | MPFB2: nam, `age 0.1875` (11 tuổi theo thang MakeHuman), cơ 0.5, cân 0.5, người châu Á. Cao tự nhiên 1,33 m, sân khấu co về 1,40 m |
| Da / mắt / tóc | `young_asian_male`, mắt nâu (`brown_eye.png`), tóc `short02`, lông mày `eyebrow001`, lông mi `eyelashes01` |
| Đồ | áo thun xanh và quần jean `male_casualsuit04` (đã xoá logo MakeHuman bằng `cong-cu/xoa-logo-ao.py`), giày `shoes06` |
| Xương | `default` của MPFB (163 xương, có xương mặt) |
| Biểu cảm | morph target `mouthSmileLeft/Right`, `cheekSquintLeft/Right`, `eyeBlinkLeft/Right` (gói faceunits01). Sân khấu đặt nụ cười và chớp mắt lúc chạy (`src/san-khau/mat.js`) |
| Giấy phép | Tất cả tài nguyên MakeHuman dùng ở đây là **CC0** |

## Cài một lần (macOS; Windows làm tương tự)
1. Blender 4.5 LTS: tải từ download.blender.org (macOS: chép `Blender.app` vào `~/Applications`).
2. MPFB: `Blender -b --online-mode -c extension sync` rồi `Blender -b --online-mode -c extension install mpfb --enable`.
3. Gói tài nguyên, giải nén vào thư mục dữ liệu MPFB
   (macOS: `~/Library/Application Support/Blender/4.5/extensions/.user/blender_org/mpfb/data`):
   - `https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip` (281 MB; máy chủ `files2` rất chậm)
   - `https://files.makehumancommunity.org/functional/faceunits01.zip`

## Dựng
```
python3 cong-cu/xoa-logo-ao.py "<thư mục dữ liệu MPFB>/clothes/male_casualsuit04/male_casualsuit04_diffuse.png" assets/avatar/nguon/ao04-khong-logo.png
~/Applications/Blender.app/Contents/MacOS/Blender -b -P cong-cu/dung-be-trai.py -- assets/avatar/be-trai-11.glb
npm run bot -- thu-nhan-vat --nen phong          # xem ảnh tư thế + cận mặt trong ket-qua/nhan-vat-*/
```

## Lưu ý khi sửa
- MPFB xuất mọi vật liệu ở chế độ BLEND. Sân khấu ép lưới đặc vẽ đặc, còn mắt, tóc, lông mày, lông mi thì cắt theo alpha (`suaVatLieu` trong `src/san-khau/nhan-vat.js`). Nếu không, sẽ thấy xuyên mặt vào trong đầu và da lộ qua quần.
- three.js bỏ dấu `.` trong tên xương (`upperarm01.L` thành `upperarm01L`).
- Thân có shape key (biểu cảm) nên không áp được modifier MASK. Script xoá đỉnh bị che bằng bmesh (`xoa_dinh_theo_mask`).
