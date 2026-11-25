# bot-front-cam

Bé trai 3D 11 tuổi đứng trước "camera" của siroby-app để **manual test**. Bot đọc hướng dẫn trên màn hình, làm động tác theo kịch bản YAML, và ghi lại mỗi case một video bằng chứng.

- Viết kịch bản: **[docs/KICH-BAN.md](docs/KICH-BAN.md)**
- Kế hoạch và kết quả từng giai đoạn: [docs/KE-HOACH.md](docs/KE-HOACH.md)
- Dựng lại nhân vật: [cong-cu/dung-avatar.md](cong-cu/dung-avatar.md)

## Cài (một lần)

Cần: **Node.js 22+**, **Google Chrome**, git. Nhân vật đã dựng sẵn trong `assets/`, nên không cần Blender.

### macOS
```bash
git clone <repo> bot-front-cam && cd bot-front-cam
npm ci
npx playwright install ffmpeg        # để quay + nén video bằng chứng
```

### Windows (PowerShell)
```powershell
git clone <repo> bot-front-cam; cd bot-front-cam
npm ci
npx playwright install ffmpeg
# nếu bản dựng siroby-app không nằm ở %USERPROFILE%\products\siroby-app\dist\app:
$env:SIROBY_APP_DIST = "D:\đường\dẫn\Siroby-App\dist\app"     # hoặc dùng --phuc-vu <thư mục> mỗi lần chạy
```

Lần đầu Chrome xin quyền camera cho trang sân khấu (để lấy nền và ánh sáng phòng thật): cho phép. Máy không có webcam thì dùng `--nen phong`.

## Chạy

```bash
npm run bot -- kiem kich-ban/mau                    # kiểm cú pháp
npm run bot -- run  kich-ban/mau --nen phong        # chạy 4 case mẫu HT003 (~13 phút)
npm run bot -- dong-tac                             # động tác + kiểu sai có sẵn
npm run bot -- thu-nhan-vat --nen phong             # xem bé trai: ảnh tư thế + cận mặt
```

- App phải chạy ở URL trong kịch bản (mặc định `http://localhost:8790/vui/index.html?tro=ht003-khoi-dong-khop`). Nếu cổng đó chưa có ai phục vụ, bot **tự phục vụ** bản dựng `dist/app` của siroby-app (`SIROBY_APP_DIST` / `--phuc-vu`).
- `--nen chup` (mặc định) chụp nền phòng thật: **ra khỏi khung webcam** lúc đếm ngược. Bot tự phát hiện còn người thì chụp lại.
- Kết quả: `ket-qua/<thời điểm>/tong-hop.json`, `<case>.webm`, `nhat-ky/<case>.txt`.

## Cấu trúc

```
src/
  cli.ts                 lệnh: run · kiem · dong-tac · thu-nhan-vat · kha-thi (dò lỗi)
  chay/                  kịch bản: schema, đọc YAML (lỗi kèm dòng), mắt phía Node, thực thi case
  trinh-duyet/           mở Chrome (Playwright), thay camera của app, tự phục vụ dist/app
  mat/mat.init.js        mắt trong trang app: chữ DOM + chữ vẽ lên canvas
  san-khau/              trang sân khấu: three.js, nền và ánh sáng webcam, chặn người thật trong nền, hậu kỳ giống webcam, phát WebRTC
  dong-tac/              mẫu MAU3D trích từ app, retarget lên bé trai, thư viện động tác, kiểu sai, hiệu chỉnh
  bao-cao/nen-video.ts   nén video bằng chứng (ffmpeg của Playwright)
assets/                  bé trai (GLB), mô hình tìm người (MediaPipe)
cong-cu/                 dựng nhân vật (Blender + MPFB2), trích mẫu từ app, công cụ dò lỗi (soi/)
kich-ban/mau/            kịch bản mẫu HT003
kich-ban/siroby/         kịch bản Claude bên siroby-app viết theo từng task (<ngày>-<mã SIA>/); skill gọi bot nằm ở siroby-app .claude/skills/bot-front-cam
```

## Giới hạn hiện tại

- Chỉ HT003 (8 động tác). Bài khác thì trích thêm mẫu (`cong-cu/lay-mau3d.ts --dong-tac …`), có thể cần hiệu chỉnh.
- XOAY CỔ chưa được app đếm với bé trai 3D. Chi tiết ở [docs/KICH-BAN.md](docs/KICH-BAN.md) mục "Đã biết".
- Đã chạy thật trên macOS (Apple Silicon). Windows: mã đã rà để chạy được nhưng **chưa chạy thử trên máy Windows thật**.
