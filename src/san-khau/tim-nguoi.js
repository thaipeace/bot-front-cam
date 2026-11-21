// TÌM NGƯỜI THẬT trong ảnh nền webcam – nếu còn người, app sẽ nhận nhầm người thật thay cho bé trai 3D.
// MediaPipe ObjectDetector (EfficientDet-Lite0, lớp "person"), chạy ngay trên máy, không gửi ảnh đi đâu.
import { FilesetResolver, ObjectDetector } from '/__bot/mediapipe/vision_bundle.mjs';

let boNhan = null;
async function layBoNhan(){
  if (boNhan) return boNhan;
  const fs = await FilesetResolver.forVisionTasks('/__bot/mediapipe/wasm');
  boNhan = await ObjectDetector.createFromOptions(fs, {
    baseOptions: { modelAssetPath: '/__bot/assets/mo-hinh/efficientdet_lite0.tflite', delegate: 'CPU' },
    runningMode: 'IMAGE', scoreThreshold: 0.35, categoryAllowlist: ['person'], maxResults: 3,
  });
  return boNhan;
}

/** trả về danh sách người tìm thấy [{diem, hop}] trong canvas / ảnh */
export async function timNguoi(anh){
  const bn = await layBoNhan();
  const kq = bn.detect(anh);
  return kq.detections.map(d => ({ diem: +d.categories[0].score.toFixed(2), hop: d.boundingBox }));
}
