// PHÁT – luồng canvas cho tab app qua WebRTC nội bộ (báo hiệu bằng BroadcastChannel, cùng origin).
export function batDauPhat(canvas, fps = 30){
  // captureStream(0): chỉ lấy khung khi gọi requestFrame() – mỗi lần vẽ xong đẩy đúng 1 khung (không lệch nhịp setInterval)
  const luong = canvas.captureStream(0);
  const track = luong.getVideoTracks()[0];
  const kenh = new BroadcastChannel('bot-front-cam');
  const ketNoi = new Set();
  kenh.onmessage = async e => {
    const m = e.data; if (!m || m.loai !== 'offer') return;
    const pc = new RTCPeerConnection({ iceServers: [] });
    ketNoi.add(pc);
    pc.addEventListener('connectionstatechange', () => { if (['closed', 'failed'].includes(pc.connectionState)) ketNoi.delete(pc); });
    for (const tr of luong.getVideoTracks()){
      const gui = pc.addTrack(tr, luong);
      const ts = gui.getParameters();
      ts.degradationPreference = 'maintain-resolution';
      ts.encodings = [{ ...(ts.encodings && ts.encodings[0] || {}), maxBitrate: 4_000_000, maxFramerate: fps }];
      gui.setParameters(ts).catch(() => {});
    }
    await pc.setRemoteDescription({ type: 'offer', sdp: m.sdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await new Promise(r => { if (pc.iceGatheringState === 'complete') return r(); pc.addEventListener('icegatheringstatechange', () => pc.iceGatheringState === 'complete' && r()); setTimeout(r, 2000); });
    kenh.postMessage({ loai: 'answer', id: m.id, sdp: pc.localDescription.sdp });
  };
  async function thongKe(){
    const ds = [];
    for (const pc of ketNoi){ (await pc.getStats()).forEach(r => { if (r.type === 'outbound-rtp' && r.kind === 'video') ds.push({
      fps: r.framesPerSecond, rong: r.frameWidth, cao: r.frameHeight, ma: r.encoderImplementation, gioiHan: r.qualityLimitationReason,
      kbps: null, khungMa: r.framesEncoded, msMa: r.framesEncoded ? +(1000 * r.totalEncodeTime / r.framesEncoded).toFixed(1) : null }); }); }
    return ds;
  }
  return { soKetNoi: () => ketNoi.size, thongKe, dayKhung(){ if (track.requestFrame) track.requestFrame(); } };
}
