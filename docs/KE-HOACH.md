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

## 10. Việc tiếp theo

Làm **GĐ 1**: dựng bé trai 11 tuổi (MPFB2 → GLB), nền và ánh sáng từ webcam thật, làm hình giống webcam.
