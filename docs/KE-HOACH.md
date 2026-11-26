# Kế hoạch bot-front-cam

> Lập 21/11/2026. Bài chuẩn MVP: **HT003 Khởi động khớp**, `http://localhost:8790/vui/index.html?tro=ht003-khoi-dong-khop`.
> Mã nguồn app được test: `/Users/thainguyendev/products/siroby-app`.

## 1. Mục tiêu và phạm vi

**Bot-front-cam là một bé trai 3D giống người thật đứng trước "camera" của siroby-app.** Bot đọc hướng dẫn trên màn hình và làm động tác theo kịch bản, phục vụ manual test.

Quy trình:
1. Claude bên siroby-app đọc test case rồi viết kịch bản YAML.
2. Lệnh `bot run` chạy kịch bản.
3. Mỗi case ra đúng 1 bằng chứng (video tab app), kèm 1 dòng tóm tắt.
4. Claude bên siroby-app tự kết luận pass/fail.

**Trong phạm vi:** web/desktop trên macOS và Windows, trình duyệt Chrome, các động tác của HT003.

**Ngoài phạm vi:**
- Bot không đọc test case và không kết luận pass/fail.
- Không làm giọng nói hay hội thoại.
- Không tạo động tác tự do bằng AI.
- Không chạy trên điện thoại hoặc APK.
- Không dùng chế độ `?test=1` hay hook nội bộ của game. Bot chỉ dùng app thật và chỉ đọc những gì hiện trên màn hình.

## 2. Nhân vật

| Thuộc tính | Giá trị |
|---|---|
| Ai | Bé trai 11 tuổi, cao **1,40 m**, cân đối (khoảng 33 kg) |
| Tính cách | Vui tươi: mặt cười, mắt chớp, đầu hơi nhún theo nhịp, thỉnh thoảng có cử chỉ nhỏ khi chờ |
| Trang phục | Áo thun thể thao màu sáng, quần short, giày thể thao. Không logo, không thương hiệu |
| Nguồn | **MPFB2** (MakeHuman cho Blender, đầu ra CC0): chỉnh tuổi 11, cao 1,40 m, cân đối. Dùng xương `game_engine`, xuất GLB |
| Mặt | Shape key biểu cảm (cười, chớp mắt) trong MPFB, điều khiển từ three.js |
| Tệp | `assets/avatar/be-trai-11.blend` (gốc) và `assets/avatar/be-trai-11.glb` (khoảng 10–20 MB) |

Avatar là nhân vật 3D, không dùng ảnh trẻ thật, nên hợp luật nội dung số 5 của siroby-app.

## 3. Kiến trúc

```
┌──────────────── Chrome do Playwright điều khiển (Mac/Win) ────────────────┐
│ SÂN KHẤU  http://localhost:8790/__bot/san-khau.html                       │
│  (route giả cùng origin với app; Playwright tự phục vụ tệp)               │
│  ├ webcam THẬT → nền phòng + ánh sáng                                     │
│  ├ three.js: bé trai 3D + bóng đổ + nhiễu camera                          │
│  └ canvas.captureStream(30) ──WebRTC nội bộ (báo hiệu qua BroadcastChannel)┐│
│                                                                          ││
│ APP  http://localhost:8790/vui/index.html?tro=...                        ││
│  ├ init script: navigator.mediaDevices.getUserMedia / enumerateDevices ◄─┘│
│  │  → trả luồng của sân khấu (app không biết là bot)                     │
│  ├ init script MẮT: ghi chữ DOM + chữ vẽ lên canvas (fillText/strokeText)│
│  └ recordVideo → bằng chứng                                              │
└──────────────────────────────────▲───────────────────────────────────────┘
                                   │ điều khiển, sự kiện chữ, lệnh động tác
                        Node: bot run kich-ban.yaml
```

Các quyết định:
- **Sân khấu và app cùng origin.** Playwright chặn `/__bot/*` và trả tệp của bot, nhờ vậy dùng được `BroadcastChannel` để báo hiệu WebRTC mà không cần máy chủ riêng. Nếu WebRTC gây trễ hoặc lỗi thì có phương án dự phòng: lấy thẳng `MediaStream` của cửa sổ sân khấu qua `window.opener`.
- **Chỉ trang app bị thay camera.** Trang sân khấu vẫn xin webcam thật để lấy ánh sáng.
- **Camera ảo cấp hệ điều hành (OBS) không làm trong MVP.** Chỉ làm khi cần thử trên trình duyệt thường.

## 4. Các phần chính

### 4.1 Sân khấu (`src/san-khau/`, chạy trong trình duyệt)
| Tệp | Việc |
|---|---|
| `canh.ts` | Renderer three.js, camera ảo 16:9 (1280×720, FOV khoảng 60° như webcam laptop), vòng lặp 30 fps theo đồng hồ chung |
| `nhan-vat.ts` | Nạp GLB, quản lý xương, shape key mặt, trạng thái chờ (thở, nhún, chớp mắt) |
| `anh-sang.ts` | Đọc webcam thật mỗi 0,5 giây: độ sáng trung bình (để chỉnh exposure), màu nửa trên và nửa dưới (HemisphereLight), hướng sáng chính (vùng sáng nhất → DirectionalLight). Khung hình làm env map qua `PMREMGenerator`. Có bóng tiếp xúc dưới chân |
| `nen.ts` | Nền là webcam thật, gồm 2 chế độ: **`chup`** (mặc định) chụp 1 khung nền khi phòng trống sau 5 giây đếm ngược, ánh sáng vẫn cập nhật trực tiếp; **`truc-tiep`** dùng khi camera quay vào chỗ không có người. Chọn `chup` làm mặc định để người test ngồi trong khung không bị app nhận nhầm thành người thứ hai |
| `khung-hinh.ts` | Tự đặt khoảng cách: trọn người từ đầu tới bàn chân, cao khoảng 55% khung, cách mép ≥ 2%. Tay giơ cao vẫn nằm trong khung (luật H1–H3) |
| `camera-that.ts` | Làm hình giống webcam: nhiễu hạt, nhòe nhẹ khi chuyển động nhanh, cân bằng trắng theo phòng, nén JPEG nhẹ |
| `phat.ts` | `captureStream(30)`, kết nối WebRTC với tab app |

### 4.2 Động tác (`src/dong-tac/`)
- **Chuẩn là `MAU3D` của siroby-app** (`vui/2a-dong-tac-5.js` và các tệp khác): keyframe vị trí khớp và nhịp `HT_DT` (`vui/2b-he-thong.js`).
- Công cụ `cong-cu/lay-mau3d.mjs` đọc `MAU3D`/`HT_DT` từ bản dựng của app và xuất ra `dong-tac/mau/*.json`. Khi app đổi mẫu thì chạy lại công cụ này.
- Retarget: vị trí cổ tay, cổ chân và đầu được giải bằng IK hai đoạn cho tay và chân; thân và cổ được xoay theo góc vai và hông, có giới hạn khớp của trẻ em.
- Mỗi động tác nhận tham số:
  - `so_lan`, hoặc làm mãi tới khi có điều kiện `den_khi`
  - `ben`: trái, phải hoặc cả hai
  - `toc_do` (mặc định 1,0)
  - `bien_do` (mặc định 1,0; dùng 0,75 để thử "làm nhỏ vẫn được đếm")
  - `kieu_sai`: danh sách kiểu sai có sẵn của từng động tác
  - `giu_giay` cho động tác giữ tư thế
- **Cho tự nhiên hơn:** tốc độ dao động ±8% theo hạt cố định, cơ thể hơi lắc, đầu nhìn về màn hình, mặt cười. Cùng hạt thì chạy ra kết quả giống hệt nhau.

Động tác cho HT003:

| id | Tên | Kiểu sai cho MVP |
|---|---|---|
| `xoayCo` | Xoay cổ | `nghieng_ca_vai` (app nên báo XC-VAI) |
| `xoayVai` | Xoay vai | — |
| `xoayLung` | Xoay lưng trên | `xoay_ca_hong` |
| `nghiengLuon` | Nghiêng lườn | — |
| `xoayHong` | Xoay vòng khớp hông | — |
| `nhonGot` | Nhón gót | — |
| `xoayTay` | Xoay vòng tay | `vong_nho` (app không nên đếm) |
| `ngoiXomSau` | Giữ ngồi xổm sâu | — |
| `dungYen`, `vaoKhung`, `raKhung`, `vayTay` | Động tác chung | — |

### 4.3 Mắt (`src/mat/`, init script chạy trong tab app)
- Bắt `CanvasRenderingContext2D.prototype.fillText/strokeText` và `MutationObserver` trên DOM để giữ tập "chữ đang thấy" kèm thời điểm. Chữ trên canvas được coi là còn thấy nếu được vẽ lại trong vòng 300 ms gần nhất.
- Chữ được chuẩn hoá trước khi so: chữ thường, bỏ khoảng trắng thừa. Có tuỳ chọn so không dấu.
- Gửi sự kiện về Node qua `exposeBinding`, kiểm tra 10 lần mỗi giây. **Độ trễ phản ứng mục tiêu dưới 200 ms.**
- Dự phòng: nếu chữ không đi qua `fillText` (ví dụ nằm trong ảnh) thì chụp màn hình và dùng OCR. Chỉ làm phần này khi gặp thật.

### 4.4 Chạy kịch bản (`src/chay/`)
- Đọc YAML, kiểm tra theo schema (zod), báo lỗi kèm số dòng.
- Hai cách tính thời gian, dùng chung được trong một kịch bản:
  - **Theo sự kiện:** `cho_chu`, `den_khi`. Đây là cách mặc định, khớp với luật O1 (làm đủ mới đổi động tác).
  - **Theo timeline:** `luc: 12.5` (giây, tính từ mốc `goc_thoi_gian` gần nhất).
- Lệnh `bam` dùng Playwright để click theo chữ, thay việc người test bấm nút.
- Mỗi case chạy trong một browser context mới (sạch localStorage, có video riêng).

### 4.5 Báo cáo (`src/bao-cao/`)
```
ket-qua/2026-11-21_1430/
  tong-hop.json                 # một dòng cho mỗi case
  HT003-dung-form.webm          # 1 bằng chứng cho case này
  HT003-dung-yen.webm
```
Mỗi dòng trong `tong-hop.json` có dạng:
`{ case, chay: "xong"|"loi"|"het-gio", thoi_gian, bang_chung, ghi_nhan: [{luc, chu}], loi? }`

- Video là tab app, trong đó đã thấy cả bé trai lẫn phản ứng của app, nên không cần thêm ảnh chụp.
- Không lặp lại thông tin giữa video và JSON. JSON chỉ ghi mốc thời gian và chữ đã thấy ở các bước `ghi_nhan`.

### 4.6 CLI và bàn giao
- `npx bot run <kich-ban.yaml|thư-mục> [--hat 7] [--nen chup|truc-tiep] [--hien]`
- `npx bot thu-nhan-vat`: mở sân khấu để xem bé trai trong phòng thật và chỉnh ánh sáng.
- `docs/KICH-BAN.md`: cú pháp, danh sách động tác, kiểu sai và ví dụ. Claude bên siroby-app đọc tệp này để viết kịch bản.

## 5. Kịch bản mẫu

```yaml
case: HT003-dung-form
url: http://localhost:8790/vui/index.html?tro=ht003-khoi-dong-khop
hat: 7
buoc:
  - bam: "Bắt đầu"                       # click theo chữ trên nút
  - cho_chu: "Đứng vào khung"
  - lam: vaoKhung
  - lam: xoayCo, ben: ca_hai, den_khi: { chu: "XOAY VAI" }, toi_da: 60
  - lam: xoayVai, den_khi: { chu: "XOAY LƯNG" }, toi_da: 60
  - lam: xoayLung, ben: ca_hai, den_khi: { chu: "NGHIÊNG LƯỜN" }, toi_da: 60
  - lam: nghiengLuon, den_khi: { chu: "XOAY VÒNG KHỚP HÔNG" }, toi_da: 60
  - lam: xoayHong, ben: ca_hai, den_khi: { chu: "NHÓN GÓT" }, toi_da: 60
  - lam: nhonGot, den_khi: { chu: "Liên khúc" }, toi_da: 60
  # ... vòng 4
  - cho_chu: "GIỮ NGỒI XỔM SÂU"
  - lam: ngoiXomSau, giu_giay: 10
  - ghi_nhan: { cho_chu: "sao", toi_da: 20 }   # ghi lại màn kết quả
```

Cách viết theo timeline:
```yaml
  - goc_thoi_gian: { chu: "XOAY CỔ" }
  - luc: 0.0,  lam: xoayCo, so_lan: 5, ben: ca_hai
  - luc: 18.0, lam: dungYen, giay: 5
```

## 6. Cấu trúc thư mục

```
bot-front-cam/
  package.json  tsconfig.json  vite.config.ts
  src/
    cli.ts
    chay/        doc-kich-ban.ts  schema.ts  thuc-thi.ts  thoi-gian.ts
    trinh-duyet/ mo-chrome.ts  thay-camera.init.ts  dich-vu-bot.ts (route /__bot/*)
    mat/         mat.init.ts  doi-chu.ts
    san-khau/    index.html  canh.ts  nhan-vat.ts  anh-sang.ts  nen.ts  khung-hinh.ts  camera-that.ts  phat.ts
    dong-tac/    ik.ts  retarget.ts  thu-vien.ts  kieu-sai.ts  tu-nhien.ts  mau/*.json
    bao-cao/     tong-hop.ts
  assets/avatar/ be-trai-11.blend  be-trai-11.glb
  cong-cu/       lay-mau3d.mjs  dung-avatar.md (các bước MPFB2 → GLB)
  kich-ban/mau/  ht003-dung-form.yaml  ht003-dung-yen.yaml  ht003-xoay-co-sai.yaml
  docs/          KE-HOACH.md  KICH-BAN.md
  ket-qua/       (không đưa vào git)
```

Công nghệ: Node 22 + TypeScript, Playwright (Chrome channel), three.js, Vite (dựng sân khấu), `yaml`, `zod`, Blender 4.x + MPFB2 (chỉ khi dựng avatar).

## 7. Giai đoạn

Thời gian bên dưới là ước lượng, chưa kiểm chứng.

| GĐ | Việc | Xong khi | Ước lượng |
|---|---|---|---|
| **0. Khả thi** | Khung dự án. Thay camera trong tab app. Sân khấu dùng tạm một nhân vật người có sẵn (CC0) đứng yên và vẫy tay, ánh sáng đơn giản | Mở HT003: app nhận ra người và qua màn "Đứng vào khung hình". **Chưa qua thì dừng lại bàn tiếp.** | 1–2 ngày |
| **1. Bé trai + sân khấu** | Dựng bé trai 11 tuổi bằng MPFB2. Nền và ánh sáng từ webcam thật, tự đặt khoảng cách, làm hình giống webcam, mặt vui tươi | `bot thu-nhan-vat`: ảnh chụp bé trai trong phòng thật được bạn duyệt | 3–4 ngày |
| **2. Động tác HT003** | Công cụ `lay-mau3d`, retarget và IK, 8 động tác, 4 động tác chung, kiểu sai, độ tự nhiên | Làm đúng thì app đếm ≥ 80% mỗi động tác. Đứng yên thì 0 lần. `xoayTay` với kiểu sai `vong_nho` thì 0 lần | 4–6 ngày |
| **3. Mắt + chạy** | Bắt chữ, `cho_chu`, `den_khi`, `luc`, `bam`, mỗi case một context riêng | Chạy trọn HT003 từ đầu đến màn kết quả, không cần người can thiệp | 2–3 ngày |
| **4. Báo cáo + bàn giao** | `tong-hop.json`, video, CLI, `docs/KICH-BAN.md`, 3 kịch bản mẫu, chạy thử trên Windows | Claude bên siroby-app tự viết và chạy được kịch bản HT003 | 1–2 ngày |

### Nghiệm thu MVP
1. `ht003-dung-form`: hoàn thành cả 4 vòng và tới màn kết quả.
2. `ht003-dung-yen`: đứng yên 30 giây, app không đếm lần nào.
3. `ht003-xoay-co-sai`: app hiện nhắc nhở hoặc Siroby chỉ lại.
4. Chạy lại cùng hạt cho ra cùng chuỗi động tác.
5. Chạy được trên cả macOS và Windows.

## 8. Rủi ro

| Rủi ro | Cách xử lý |
|---|---|
| Bộ nhận dáng của app (Siroby AI Motion) không nhận ra avatar 3D | Kiểm ngay ở GĐ 0. Nếu yếu thì tăng độ thật: da và quần áo có texture, ánh sáng, nhiễu camera |
| Nhón gót là động tác nhỏ, khó nhận | Chỉnh khoảng cách và biên độ ở GĐ 2. Thử thêm `bien_do` 1,1 |
| Vẽ 3D làm chậm app khi chạy cùng máy | Sân khấu chạy ở 1280×720, tắt bóng đổ động nếu cần. Đo FPS của app trong báo cáo |
| Chữ trên màn hình không đi qua `fillText` | Dùng OCR từ ảnh chụp (mục 4.3) |
| Người test ngồi trong khung webcam thật | Nền mặc định `chup` (chụp sẵn khi phòng trống) |

## 9. Kết quả GĐ 0 (21/11/2026): ĐẠT

Lệnh chạy lại:
```
npm run bot -- kha-thi --buoc "bam:Tôi là bố/mẹ|bam:CHƠI NGAY|cho:SIROBY LÀM MẪU|nghi:4|lam:vongNho" --giay 35 --video
```

Kết quả:
- **Camera giả:** app nhận luồng 640×480, khoảng 30 khung/giây, qua `getUserMedia` đã bị thay. App không báo lỗi gì.
- **Nhận dáng:** nhân vật tạm (Soldier của three.js, co về 1,40 m, đứng cách camera 2,29 m) được app nhận như người thật. Khung xương bám đúng. App đi hết chuỗi "ĐỨNG VÀO KHUNG HÌNH" → "Đứng yên một chút…" → 3‑2‑1 → vào bài.
- **Đứng yên:** app nhắc "DANG TAY RỘNG RA" và "SIROBY CHỈ LẠI", đúng phản ứng mong đợi.
- **Đếm:** động tác xoay vai thô (dang tay, cổ tay vẽ vòng nhỏ khoảng 1,05 giây/vòng) được app **đếm**: "+10", COMBO x3, "XOAY VAI 2/5 · 2/2 chuẩn". App xong phần làm quen rồi tự chuyển sang Vòng 1 · XOAY CỔ. **Chưa ổn định:** chạy lại 4 lần thì chỉ 2 lần được đếm (lan3, lan6), 2 lần còn lại 0 lần (lan4, lan5). Nguyên nhân là động tác hiện chỉ dựng tay cho GĐ 0, chưa theo mẫu `MAU3D`. Đây là việc chính của GĐ 2.
- **Máy chủ app:** nếu `localhost:8790` chưa chạy, bot tự phục vụ `~/products/siroby-app/dist/app` (đổi bằng `--phuc-vu` hoặc biến `SIROBY_APP_DIST`).
- **Mắt:** đọc được cả chữ trong DOM lẫn chữ vẽ trên canvas, độ trễ khoảng 250 ms (theo nhịp kiểm tra hiện tại).

Ghi chú cho các GĐ sau:
- Mỗi vòng có đồng hồ **1:00** ("VÒNG 1/4 · 1:00"), nên kịch bản cần `toi_da` hợp lý.
- Mắt bắt cả số góc khớp (ví dụ `"165°"`) app vẽ lên khung xương. GĐ 3 cần lọc loại chữ này.
- Context đang quay video cả trang sân khấu. GĐ 4 chỉ giữ video tab app.
- Nhân vật tạm có mặt nạ và giáp mà vẫn được nhận, nên bé trai 11 tuổi (người thật hơn) gần như chắc chắn được nhận.

## 10. Kết quả GĐ 1 (21/11/2026): ĐẠT, chờ bạn duyệt ảnh

Nhân vật:
- **Bé trai 11 tuổi**, cao 1,40 m, người châu Á, áo thun xanh và quần jean (đã xoá logo), giày sneaker. Mặt cười mỉm và chớp mắt 3–5 giây một lần.
- Tệp `assets/avatar/be-trai-11.glb` (16 MB, khoảng 19 nghìn đỉnh). Cách dựng lại: `cong-cu/dung-avatar.md`.

Sân khấu (`src/san-khau/`):
- **Nền** (`nen.js`): mặc định `chup`, tức đếm ngược rồi chụp một khung nền phòng. **Có lớp chặn người thật**: MediaPipe EfficientDet‑Lite0 tìm người trong ảnh nền. Nếu còn người thì nhắc và chụp lại; sau 30 lần vẫn còn người thì dừng và báo lỗi. Ở chế độ `truc-tiep` thì kiểm tra mỗi 3 giây và báo qua `nenCoNguoi`.
- **Ánh sáng** (`anh-sang.js`): lấy từ webcam thật gồm độ sáng chung, màu nửa trên và nửa dưới, hướng sáng ngang. Bản đồ môi trường dựng từ ảnh phòng. Tone mapping AgX.
- **Giống webcam** (`camera-that.js`): nhoè nhẹ, nhiễu hạt (vùng tối nhiều hơn), tối góc, giảm bão hoà.
- **Khung hình** (`khung-hinh.js`): đứng cách camera 2,22 m, trọn người kể cả khi giơ tay, người cao khoảng 68% khung.

Kiểm chứng trên HT003 thật:
- Ghép với webcam phòng thật: app nhận bé trai và đếm **XOAY VAI 5/5 "⭐ 5/5 chuẩn"** (lan7).
- Chạy lặp 3 lần (nền phòng dựng sẵn, cùng hạt): **3/3 lần đếm đủ 5/5 và "XONG!"**. Nhân vật tạm ở GĐ 0 chỉ đạt 2/4.
- Tốc độ: sân khấu vẽ 31 khung/giây (0,5–0,7 ms mỗi khung), bộ mã hoá gửi 30–31, tab app **giải mã 29–31 khung/giây, 0 khung rớt** (thống kê WebRTC).
- Lớp chặn người: bắt được người thật trong ảnh nền (điểm 0,87–0,93) và không nhầm ảnh phòng trống.

Lệnh mới: `npm run bot -- thu-nhan-vat [--nen phong|chup|truc-tiep] [--cuoi 0..1]` để chụp từng tư thế và chụp cận mặt.

Còn hạn chế (để GĐ sau):
- Mô hình xoá logo áo chỉ đúng với `male_casualsuit04`.
- Lông mi không đi theo mí khi chớp mắt (chỉ 150 ms, khó thấy).
- Ánh sáng chỉ ước lượng thô từ ảnh 2D. Nếu webcam không thấy sàn thì bé trai trông như đứng trước đồ đạc, nhưng việc này không ảnh hưởng nhận dáng.
- `kha-thi` chưa truyền `--hat` xuống sân khấu (GĐ 3 làm cùng phần chạy kịch bản).

## 11. Kết quả GĐ 2 (21/11/2026): 7/8 động tác đạt, xoay cổ cần kiểm chứng bằng người thật

Cách làm (`src/dong-tac/`):
- `cong-cu/lay-mau3d.ts` trích từ bản dựng app: khung hình chính `MAU3D` (đã ghép dáng đứng) và nhịp `HT_DT` của 8 động tác → `mau/ht003.json`. Chạy lại khi app đổi mẫu.
- `mau.js` tái dựng phần toán của app (`mNoi`, `mauDang`, `mauKhop`). `ap-dang.js` đưa dáng lên bé trai: hông, thân, đầu xoay theo góc mẫu; tay chân theo hướng khớp; chân chạm sàn; ngón chân phẳng khi kiễng; tay duỗi thẳng khi mẫu muốn thẳng.
- `thu-vien.js`: số lần hoặc làm đến khi dừng, tốc độ (±8% theo hạt), biên độ, lật bên (`ben: nguoc`), giữ (`giu_giay`), **đứng chuẩn bị 1,5 giây trước mỗi động tác** như người thật.
- `kieu-sai.js`: kiểu sai `xoayCo/nghieng_ca_vai`, `xoayLung/xoay_ca_hong`, `xoayTay/vong_nho`, và **hiệu chỉnh theo cơ thể bé trai** (mỗi mục ghi lý do và số đo).
- `kha-thi --tu-dong`: mắt đọc tên động tác app đang yêu cầu rồi đổi động tác (bản đầu của GĐ 3). `--sai dt=kiểu` ép làm sai.

Kết quả trên HT003 thật (chạy trọn buổi, theo bảng "động tác đủ" cuối mỗi vòng của app):

| Động tác | Kết quả | Ghi chú |
|---|---|---|
| xoayVai | đạt (5/5, 7/7, 4/4) | "chuẩn" |
| nhonGot | đạt (5/5, 7/7, 6/6) | cần đứng chuẩn bị: app chỉnh mốc đứng khi đứng yên ≥ 0,3 giây |
| xoayLung | đạt (7–8/8) | |
| nghiengLuon | đạt (6/6 hai bên) | thỉnh thoảng "NGỰC NHÌN THẲNG" |
| xoayHong | đạt | "chuẩn" |
| xoayTay | được đếm, vòng 4 đủ | thường bị nhắc "DUỖI THẲNG TAY" (xem dưới) |
| ngoiXomSau | đạt (giữ 10 giây, 1/1) | |
| **xoayCo** | **0 lần** | xem dưới |

Hai lần chạy cuối (ht5, ht6): vòng 2, 3, 4 đều "đủ động tác". Vòng 1 (xoay cổ) đạt 0.

Phía ngược lại:
- **Đứng yên 40 giây**: 0 lần, app nhắc "NHÌN SIROBY LÀM NHÉ" và mở "SIROBY CHỈ LẠI". Đúng.
- **xoayTay vòng nhỏ** (`vong_nho`): 0/3, app nhắc "ĐỔI ĐỘNG TÁC NHÉ". Đúng như ca kiểm của app.
- **xoayLung xoay cả hông** (`xoay_ca_hong`): 3/8 (làm đúng thì 7–8/8), nhưng app **không** nhắc "HÔNG ĐỨNG YÊN" và vẫn tính "chuẩn". Cần xác nhận: ngưỡng của app, hoặc kiểu sai của bot chưa đủ mạnh.

**Điểm cần kiểm chứng bằng người thật:**
1. **Xoay cổ**: bé trai nghiêng đầu tới 65° trong 3D (đo trên sân khấu), nhưng app chỉ thấy hai tai lệch khoảng 0,10–0,12 bề ngang vai, trong khi ngưỡng mức Vừa là 0,15. Đã thử tăng sáng ×2,2, ẩn tóc, đứng gần 1,7 m: không đổi. Theo hình học, tai rộng khoảng 0,35 lần vai thì nghiêng 28° đã đủ 0,16. Vậy bộ nhận dáng bắt góc đầu của nhân vật 3D thấp hơn thực tế. Chưa biết với người thật có vậy không. **Cần một người thật thử xoay cổ trên HT003 mức Vừa.**
2. **"DUỖI THẲNG TAY" khi xoay vòng tay**: trong 3D tay thẳng. Ở nửa trước vòng, tay chĩa vào camera nên trên ảnh trông ngắn lại (độ thẳng 2D 0,77–0,83 < 0,86). Thử chếch tay ra ngoài thì mất vòng (0/3), nên đã bỏ. Người thật có thể cũng gặp.

Công cụ dò lỗi (không dùng khi chạy thật): `cong-cu/soi/khop-app.ts` (điểm khớp app nhận được), `goc-dau.ts`, `ti-le.ts`, `cong-cu/tom-tat-buoi.py` (tóm tắt nhật ký), `kha-thi --soi-app "<biểu thức>"`.

## 12. Kết quả GĐ 3 (21/11/2026): ĐẠT

Lệnh:
```
npm run bot -- kiem kich-ban/mau                       # chỉ kiểm cú pháp, lỗi kèm tệp:dòng
npm run bot -- run kich-ban/mau [--case a,b] [--nen chup|truc-tiep|phong] [--hat 7] [--khong-video] [--chi-tiet]
```

Thành phần (`src/chay/`):
- `schema.ts`: 8 lệnh `bam` · `cho_chu` · `lam` · `dung_yen` · `nghi` · `goc_thoi_gian` · `ghi_nhan` · `tu_dong`. Bước nào cũng có thể kèm `luc` (timeline). Kiểm chặt: sai khoá, sai kiểu, sai tên động tác hoặc kiểu sai đều báo kèm dòng.
- `mat.ts`: đọc chữ 10 lần mỗi giây, **lọc số góc khớp và số điểm**, so khớp không phân biệt hoa thường (tuỳ chọn bỏ dấu), giữ lịch sử để `ghi_nhan … nhin_lai: N` bắt được cả chữ chỉ thoáng hiện.
- `thuc-thi.ts`: **mỗi case một context Chrome mới**. Nhật ký riêng, video tab app riêng (video trang sân khấu bị xoá). Trạng thái `xong` / `het-gio` / `loi` kèm bước và dòng hỏng. Bot không phán pass/fail nghiệp vụ.
- Kết quả: `ket-qua/<lần chạy>/tong-hop.json` (mỗi case một mục) và `<case>/{nhat-ky.txt, <case>.webm}`.

Đã chạy 4 kịch bản mẫu (`kich-ban/mau/`) trên HT003 thật:

| Case | Chạy | Thời gian | Ghi nhận |
|---|---|---|---|
| ht003-dung-form | xong | 321 s | vòng 1 "0/1 động tác đủ" (xoay cổ), vòng 2 "4/4", vòng 3 "5/5", tới màn kết quả |
| ht003-dung-yen | xong | 49 s | có "SIROBY CHỈ LẠI"; không bị đếm "1/5" |
| ht003-timeline | xong | 97 s | đúng mốc: động tác ở mốc +0 và mốc +30 s |
| ht003-tu-dong-sai | xong | 328 s | app **không** nhắc "HÔNG ĐỨNG YÊN" (giống GĐ 2) |
| (thử lỗi) cho_chu không có thật | het-gio | 6 s | báo đúng bước 3, dòng 5 |

- Độ trễ phản ứng: lúc thấy chữ và lúc bé trai đổi động tác trùng nhau trong nhật ký (cùng nhịp đọc 100 ms).
- Video khoảng 44 MB cho 5 phút (webm của Playwright). GĐ 4 sẽ xem có cần nén không.

## 13. Kết quả GĐ 4 (21/11/2026): ĐẠT trên macOS · Windows chưa chạy thử

Báo cáo gọn, **1 bằng chứng mỗi case**:
```
ket-qua/<lần chạy>/
  tong-hop.json        lần chạy · máy · tổng kết · mỗi case: chay (xong / het-gio / loi), loi (bước, dòng), ghiNhan, daLam, videoTu, bangChung
  <case>.webm          video tab app, nén VP8 15 khung/giây (ffmpeg của Playwright): ~2,7 MB/phút, chữ vẫn đọc rõ
  nhat-ky/<case>.txt   nhật ký dò lỗi
```
- Video cả buổi HT003: **16 MB** (trước 44 MB). Hạ độ phân giải quay xuống 1024×560 gần như không giảm dung lượng (Playwright mã hoá bitrate cố định); nén lại mới giảm.
- `videoTu`: thời điểm trong video = `luc` − `videoTu`.
- Lần chạy cuối, 4 case mẫu: **4/4 chạy hết**. Kết quả như GĐ 3.

Bàn giao:
- `docs/KICH-BAN.md` cho Claude bên siroby-app: cách gọi, cú pháp đủ 8 lệnh, động tác và kiểu sai, cách app HT003 hiện chữ (bộ đếm, "XONG!" và "ĐỔI ĐỘNG TÁC NHÉ!", mức độ), các điều đã biết, định dạng kết quả.
- **Kiểm chứng tài liệu**: một agent mới **chỉ đọc `docs/KICH-BAN.md`** đã viết 2 case từ 2 test case lạ (nhón gót 75 %, xoay vòng tay sai). `kiem` đạt ngay lần đầu. Agent nêu 10 chỗ phải đoán; đã bổ sung vào tài liệu (chọn mức, bộ đếm "5/5" dễ nhầm, nghĩa "XONG!" và "ĐỔI ĐỘNG TÁC NHÉ!", `toi_da` với `nhin_lai`, hết giờ của `tu_dong`, chip tên ở màn giới thiệu, nơi tra câu nhắc trong mã app, ví dụ đầy đủ).
- `README.md`: cài đặt macOS và Windows. Lệnh mới `bot dong-tac`.

Windows:
- Đã rà mã: không còn đường dẫn hay lệnh riêng macOS. Bộ tìm ffmpeg biết cả `ffmpeg-win64.exe` ở `%LOCALAPPDATA%\ms-playwright`. Kiểm cổng app thử cả IPv4 và IPv6 (Windows hay phân giải `localhost` → `::1`). Bản dựng app chỉ bằng `SIROBY_APP_DIST`.
- **Chưa chạy thử trên máy Windows thật** (không có máy). Cần một lần: `npm ci` → `npx playwright install ffmpeg` → `npm run bot -- run kich-ban/mau/ht003-dung-yen.yaml --nen phong`.

## 14. Còn mở sau MVP

1. ~~**Xoay cổ**~~: đã rõ ngày 26/11 – lỗi ở bot (lật trái – phải so với app), đã sửa, app đếm đủ (mục 15).
2. **Xoay cả hông** không làm app nhắc "HÔNG ĐỨNG YÊN": cần xác nhận.
3. **Chạy thử trên Windows.**
4. ~~Bài khác ngoài HT003~~: đã mở rộng 26/11 (mục 15). Còn lại: bài sàn / camera nghiêng.

## 15. Mở rộng mẫu (26/11/2026): 194 động tác · độ phủ 7/340 → 190/340 (56 %)

- `cong-cu/lay-mau3d.ts` trích MỌI động tác `HT_DT` ngay trong trang, ghi `src/dong-tac/mau/{tay,chan,goi,hong,toan-than}.json` + `src/dong-tac/chua-ho-tro.json` (149 chưa hỗ trợ, 138 là bài sàn).
- Kiểm chứng 18 động tác ở 9 bài (chạy, nâng gối, squat, lunge, nhảy sao, đấm, giữ dáng, hai bên, đi lùi): làm đúng 18/18 XONG, đứng im 18/18 = 0 – bảng ở `docs/KICH-BAN.md` mục 4.
- Sửa ba lỗi bot lộ ra khi kiểm: (1) app **soi gương** ảnh camera, bot lật trái – phải (jab 0/3 → 3/3; XOAY CỔ HT003 0/10 → 10/10); (2) nhảy bị dập chân xuống sàn (thêm pha bay); (3) `tu_dong` khớp nhầm tên bài ở cổng vào.
- Trần độ phủ khi chưa làm bài sàn là 202/340 (59 %); 70–80 % cần làm bài sàn / camera nghiêng.

## 16. Ghế + bài sàn / camera nghiêng (27/11/2026): 332 động tác · độ phủ 190/340 → 328/340 (96 %)

- Việc 0: 4 động tác ngồi (HT079) bị đếm dư khi chưa có ghế → tạm sang chưa hỗ trợ (186/340); `tu_dong` chọn id theo thẻ bài của trò (tên trùng đứng / ngồi / sàn).
- Việc 1: ghế tự dựng (đẩu · văn phòng · bàn che chân), hông chạm mặt ghế theo dáng mẫu. Xòe ngón, nghiêng cổ chân được đếm; co vòm không bao giờ được đếm (nghi app – cử động trên ảnh quá nhỏ so với ngưỡng); ấn ngón cái chập chờn.
- Việc 2: 138 động tác sàn – vị trí khớp dựng bằng `sanKhop` CỦA APP (mã sinh tự động từ trang) với tỉ lệ bé trai; camera nghiêng đổi được độ cao / khoảng cách / góc; tường, hộp, ghế đỡ. 18 động tác đại diện được đếm khi đủ thời gian (trừ chống đẩy tường – nghi app; tư thế em bé 1/2 – nghi tỉ lệ tay của bot).
- SIA-110: bản chưa sửa 1 / bản đã sửa 0 ở cả hai cách đặt máy, nhưng bot chưa tái hiện được gối xa trôi (ảnh dựng quá ổn định) – cần người thật hoặc phát lại video người.
- Còn mở: tái hiện nhiễu / trôi của webcam thật (tự cân sáng, nén, thở); điểm vai của bé trai (khớp xoay vs mỏm vai) cho bài sàn; kiểu sai giống người (ghi chú phiên đối chiếu 23/11: `phat_tay` cho xoay vòng tay, rung khi nhón gót 75 %); 11 động tác chưa hỗ trợ.
