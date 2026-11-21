// Init script chạy trong MỌI trang của context. Chỉ trang app (không phải /__bot/) bị thay camera:
// getUserMedia({video}) → luồng hình của sân khấu, nhận qua WebRTC nội bộ (báo hiệu bằng BroadcastChannel – cùng origin).
(() => {
  if (location.pathname.startsWith('/__bot/')) return;
  const md = navigator.mediaDevices;
  if (!md || !md.getUserMedia) return;
  const thatGUM = md.getUserMedia.bind(md);
  const thatEnum = md.enumerateDevices.bind(md);
  const KENH = 'bot-front-cam';
  const THIET_BI = { deviceId: 'bot-front-cam', groupId: 'bot-front-cam', kind: 'videoinput', label: 'Bot Front Cam' };

  const choIce = pc => pc.iceGatheringState === 'complete' ? Promise.resolve() : new Promise(r => {
    const xong = () => { if (pc.iceGatheringState === 'complete'){ pc.removeEventListener('icegatheringstatechange', xong); r(); } };
    pc.addEventListener('icegatheringstatechange', xong);
    setTimeout(r, 2000);
  });

  async function layLuongBot(){
    const id = Math.random().toString(36).slice(2);
    const kenh = new BroadcastChannel(KENH);
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.addTransceiver('video', { direction: 'recvonly' });
    const coTrack = new Promise(r => pc.addEventListener('track', e => r(e.track)));
    await pc.setLocalDescription(await pc.createOffer());
    await choIce(pc);
    const traLoi = new Promise((r, loi) => {
      const hen = setTimeout(() => loi(Object.assign(new Error('Sân khấu bot không trả lời'), { name: 'NotReadableError' })), 10000);
      kenh.onmessage = e => { if (e.data && e.data.loai === 'answer' && e.data.id === id){ clearTimeout(hen); r(e.data.sdp); } };
    });
    kenh.postMessage({ loai: 'offer', id, sdp: pc.localDescription.sdp });
    await pc.setRemoteDescription({ type: 'answer', sdp: await traLoi });
    const track = await coTrack;
    kenh.close();
    // app gọi track.stop() khi đổi trò → đóng kết nối
    const dung = track.stop.bind(track);
    track.stop = () => { dung(); pc.close(); };
    track.applyConstraints = async () => {};
    const s = new MediaStream([track]);
    window.__botCamera = { pc, track, luc: performance.now() };
    return s;
  }

  md.getUserMedia = async c => (c && c.video) ? layLuongBot() : thatGUM(c);
  md.enumerateDevices = async () => {
    const ds = (await thatEnum().catch(() => [])).filter(d => d.kind !== 'videoinput');
    return [{ ...THIET_BI, toJSON(){ return THIET_BI; } }, ...ds];
  };
})();
