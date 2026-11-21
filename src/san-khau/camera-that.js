// HÌNH GIỐNG WEBCAM – lớp hậu kỳ: hơi nhoè, nhiễu hạt, tối góc nhẹ, bão hoà thấp hơn chút (webcam laptop).
import * as THREE from 'three';

export function dungHauKy(renderer, W, H, o = {}){
  const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, colorSpace: THREE.SRGBColorSpace });
  const mat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, uThoi: { value: 0 }, uNhieu: { value: o.nhieu ?? 0.035 }, uNhoe: { value: o.nhoe ?? 0.45 },
      uTocGoc: { value: o.tocGoc ?? 0.18 }, uBaoHoa: { value: o.baoHoa ?? 0.92 }, uPx: { value: new THREE.Vector2(1 / W, 1 / H) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uThoi, uNhieu, uNhoe, uTocGoc, uBaoHoa; uniform vec2 uPx; varying vec2 vUv;
      float bam(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec4 c = texture2D(tDiffuse, vUv);
        vec4 m = (texture2D(tDiffuse, vUv + vec2(uPx.x, 0.)) + texture2D(tDiffuse, vUv - vec2(uPx.x, 0.)) +
                  texture2D(tDiffuse, vUv + vec2(0., uPx.y)) + texture2D(tDiffuse, vUv - vec2(0., uPx.y))) * 0.25;
        vec3 col = mix(c.rgb, m.rgb, uNhoe);
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(l), col, uBaoHoa);
        float n = bam(vUv * 731.0 + uThoi) - 0.5;
        col += n * uNhieu * (1.2 - l);                 // vùng tối nhiễu nhiều hơn – như cảm biến thật
        float r = length(vUv - 0.5) * 1.41;
        col *= 1.0 - uTocGoc * r * r;
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  const canhPhu = new THREE.Scene(); canhPhu.add(quad);
  const camPhu = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    ve(scene, camera, t){
      renderer.setRenderTarget(rt); renderer.render(scene, camera);
      renderer.setRenderTarget(null); mat.uniforms.uThoi.value = t % 100; renderer.render(canhPhu, camPhu);
    },
    tat(){ /* để tắt hậu kỳ khi soi lỗi */ },
  };
}
