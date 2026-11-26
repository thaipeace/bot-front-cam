// SCHEMA KỊCH BẢN – một tệp YAML chứa 1 case, hoặc danh sách case (`cases: [...]` hoặc mảng ở gốc).
// Mỗi bước là MỘT đối tượng có đúng một khoá lệnh: bam · cho_chu · lam · dung_yen · nghi · goc_thoi_gian · ghi_nhan · tu_dong.
// Bước nào cũng có thể kèm `luc: <giây>` = chờ tới mốc `goc_thoi_gian` gần nhất + số giây đó rồi mới chạy (timeline).
import { z } from 'zod';

export const URL_MAC_DINH = 'http://localhost:8790/vui/index.html?tro=ht003-khoi-dong-khop';

/** chờ chữ: "chữ" hoặc { chu, toi_da (giây, mặc định 60), khong_dau } */
export const Chu = z.union([
  z.string().min(1).transform(chu => ({ chu, toi_da: 60, khong_dau: false })),
  z.object({ chu: z.string().min(1), toi_da: z.number().positive().default(60), khong_dau: z.boolean().default(false) }).strict(),
]);
export type ChoChu = z.infer<typeof Chu>;

const luc = { luc: z.number().min(0).optional() };

export const LENH = {
  /** bấm theo chữ trên nút, hoặc theo CSS: bam: "CHƠI NGAY" | bam: { css: "#nutChoi" } */
  bam: z.object({ bam: z.union([z.string().min(1), z.object({ chu: z.string().optional(), css: z.string().optional() }).strict()
    .refine(v => !!(v.chu || v.css), 'cần chu hoặc css')]), toi_da: z.number().positive().default(30), ...luc }).strict(),
  /** chờ đến khi chữ hiện trên màn (DOM hoặc chữ game vẽ lên canvas) */
  cho_chu: z.object({ cho_chu: Chu, ...luc }).strict(),
  /** làm một động tác. Không có so_lan / den_khi / giu_giay: làm mãi (không chặn) tới khi bước khác đổi động tác */
  lam: z.object({
    lam: z.string().min(1),
    so_lan: z.number().int().positive().optional(),
    den_khi: Chu.optional(),                      // làm tới khi thấy chữ này rồi thôi
    toi_da: z.number().positive().optional(),      // giây – quá thì case lỗi "het-gio"
    toc_do: z.number().min(0.3).max(2.5).optional(),
    bien_do: z.number().min(0).max(1.5).optional(),
    ben: z.enum(['thuong', 'nguoc']).optional(),
    kieu_sai: z.string().optional(),
    giu_giay: z.number().positive().optional(),
    chuan_bi: z.number().min(0).max(5).optional(),   // giây đứng chuẩn bị trước động tác (mặc định 1,5)
    ...luc,
  }).strict(),
  /** đứng yên (dáng chờ tự nhiên) – số giây (chặn), hoặc true = đứng yên rồi đi tiếp ngay */
  dung_yen: z.object({ dung_yen: z.union([z.number().positive(), z.literal(true)]), ...luc }).strict(),
  /** chờ số giây, bé trai vẫn làm việc đang làm */
  nghi: z.object({ nghi: z.number().positive(), ...luc }).strict(),
  /** đặt mốc timeline: "bay_gio" hoặc chờ chữ rồi lấy lúc thấy chữ làm mốc */
  goc_thoi_gian: z.object({ goc_thoi_gian: z.union([z.literal('bay_gio'), Chu]) }).strict(),
  /** ghi lại chữ có hiện trong khoảng chờ hay không – KHÔNG làm case lỗi; kết quả vào báo cáo */
  //   nhin_lai: <giây> = tính cả chữ đã hiện trong N giây vừa qua (chữ chỉ thoáng hiện, vd. "+10", "1/5")
  ghi_nhan: z.object({ ghi_nhan: Chu, ten: z.string().optional(), nhin_lai: z.number().positive().optional(), ...luc }).strict(),
  /** tự động: đọc tên động tác app yêu cầu → làm đúng động tác đó, tới khi thấy chữ den_khi */
  tu_dong: z.object({ tu_dong: z.object({
    den_khi: Chu.optional(),
    toi_da: z.number().positive().default(600),
    sai: z.record(z.string()).optional(),           // { xoayTay: vong_nho }
    bien_do: z.record(z.number()).optional(),       // { nhonGot: 0.6 }
  }).strict(), ...luc }).strict(),
} as const;
export type TenLenh = keyof typeof LENH;
export type Buoc = { [K in TenLenh]: z.infer<(typeof LENH)[K]> & { lenh: K } }[TenLenh];

export const KichBan = z.object({
  case: z.string().min(1).regex(/^[\p{L}\p{N}_.-]+$/u, 'tên case chỉ gồm chữ, số, - _ . (dùng làm tên tệp)'),
  mo_ta: z.string().optional(),
  url: z.string().url().default(URL_MAC_DINH),
  hat: z.number().int().default(7),
  nen: z.enum(['chup', 'truc-tiep', 'phong']).optional(),
  /** ghế cho động tác ngồi (tự hiện khi ngồi): don (mặc định, ghế đẩu) · van_phong (tay vịn / trụ che một phần chân) · ban (bàn thấp che bàn chân) · khong */
  ghe: z.enum(['don', 'van_phong', 'ban', 'khong']).optional(),
  /** camera giả: bài camera nghiêng (thẻ cam 'nghieng') tự đặt máy thấp ngang hông (cao 0,6 m, cách 2,6 m, nhìn ngang).
   *  Đổi để mô phỏng người đặt máy sai: cao (m) · cach (m) · cui (độ chúi xuống) · lech (độ – máy lệch quanh người, nhìn chéo thân) */
  camera: z.object({ cao: z.number().min(0.1).max(2.5).optional(), cach: z.number().min(0.8).max(6).optional(),
    cui: z.number().min(-10).max(60).optional(), lech: z.number().min(-80).max(80).optional() }).strict().optional(),
  buoc: z.array(z.record(z.unknown())).min(1),
}).strict();
export type KichBanTho = z.infer<typeof KichBan>;
