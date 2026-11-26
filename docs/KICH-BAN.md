# Viết kịch bản cho bot-front-cam

> Dành cho **Claude bên siroby-app**: đọc test case manual → viết kịch bản YAML → chạy bot → đọc `tong-hop.json` + xem video → tự kết luận pass/fail.
> Bot **không** phán pass/fail nghiệp vụ. Bot chỉ ghi lại đã làm gì, đã thấy chữ gì trên màn, và kèm 1 video bằng chứng cho mỗi case.

## 1. Bot là gì

Bot là một bé trai 3D 11 tuổi (cao 1,40 m) đứng trước "camera" của app. App nhận hình bé trai qua `getUserMedia` như webcam thật, nên app không biết đó là bot. Bot:
- **làm động tác** đúng theo mẫu chuẩn `MAU3D` của app (cùng dữ liệu Siroby 3D làm mẫu), có thể làm sai có chủ đích;
- **đọc chữ trên màn** gồm DOM và chữ game vẽ lên canvas, 10 lần mỗi giây;
- **bấm nút** như người test.

Chỉ chạy trên web: Chrome trên macOS / Windows. Bot làm được **332/343 động tác HT_DT** (bản 2.51.2 – mục 4): đứng trước camera, **ngồi ghế** (ghế tự hiện), **bài sàn / camera nghiêng** (máy thấp ngang hông, nằm – quỳ – chống tay – tựa tường). Bài kiểm kỹ nhất: HT003; các nhóm khác kiểm chứng 26 – 27/11 (mục 4).

## 2. Chạy

```bash
cd <thư mục bot-front-cam>
npm run bot -- kiem <kịch-bản.yaml | thư-mục>        # kiểm cú pháp (lỗi kèm tệp:dòng) – LUÔN chạy trước
npm run bot -- run  <kịch-bản.yaml | thư-mục> [tuỳ chọn]
npm run bot -- dong-tac [--tim squat] [--chua-ho-tro] # danh sách động tác + kiểu sai; động tác chưa hỗ trợ + lý do
```

Gọi từ thư mục khác: `npm --prefix <bot-front-cam> run bot -- run <đường dẫn TUYỆT ĐỐI tới kịch bản> --ra <thư mục kết quả TUYỆT ĐỐI>`.

| Tuỳ chọn | Ý nghĩa |
|---|---|
| `--case a,b` | chỉ chạy các case này |
| `--nen chup` | (mặc định) chụp nền phòng thật từ webcam. **Người phải ra khỏi khung camera** lúc đếm ngược; còn người thì bot nhắc, chụp lại, sau 30 lần thì dừng |
| `--nen phong` | phòng dựng sẵn, không cần webcam. Dùng khi có người ngồi trước máy |
| `--nen truc-tiep` | nền là webcam trực tiếp (chỉ khi camera quay chỗ không có người) |
| `--hat 7` | hạt ngẫu nhiên của chuyển động (ghi đè `hat` trong kịch bản) |
| `--khong-video` | không quay video (nhanh hơn, nhưng không có bằng chứng) |
| `--chi-tiet` | in nhật ký từng bước ra terminal |
| `--ra <thư mục>` | nơi ghi kết quả (mặc định `ket-qua/<thời điểm>`) |
| `--phuc-vu <dist/app>` | nếu URL `localhost` chưa chạy, bot tự phục vụ bản dựng này (hoặc đặt biến `SIROBY_APP_DIST`) |

Mã thoát: `0` mọi case chạy hết · `1` có case `het-gio` / `loi` · `2` kịch bản sai cú pháp.

## 3. Định dạng kịch bản

Một tệp có thể chứa **1 case**, hoặc **nhiều case** (`cases: [...]` hoặc mảng ở gốc). Truyền thư mục thì bot chạy mọi tệp `.yaml` / `.yml` theo thứ tự tên.

```yaml
case: ht003-xoay-vai-dung       # tên duy nhất: chữ, số, - _ . (dùng làm tên tệp kết quả)
mo_ta: Xoay vai đúng mẫu ở phần làm quen
url: http://localhost:8790/vui/index.html?tro=ht003-khoi-dong-khop   # mặc định như này
hat: 7                           # tuỳ chọn
nen: phong                       # tuỳ chọn: chup | truc-tiep | phong
ghe: don                         # tuỳ chọn – động tác ngồi: don (ghế đẩu, mặc định) | van_phong | ban | khong
camera: { cao: 0.75, cui: 20 }   # tuỳ chọn – bài camera nghiêng: đổi cách đặt máy (xem dưới)
buoc:
  - bam: "Tôi là bố/mẹ"
  - bam: { css: "#nutChoi" }
  - cho_chu: "XOAY VAI"
  - lam: xoayVai
    den_khi: "NHÓN GÓT"
  - ghi_nhan: { chu: "5/5", toi_da: 2 }
    nhin_lai: 30
    ten: du-5-lan
```

**Bối cảnh tự theo trò trong URL** (thẻ bài, `src/dong-tac/tro.json`): trò có động tác ngồi → ghế; thẻ `cam: 'nghieng'` → camera nghiêng + dáng nghỉ `nghi` của thẻ. Hai khoá của case chỉ để đổi bối cảnh đó:

| Khoá case | Ý nghĩa |
|---|---|
| `ghe` | ghế cho động tác ngồi (`HT_DT.ngoi`, vd. HT079): `don` ghế đẩu không lưng, quay mặt về camera, hai bàn chân trên sàn (cách đặt chuẩn – mặc định) · `van_phong` ghế văn phòng (lưng, tay vịn, trụ + chân sao che một phần chân) · `ban` bàn thấp ngay trước bàn chân (mép bàn che bàn chân) · `khong`. Hai kiểu có vật che chỉ để soi trường hợp người thật |
| `camera` | bài camera nghiêng: `{ cao, cach, cui, lech }` – mặc định **máy thấp ngang hông** `cao 0.6` m, `cach 2.6` m, nhìn ngang (`cui 0`), vuông góc thân (`lech 0`). Mô phỏng người đặt sai: máy trên bàn nhìn chéo xuống `{ cao: 0.75, cach: 1.9, cui: 20, lech: 30 }`. `cui` = độ chúi xuống, `lech` = máy lệch quanh người (nhìn chéo thân) |

Mỗi bước là **một đối tượng có đúng một lệnh**. Tham số đi kèm là các khoá ngang hàng (viết nhiều dòng, hoặc dạng `{ ... }` trên một dòng). Khoá lạ bị báo lỗi, nên gõ sai tên sẽ bị bắt ở `kiem`.

### Chữ chờ (`Chu`)
Dùng cho `cho_chu`, `den_khi`, `ghi_nhan`, `goc_thoi_gian`, `tu_dong.den_khi`:
- `"XOAY VAI"`, hoặc `{ chu: "XOAY VAI", toi_da: 60, khong_dau: false }`
- So khớp **chứa chuỗi**, không phân biệt hoa thường, gộp khoảng trắng. `khong_dau: true` thì bỏ dấu tiếng Việt khi so.
- `toi_da` mặc định **60 giây**. Quá thì case dừng với trạng thái `het-gio` (riêng `ghi_nhan` thì không dừng).
- Chữ **đang hiện sẵn** lúc bước bắt đầu cũng tính (khớp ngay). Muốn "chữ mới xuất hiện sau bước này" thì đặt bước ngay sau hành động gây ra nó, hoặc dùng `nhin_lai` với khoảng đúng bằng quãng cần xét.
- Màn giới thiệu (trước khi bấm CHƠI NGAY) có các chip tên động tác viết thường, như "Nhón gót" hay "Xoay cổ". Vì so khớp không phân biệt hoa thường, **đừng chờ tên động tác trước khi bấm CHƠI NGAY**. Sau khi bấm, màn giới thiệu ẩn đi và không còn khớp.
- Bot **bỏ qua** chữ thuần số: số góc khớp `"165°"`, điểm `"1.240"`, đếm ngược `"3"`. Không chờ những chữ này được. Muốn bắt bộ đếm thì dùng dạng `"1/5"`.

### Các lệnh

| Lệnh | Viết | Chặn tới khi |
|---|---|---|
| `bam` | `bam: "CHƠI NGAY"` hoặc `bam: { css: "#nutChoi" }` · `toi_da` (30) | đã bấm. Theo chữ thì ưu tiên nút (role button), rồi checkbox, rồi chữ bất kỳ. Chữ trùng nhiều chỗ thì **dùng `css`** |
| `cho_chu` | `cho_chu: <Chu>` | thấy chữ |
| `lam` | `lam: <động tác>` + tham số (dưới) | xem dưới |
| `dung_yen` | `dung_yen: 40` (giây) hoặc `dung_yen: true` | 40 giây / không chặn. Bé trai về dáng đứng chờ tự nhiên (thở, nhìn quanh) |
| `nghi` | `nghi: 5` | 5 giây. Bé trai **vẫn làm** việc đang làm |
| `goc_thoi_gian` | `goc_thoi_gian: bay_gio` hoặc `<Chu>` | (chờ chữ rồi) đặt mốc timeline |
| `ghi_nhan` | `ghi_nhan: <Chu>` · `ten` · `nhin_lai: N` | thấy chữ hoặc hết `toi_da`. **Không làm case lỗi**, ghi `thay: true/false` vào báo cáo. Có `nhin_lai: N` thì làm hai bước: (1) xét lịch sử N giây **trước** bước này, tính cả chữ chỉ thoáng hiện như "+10", "1/5" hay câu nhắc ngắn; nếu có thì `thay: true`, `luc` = lúc chữ xuất hiện lần đầu; (2) nếu chưa có thì chờ **thêm** tối đa `toi_da` giây (`toi_da: 1` = gần như chỉ nhìn lại) |
| `tu_dong` | `tu_dong: { den_khi, toi_da (600), sai: {dt: kiểu}, bien_do: {dt: 0.6} }` | thấy `den_khi`. Bot tự đọc **tên động tác app đang hiện** (khớp nguyên văn tên app hiện, `npm run bot -- dong-tac`) rồi làm đúng động tác đó; tên app hiện mà bot chưa hỗ trợ thì bot giữ động tác trước. Giới hạn thời gian chỉ dùng `toi_da` của `tu_dong`; `toi_da` bên trong `den_khi` bị bỏ qua. Hết giờ mà có `den_khi` thì case dừng `het-gio` và các bước sau không chạy; không có `den_khi` thì chạy hết `toi_da` rồi đi tiếp |

Bước nào cũng nhận thêm `luc: <giây>`: chờ tới **mốc `goc_thoi_gian` gần nhất + luc** rồi mới chạy. Nếu đã quá mốc thì chạy ngay và ghi `TRỄ` vào nhật ký.

### `lam` – tham số

| Khoá | Ý nghĩa |
|---|---|
| `lam` | id động tác = khoá `HT_DT` của app (mục 4, `npm run bot -- dong-tac`) |
| `so_lan` | số lần (ước theo nhịp của app). **Chặn** tới khi làm xong |
| `den_khi` | `<Chu>`: làm tới khi thấy chữ rồi **thôi** (về đứng chờ). **Chặn**. Cách đáng tin nhất: chờ tên động tác KẾ TIẾP app hiện |
| (không `so_lan`/`den_khi`) | làm mãi, **không chặn**, tới khi bước khác đổi động tác hoặc `dung_yen` |
| `toi_da` | giây tối đa cho `den_khi` / `so_lan` (mặc định: `toi_da` của chữ, hoặc độ dài động tác + 10) |
| `toc_do` | 0.3–2.5 (mặc định 1 = nhịp mẫu của app). Bot tự lệch ±8 % theo hạt như người thật |
| `bien_do` | 0–1.5: 1 = đúng mẫu · 0.75 = làm nhỏ hơn mẫu · 0 = đứng yên |
| `ben` | `nguoc` = lật gương (bắt đầu từ bên kia) |
| `kieu_sai` | làm sai có chủ đích (bảng mục 4) |
| `giu_giay` | cho động tác GIỮ (kiểu `giu` / `giuDk` / `thoiGian`, vd. `ngoiXomSau`, `dungHac`, `motChanDang`): số giây giữ mỗi lần (mặc định: mức **Khó** của app – giữ lâu hơn vẫn được tính). Có `giu_giay` mà không có `so_lan` = giữ **một** lần rồi thôi (chặn) |
| `chuan_bi` | giây đứng chuẩn bị trước động tác (mặc định **1,5**, xem mục 5) |

### Ví dụ ngắn cho từng kiểu

```yaml
# tự động cả buổi, cố tình làm sai một động tác
- tu_dong:
    den_khi: "CHƠI LẠI"        # màn kết quả có nút "↻ CHƠI LẠI"
    toi_da: 480                # cả buổi HT003 ~5,5 phút
    sai: { xoayTay: vong_nho }
- ghi_nhan: { chu: "ĐỔI ĐỘNG TÁC NHÉ!", toi_da: 1 }
  nhin_lai: 480
  ten: co-luot-khong-du

# một động tác cụ thể ở phần làm quen, rồi xét kết quả của riêng lượt đó
- cho_chu: "NHÓN GÓT"            # sau khi đã bấm CHƠI NGAY và làm xong xoay vai
- lam: nhonGot
  bien_do: 0.75
  den_khi: { chu: "VÒNG 1/4", toi_da: 70 }   # làm quen xong → app vào vòng 1
- ghi_nhan: { chu: "NHÓN CAO HƠN", toi_da: 1 }
  nhin_lai: 60
  ten: co-nhac-nhon-cao
```

## 4. Động tác

**Bot làm được 332/343 động tác HT_DT** (bản app 2.51.2): đứng 190 · ngồi ghế 4 · bài sàn / camera nghiêng 138. Theo `kiem-bang --tat-ca` của siroby-app: **328/340 động tác trong thẻ bài (96 %)**. Còn 11 chưa hỗ trợ (bóng ảo, dừng theo lệnh, theo hướng – xem dưới).

```bash
npm run bot -- dong-tac                 # mọi động tác theo nhóm: id · tên app hiện · kiểu · nhịp / giây giữ · kiểu sai
npm run bot -- dong-tac --tim lunge     # lọc theo id / tên
npm run bot -- dong-tac --chua-ho-tro   # thêm danh sách đủ id chưa hỗ trợ
node cong-cu/do-phu.mjs <siroby-app>    # độ phủ tách đứng · ngồi ghế · sàn (cùng tập động tác kiem-bang đếm)
```

- **id** = khoá `HT_DT` của app, cũng là id trong thẻ bài `vui/htNNN-*.js` (`hoc: [...]`, `ds: [['squat', 8], …]`). **Tên** = chữ app hiện trên thẻ động tác; `tu_dong` khớp nguyên văn tên này. **Tên trùng** (bản đứng / bản sàn cùng tên, vd. "LUNGE TỚI" = `lungeTruoc` đứng / `lungeToi` sàn; "NGHIÊNG CỔ CHÂN TRONG – NGOÀI" = `nghiengCoChan` đứng / `nghiengCoChanNgoi` ngồi): `tu_dong` chọn id có trong thẻ bài của trò trong URL.
- Dữ liệu: `src/dong-tac/mau/{tay,chan,goi,hong,toan-than,san}.json` (đứng chia theo bộ phận `bp`; `san.json` = bài sàn, kèm dáng nghỉ `SAN_Q`). Công cụ `kiem-bang.mjs` bên siroby-app đọc khoá `dongTac` của mọi tệp ở đây. `src/dong-tac/tro.json` = thẻ bài từng trò (cam, nghi, động tác). `src/dong-tac/san-app.js` = hàm dựng dáng sàn của app, **sinh tự động** (đừng sửa tay).

### Bot làm từng kiểu thế nào

Bot làm **giống máy chơi của app** (`vui/2b-he-thong.js`, hàm `bot()`): phát đúng mẫu `D.mau` mà Siroby 3D làm mẫu, không tự chế chuyển động.

| Kiểu HT_DT | Bot làm |
|---|---|
| `lay`, `buoc`, `chay`, `chuoi`, `dam`, `tanDung`, `tho`, `huongDan`, `ld`, `thoiGian` có bước | phát mẫu lặp liên tục, đúng nhịp mẫu (lệch ±8 % theo hạt). Động tác hai bên (`doiBen`, thẻ ghi `ben`) dùng **cùng một mẫu**: mẫu đã luân phiên trái – phải như Siroby làm, app không bắt đúng bên |
| `giu`, `giuDk`, `thoiGian` (giữ) | vào dáng → giữ đủ giây (+0,6 s) → về đứng, thả 0,8 s → giữ lần sau. Giây giữ mặc định = mức Khó của app (`giayMuc[2]` hoặc `giay × 1,2`); đổi bằng `giu_giay` |
| mẫu nhấc cả hai chân (bật, nhảy sao, nhảy thỏ…) | cả người rời sàn đúng độ cao của mẫu |
| mẫu có `xa` (đi lùi, lùi nhanh, bước tới) | cả người lùi xa / tới gần camera theo cùng tỉ lệ ảnh như người giả của app |
| **ngồi ghế** (`HT_DT.ngoi`: `coVom`, `xoeNgon`, `anNgonCai`, `nghiengCoChanNgoi`) | mẫu ngồi của app; ghế hiện dưới hông (mặt ghế ngay dưới khớp hông theo dáng mẫu, bàn chân trên sàn). Cổng vào: **đứng** (app đòi "Đứng thẳng lên") – từ lượt đầu thì ngồi chờ trên ghế giữa các lượt. `thoBung` (thở, chốt HT079) dùng mẫu đứng `thoTay` như mọi bài – bot đứng lên thở |
| **bài sàn** (mẫu MAU3D `san`: nằm ngửa / sấp / nghiêng, quỳ, bốn điểm, plank, chống đẩy, tựa tường, đứng nhìn ngang) | camera nghiêng; vị trí khớp dựng bằng `sanKhop` **của app** với **tỉ lệ cơ thể bé trai** (app tự cân bằng điểm chạm – tay và mũi chân cùng chạm sàn), rồi đặt xương theo hướng từng đoạn như Siroby 3D của app. Chi phía xa máy bị thân **che thật**. Đồ vật đỡ như app vẽ: ghế / bục dưới điểm chạm có độ cao, hộp neo, **tường** trước bàn tay (`tuong`). Cổng vào: **quỳ (hoặc đứng nghiêng) giơ tay qua đầu** như máy chơi của app; giữa các lượt: dáng nghỉ `nghi` của thẻ (`namNgua`, `quyNgoi`, `bon`, `dung`). `bien_do: 0` = nằm / giữ im ở dáng đầu của động tác. Kiểu sai / `ben` chưa áp cho bài sàn |

Kiểu sai có chủ đích và hiệu chỉnh theo cơ thể hiện chỉ có ở HT003:

| id | Tên app hiện | Kiểu sai / hiệu chỉnh |
|---|---|---|
| `xoayCo` | XOAY CỔ | `nghieng_ca_vai`: nghiêng cả vai theo đầu · hiệu chỉnh nghiêng đầu ×2,2 |
| `xoayLung` | XOAY LƯNG TRÊN | `xoay_ca_hong`: xoay cả hông |
| `xoayTay` | XOAY VÒNG TAY | `vong_nho`: vòng tay nhỏ dang ngang |
| `nghiengLuon` | NGHIÊNG LƯỜN | hiệu chỉnh nghiêng thân ×1,15 |

Muốn làm sai mà chưa có kiểu sai: dùng `bien_do` (0 = đứng im, 0,5–0,75 = làm nhỏ) hoặc `toc_do`.

### Đã kiểm chứng trên app: động tác đứng (26/11/2026)

Bản dựng 2.51.2 (`dist/_bot`), mức Dễ, nền `phong`, hạt 7, phần LÀM QUEN (3 lần / động tác, giữ: 1 lần). Kịch bản: `kich-ban/siroby/2026-11-26-mo-rong-mau/`. Đọc bằng `cong-cu/hieu-chuan-bot/phan-tich.mjs` của siroby-app.

| Bài | Động tác | Kiểu | Làm đúng | Đứng im | Ghi chú |
|---|---|---|---|---|---|
| ht002 | `chayTaiCho` CHẠY TẠI CHỖ | chay | 3/3 XONG (2,7 s) | 0 | |
| ht002 | `chayGotMong` CHẠY GÓT CHẠM MÔNG | lay | 3/3 XONG | 0 | |
| ht115 | `buocGoiCao` BƯỚC NÂNG GỐI CAO | lay | 3/3 XONG | 0* | *vòng 1: 1 lần lúc bot còn hoà ra khỏi ĐI NHÓN GÓT (0,3 s sau khi đổi) – độ trễ của bot |
| ht115 | `nhayTho` NHẢY THỎ | lay, bật | 3/3 XONG | 0 | |
| ht020 | `squat` SQUAT TAY KHÔNG | lay | 3/3 XONG | 0 | |
| ht020 | `squatVuon` SQUAT VƯƠN TAY | lay | 3/3 XONG | 0 | |
| ht040 | `lungeTruoc` LUNGE TỚI | lay | 3/3 XONG | 0 | |
| ht040 | `lungeLui` LUNGE LÙI | lay | 3/3 XONG | 0 | |
| ht063 | `jumpingJack` JUMPING JACK | lay, bật | 3/3 XONG | 0 | cần pha bay (bản đầu dập chân xuống sàn) |
| ht063 | `batSao` BẬT NGÔI SAO | lay, bật | 3/3 XONG | 0 | |
| ht087 | `theThu` THẾ ĐỨNG QUYỀN ANH | giuDk | 1/1 XONG | 0 | |
| ht087 | `jab` ĐẤM TAY TRƯỚC (JAB) | dam | 3/3 XONG | 0 | trước khi sửa lật gương: 0/3 "TAY TRƯỚC!" (đấm nhầm tay) |
| ht067 | `motChanDang` ĐỨNG MỘT CHÂN | giuDk | 1/1 XONG | 0 | |
| ht067 | `dungHac` ĐỨNG HẠC | giu | 1/1 XONG (8,8 s) | 0 | trước khi sửa lật gương: 34 s mới được |
| ht037 | `lungeNgang` LUNGE NGANG | lay, hai bên | 3/3 XONG | 0 | |
| ht037 | `lungeCheoTruoc` LUNGE CHÉO TRƯỚC | lay | 3/3 XONG | 0 | |
| ht008 | `truotNgang` BƯỚC TRƯỢT NGANG | lay | 3/3 XONG | 0 | trước khi sửa `tu_dong`: kẹt ở cổng vào (tên bài "BƯỚC CHÉO") |
| ht008 | `diLui` ĐI LÙI | lay, `xa` | 3/3 XONG | 0 | |

Bài học: app **soi gương** ảnh camera – tay[0] của mẫu là tay TRÁI người tập. Bot lật gương dáng trước khi áp (`ap-dang.js`). Động tác đối xứng / luân phiên không lộ lỗi này; động tác bắt đúng tay (đấm) thì lộ.

### Đã kiểm chứng: ghế, bài sàn, SIA-110 (27/11/2026)

Bản dựng 2.51.2 `dev` 6ba2dfda (`dist/_bot`), mức Dễ, nền `phong`, hạt 7. Kịch bản: `kich-ban/siroby/2026-11-27-{ghe,bai-san,SIA-110}/`. Đọc bằng `cong-cu/hieu-chuan-bot/phan-tich.mjs` của siroby-app.

**Ghế – HT079 (cả buổi)**

| Động tác | Ghế đẩu – làm đúng | Ngồi im | Ghế văn phòng | Bàn che chân | Ghi chú |
|---|---|---|---|---|---|
| `xoeNgon` XÒE NGÓN CHÂN | đủ mọi lượt (3/3, 5/5, 5/5, 4/4, 4/4) | 0 | 4/6 → 6/6, 4/4 ×2 | đủ mọi lượt | |
| `nghiengCoChanNgoi` NGHIÊNG CỔ CHÂN (ngồi) | 5/5, 5/5 | 0 | 5/5, 5/5 | 5/5, 5/5 | |
| `anNgonCai` ẤN NGÓN CHÂN CÁI | 0/4, 0/2 | 0 | 1/4, 0 | 4/4, 2/2 | chập chờn – cử động mũi chân sát ngưỡng |
| `coVom` CO VÒM BÀN CHÂN | **0 mọi lượt** | 0 | 0 | 0 | **nghi app**: mẫu co vòm nhìn thẳng chỉ làm mũi chân – cổ chân dịch ~0,02–0,03 thân, ngưỡng "có cử động" 0,06 → làm đúng mẫu không bao giờ được đếm |

Ảnh: hông chạm mặt ghế, hai bàn chân trên sàn, không xuyên ghế; ghế văn phòng (tay vịn, trụ, chân sao che một phần chân); bàn thấp che bàn chân + cổ chân, cẳng chân vẫn thấy. Cổng vào: bé ĐỨNG (app đòi "Đứng thẳng lên"), từ lượt đầu ngồi chờ trên ghế. `thoBung` (chốt) bot đứng lên thở theo mẫu đứng.

**Bài sàn / camera nghiêng (máy 0,6 m nhìn ngang, cách 2,6 m)** – lượt LÀM QUEN chỉ ~10 giây; ca "vòng 1" chạy tới hết vòng 1 (60 giây)

| Bài | Động tác | Làm đúng (làm quen) | Làm đúng (vòng 1) | Nằm / giữ im | Ghi chú |
|---|---|---|---|---|---|
| ht030 nằm ngửa | `nghiengChau` NGHIÊNG XƯƠNG CHẬU | 3/3 | 6/6, 6/6 | 0 | |
| | `cauMong` CẦU MÔNG | 2/3 | 7/7 | 0 | làm quen: 3 lần × 3,5 giây không vừa ~10 giây |
| ht048 nằm sấp | `epBaVaiSap` ÉP BẢ VAI NẰM SẤP | 3/3 | – | 0 | |
| | `sieuNhan` SIÊU NHÂN NẰM SẤP | 3/3 | – | 0 | |
| ht043 nằm nghiêng | `plankNghiengGoi` PLANK NGHIÊNG CHỐNG GỐI | 1/1 | – | 0 | |
| | `plankNghieng` PLANK NGHIÊNG | 1/1 | – | 0 | |
| ht045 bốn điểm / nằm ngửa | `boNgua` BỌ NGỬA | 3/3 | – | 0 (vòng 1: 1)* | |
| | `birdDog` BIRD DOG | 3/3 | – | 0 | |
| ht041 plank | `plankGoi` PLANK CHỐNG GỐI | 1/1 | 2/2, 1/1 | 0 | |
| | `plankCangTay` PLANK CẲNG TAY | 0 | 2/2 | 0 | làm quen: giữ 8 giây (Dễ) + vào dáng không vừa ~10 giây; điều kiện plank của app đúng liên tục từ giây 2,4 |
| ht051 chống đẩy | `chongDayBaVai` CHỐNG ĐẨY BẢ VAI | 3/3 | – | 0 (vòng 1: 1)* | |
| | `chongDayGoi` CHỐNG ĐẨY CHỐNG GỐI | 3/3 | – | 0 | |
| ht049 tựa tường | `chongDayTuong` CHỐNG ĐẨY TƯỜNG | 0/3, 1/3 | **0/6** | 0 | **nghi app**: đếm theo gập khuỷu 3D (≥ 60° rồi ≤ 30°) – tay bé duỗi thẳng (mẫu 2°, ảnh 2D 8–16°) mà 3D đo 31–34° → không bao giờ "duỗi"; 3D mất ở 25/30 khung |
| | `chongDayBaVaiTuong` CHỐNG ĐẨY BẢ VAI Ở TƯỜNG | 3/3 | – | 0 | |
| ht091 bốn điểm / quỳ | `meoBo` MÈO – BÒ | 2/3 | 5/5 | 0 | làm quen: 3 × 3,2 giây không vừa |
| | `theEmBe` TƯ THẾ EM BÉ | 0 | 1/2 | 0 | làm quen: cần giữ 11 giây (Dễ) > lượt ~10 giây (**nghi app**); vòng 1: app chỉ lại "ĐƯA KHUỶU TỚI / ĐƯA ĐẦU TỚI" – nghi tỉ lệ tay / điểm vai của bé trai (bot) |
| ht025 đứng nhìn ngang | `gapHongTuong` GẬP HÔNG CHẠM TƯỜNG | 3/3 | – | 0 | |
| | `gapHong` GẬP HÔNG | 3/3 | – | 0 | |

\* 1 lần lúc bot chuyển từ dáng đầu động tác trước sang dáng đầu động tác sau (~1,5 giây sau khi đổi lượt) – cử động chuyển tư thế thật, cùng loại "nhịp đầu khi vào tư thế" của SIA-110.

**SIA-110 – nằm im ở lượt NGHIÊNG CHẬU (HT030), hai bản dựng × hai cách đặt máy** (`ket-qua/sia110-<bản>/<case>.webm`)

| Bản | Máy trên bàn 0,75 m, chúi 20°, lệch 30° | Máy ngang hông 0,6 m, nhìn ngang |
|---|---|---|
| 2e184a7b (chưa sửa) | **1** (làm quen 1/3, vòng 1 0/5) – video ~giây 29 | **1** (1/3, 0/5) – video ~giây 46 |
| c1e725bc (đã sửa – `dongHaiBen`) | **0** | **0** |
| người thật trên 2e184a7b (b7-ht030-nam-im) | 6/6 | – |

Bot **chưa tái hiện được lỗi gối xa trôi**: gối xa đúng là bị thân che (độ tin 0,31 – 0,33) nhưng mắt app đoán nó gần như đứng yên – trôi 0,025 thân (người thật 0,13 – 0,42; ngưỡng 0,045), tăng nhiễu webcam ×3,5 vẫn 0,02. Ảnh dựng ổn định hơn webcam thật (không tự cân sáng, không nén, người không thở). Lần đếm duy nhất trên bản chưa sửa rơi đúng lúc vào tư thế (quỳ giơ tay → nằm, ~2,3 giây sau khi vào lượt) – phần "bỏ nhịp đầu sau khi vào tư thế" mà c1e725bc cũng sửa.

### Chưa hỗ trợ (11 động tác)

`kiem` báo lỗi kèm lý do nếu kịch bản dùng các id này. Trong `tu_dong`, gặp tên app hiện mà bot chưa hỗ trợ thì bot giữ động tác trước (thường app không đếm). Danh sách: `src/dong-tac/chua-ho-tro.json` hoặc `npm run bot -- dong-tac --chua-ho-tro`.

| Lý do | Số | Động tác | Việc cần làm (đợt sau) |
|---|---|---|---|
| chạy / đi rồi DỪNG theo lệnh trên màn (đèn đỏ, "DỪNG!") – phản xạ theo app | 4 | `chanNhanhDung`, `chayDungHinh`, `chayNuocRut`, `omQuaDung` | tu_dong đọc lệnh dừng trên màn rồi đứng hình (thêm sự kiện "thấy chữ → dừng" cho động tác kiểu dung) |
| mỗi lần một HƯỚNG do Siroby chỉ (mauHuong) – phải đọc mũi tên trên màn | 2 | `theoMuiTen`, `nemDich` | mắt bot đọc hướng (mũi tên / chữ) rồi phát mẫu của hướng đó (mauHuong) |
| bóng ảo: phải đưa tay tới đúng chỗ quả bóng Siroby tung (vị trí đổi mỗi lần) | 5 | `batBong`, `batBongThap`, `batBongCao`, `batMotTay`, `batBongMotChan` | mắt bot đọc vị trí bóng trên màn (hoặc trạng thái app) rồi với tay tới đó – cần IK tay theo điểm đích |

Còn thiếu ở các nhóm đã hỗ trợ: **kiểu sai giống người** chỉ có ở HT003 (bài sàn / ngồi chỉ có `bien_do`, `toc_do`); bài sàn chưa có `ben: nguoc`.

### Khi app đổi mẫu / thêm động tác

```bash
# 1. trong siroby-app: dựng bản thử riêng cho bot (không đụng dist/app)
SIROBY_DIST="$PWD/dist/_bot" python3 dong-goi/dung.py app
# 2. trong bot-front-cam: trích lại mọi động tác (xoá + ghi lại src/dong-tac/mau/*.json, chua-ho-tro.json, tro.json, san-app.js)
npx tsx cong-cu/lay-mau3d.ts --phuc-vu <siroby-app>/dist/_bot/app
#    chỉ vài động tác (giữ nguyên các động tác khác):  … --dong-tac squat,jab
# 3. xem đổi gì: git diff --stat src/dong-tac ; npm run bot -- kiem kich-ban
# 4. trong siroby-app: BOT_FRONT_CAM=<bot-front-cam> node cong-cu/hieu-chuan-bot/kiem-bang.mjs --tat-ca
```

Công cụ lấy danh sách ngay trong trang (`HT_DT`, `MAU3D` là biến toàn cục, nạp đủ ở mọi trò; mặc định mở HT003), in số động tác mỗi nhóm, danh sách chưa hỗ trợ và **tên trùng** (hai id cùng tên app hiện mà khác mẫu – `tu_dong` chọn theo thẻ bài của trò). Thẻ bài đọc từ bản dựng (`vui/tro/ht*.js`), hàm dựng dáng sàn lấy nguyên văn trong trang (`fn.toString()`), nên app đổi luật dựng dáng sàn thì chỉ cần trích lại. Động tác mới cùng kiểu đã hỗ trợ thì tự có; kiểu mới thì nằm ở "kiểu động tác thư viện bot chưa hiểu".

## 5. Hiểu app khi viết kịch bản (HT003, bản dựng 21/11/2026)

- **Mọi bài HT dùng chung một khung** (`vui/2b-he-thong.js`): làm quen = 2 động tác `hoc` của thẻ bài → `VÒNG 1/4` … `4/4` (mỗi vòng 1:00) → màn kết quả. Các điều dưới đây (bộ đếm `n/N`, `XONG!` / `ĐỔI ĐỘNG TÁC NHÉ!`, đứng chuẩn bị) đúng cho mọi bài; thứ tự động tác thì đọc thẻ `vui/htNNN-*.js`. URL `?tro=<id bài>&muc=0` chọn bài + mức (0 Dễ · 1 Vừa · 2 Khó). Kiểm nhanh một động tác: chọn bài có động tác đó trong `hoc` (xem `kich-ban/siroby/2026-11-26-mo-rong-mau/`).
- **Mức độ**: màn giới thiệu có ba nút Dễ (5–7 tuổi) / **Vừa (8–12, mặc định)** / Khó (13–18), và hai nút thời lượng 5 phút (mặc định) / 10 phút. Muốn đổi thì bấm trước CHƠI NGAY, vd. `bam: "Khó"`.
- **Thứ tự** (bản 21/11 – bản 2.51.2 chèn thêm lượt, vd. XOAY VAI sau XOAY CỔ; thứ tự còn đổi theo người tập nên kịch bản cả buổi nên dùng `tu_dong`): làm quen (XOAY VAI → NHÓN GÓT) → VÒNG 1/4 Cổ – vai (XOAY CỔ) → nghỉ 10 s → VÒNG 2/4 (XOAY VAI → XOAY LƯNG TRÊN → NGHIÊNG LƯỜN) → VÒNG 3/4 (XOAY VÒNG KHỚP HÔNG → NHÓN GÓT) → VÒNG 4/4 (XOAY VAI → XOAY VÒNG TAY → NHÓN GÓT → GIỮ NGỒI XỔM SÂU) → màn kết quả (nút "↻ CHƠI LẠI").
- **Bộ đếm** của động tác đang làm hiện dạng `"n/N"` (vd. `"3/5"`). Sang động tác mới thì về `"0/N"`. Hai động tác liền nhau có thể cùng N (làm quen: xoay vai 5, nhón gót 5), nên `"5/5"` không cho biết của động tác nào. Hãy xét theo **kết quả từng lượt** ngay dưới đây, hoặc đặt `ghi_nhan` ngay sau `den_khi` của đúng động tác đó với `nhin_lai` bằng quãng của lượt.
- **Kết quả từng lượt động tác** (chữ to giữa màn, thoáng hiện): **`"XONG!"`** = làm đủ lần · **`"ĐỔI ĐỘNG TÁC NHÉ!"`** = lượt kết thúc mà **chưa đủ** (hết giờ / quá nhiều lần không được), app chuyển sang động tác khác. Đây là cách chắc nhất để biết một động tác có được đếm đủ hay không.
- Hết phần làm quen thì app vào thẳng `"VÒNG 1/4 · 1:00"`, không có dòng "động tác đủ".
- **Cổng vào bài camera nghiêng**: "Đặt máy thấp ngang hông, cách 2 – 3 mét" → "Đứng thẳng, hai tay thả lỏng" → "Quỳ hoặc đứng nghiêng, giơ tay qua đầu để bắt đầu". Bot đứng / quỳ rồi giơ tay qua đầu; vào bài khoảng giây 25 – 30. Trò ngồi (HT079) cũng qua cổng vào bằng ĐỨNG rồi mới ngồi.
- **Cổng vào (2.51.2)**: sau CHƠI NGAY app hiện "1. Thấy cả người · 2. Đứng yên · 3. Giơ 2 tay lên để bắt đầu nào!" (không còn "ĐỨNG VÀO KHUNG HÌNH"). Bot đứng yên, app tự vào sau ~30 giây; lượt đầu bắt đầu khoảng giây 37. Chờ bằng `cho_chu: { chu: "<tên động tác đầu>", toi_da: 90 }` hoặc dùng `tu_dong` (tự đứng chờ ở cổng vào).
- Mỗi vòng có đồng hồ **1:00**. Hết giờ thì app tự sang phần sau dù chưa đủ lần, nên đặt `toi_da` ≥ 70–100 s cho `den_khi` cuối vòng.
- App chỉ đổi động tác khi **làm đủ lần** (luật O1), không theo giờ. Vì vậy kịch bản theo sự kiện (`den_khi` = tên động tác kế tiếp) bền hơn timeline.
- Cuối mỗi vòng app hiện `"VÒNG n XONG!"` và một dòng `"x/y động tác đủ · z lần"`. Ghi lại bằng `ghi_nhan: { chu: "động tác đủ", toi_da: 3 }`.
- Câu nhắc kỹ thuật app hiện (đã thấy khi chạy bot): "NGHIÊNG THÊM", "DUỖI THẲNG TAY", "NGỰC NHÌN THẲNG", "NÂNG KHUỶU LÊN", "HÔNG ĐỨNG YÊN", "ĐỔI ĐỘNG TÁC NHÉ!", "SIROBY CHỈ LẠI", "NHÌN SIROBY LÀM NHÉ". Các câu này thoáng hiện, nên dùng `nhin_lai`. **Danh sách đầy đủ** nằm trong mã siroby-app: bảng mã lỗi → chữ ở `vui/22-tu-the.js` (vd. `'TAY-CO': ['DUỖI THẲNG TAY', …]`) và `vui/23-tu-the-2.js` (vd. `'JP-GOT': ['NHÓN CAO HƠN', …]`). Chép **nguyên văn** chữ từ đó vào `ghi_nhan`; không chắc thì dùng chuỗi ngắn hơn hoặc `khong_dau: true`.
- **Đứng chuẩn bị 1,5 s**: app lấy "mốc đứng" khi người đứng yên ≥ 0,3 s (vd. nhón gót so với mốc này). Làm liền không nghỉ thì mốc cũ, và nhón gót sau xoay hông bị đếm 0. Chỉ giảm `chuan_bi` khi test đúng hành vi đó.

### Đã biết (để không nhầm là lỗi app)

| Hiện tượng | Ý nghĩa |
|---|---|
| ~~XOAY CỔ luôn đếm 0~~ (đã sửa 26/11) | nguyên nhân là bot **lật trái – phải** so với app (app soi gương ảnh camera), không phải độ nghiêng đầu. Sau khi sửa: 9/9 và 10/10 XONG ở vòng 1 HT003 (trước: 0/10 ĐỔI). Hiệu chỉnh nghiêng đầu ×2,2 vẫn giữ, chưa thử bỏ |
| XOAY VÒNG TAY hay bị "DUỖI THẲNG TAY" | tay thẳng trong 3D; nửa trước vòng tay chĩa vào camera nên trên ảnh trông gập. Người thật có thể cũng bị. Vẫn được đếm |
| NGHIÊNG LƯỜN thỉnh thoảng "NGỰC NHÌN THẲNG" | đã chỉnh độ nghiêng (×1,15) để cân giữa "NGHIÊNG THÊM" và lỗi này |
| `xoay_ca_hong` không làm app nhắc "HÔNG ĐỨNG YÊN" | app đếm ít hơn (3/8 so với 7–8/8) nhưng không nhắc. Chưa rõ ngưỡng app hay kiểu sai chưa đủ mạnh |

## 6. Kết quả

```
<ra>/
  tong-hop.json            ← đọc tệp này
  <case>.webm              ← 1 bằng chứng / case: video tab app (thấy cả bé trai lẫn phản ứng của app), đã nén ~2–3 MB / phút
  nhat-ky/<case>.txt       ← nhật ký dò lỗi: mỗi bước, mỗi chữ mới thấy (chỉ đọc khi cần)
```

`tong-hop.json`:
```json
{
  "lanChay": "2026-11-21T09:03:04.377Z", "may": "darwin arm64", "kichBan": "/…/ht003.yaml",
  "tongKet": { "soCase": 2, "daChay": 2, "xong": 1, "hetGio": 1, "loi": 0 },
  "cases": [{
    "case": "ht003-dung-yen", "tep": "/…/ht003.yaml", "chay": "xong",        // xong | het-gio | loi
    "batDau": "…", "giay": 52.4, "hat": 7,
    "loi": { "buoc": 3, "dong": 5, "lenh": "cho_chu", "thongBao": "không thấy … sau 4 giây" },   // chỉ khi het-gio / loi
    "ghiNhan": [ { "ten": "co-chi-lai", "thay": true, "luc": 21.3, "chuThay": "SIROBY CHỈ LẠI" },
                 { "ten": "bi-dem-nham", "thay": false, "luc": null } ],
    "daLam": [ { "luc": 7.4, "dongTac": "xoayVai" }, { "luc": 15.1, "dongTac": "xoayTay", "kieuSai": "vong_nho" } ],
    "videoTu": 3.1, "bangChung": "ht003-dung-yen.webm", "nhatKy": "nhat-ky/ht003-dung-yen.txt"
  }]
}
```
- `chay: xong` chỉ nghĩa là **kịch bản chạy hết**, không phải test pass. Pass/fail do bạn kết luận từ `ghiNhan` và video.
- `luc` tính bằng giây từ lúc case bắt đầu. **Thời điểm trong video = `luc` − `videoTu`** (video bắt đầu khi tab app mở, sau khi sân khấu đã sẵn sàng).
- Khối JSON trên có chú thích `//` để giải thích; tệp thật là JSON chuẩn.

## 7. Mẫu

`kich-ban/mau/`: `ht003-dung-form.yaml` (cả buổi, tường minh), `ht003-dung-yen.yaml`, `ht003-tu-dong-sai.yaml`, `ht003-timeline.yaml`. Chép rồi sửa.

Mẹo:
1. Bắt đầu mọi case HT003 bằng `bam: "Tôi là bố/mẹ"` rồi `bam: { css: "#nutChoi" }` ("CHƠI NGAY" trùng với một dòng chữ khác trên trang).
2. Một test case manual → một case. Đặt `ten` cho từng `ghi_nhan` theo điều cần kiểm, vd. `co-nhac-duoi-tay`.
3. Muốn "làm đúng cả buổi" thì dùng `tu_dong` (ngắn, bền). Muốn kiểm một động tác cụ thể thì viết tường minh với `den_khi`.
4. Muốn chắc app KHÔNG làm gì đó (không đếm, không nhắc) thì dùng `ghi_nhan` với `nhin_lai` bằng cả quãng vừa làm, rồi kiểm `thay: false`.
5. Luôn `kiem` trước `run`.
