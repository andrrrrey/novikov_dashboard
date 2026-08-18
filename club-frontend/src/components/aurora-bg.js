/**
 * AuroraBackground — бесшовно зацикленный фон (WebGL).
 * Настройки запечены из генератора. Луп точный: все временные члены —
 * целые кратные одной фазы, кадр t=period совпадает с t=0.
 *
 *   import AuroraBackground from './aurora-bg.js';
 *   const bg = new AuroraBackground(document.querySelector('#bg'));
 *   // bg.destroy() при размонтировании
 */

const CONFIG = {
  period: 24,
  scale: 1.35,
  intensity: 1,
  bottomFade: 0.55,
  detail: 0.7,
  filaments: 0.6,
  phaseOffset: 0.000,
  fps: 30,
  maxDPR: 1.5,
  bg: '#080a09',
  deep: '#16382f',
  peak: '#54bca7',
};

const VERT = `attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos,0.,1.); }`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_phase, u_scale, u_intensity, u_bottomFade, u_detail, u_fil;
uniform vec3 u_bg, u_deep, u_peak;
float ribbon(float d, float w){ return exp(-(d*d)/w); }
void main(){
  vec2 uv = (gl_FragCoord.xy - .5*u_res)/u_res.y;
  float a = u_phase;
  vec2 p = uv*u_scale;
  p += .30*vec2(sin(p.y*2.1+a),  cos(p.x*1.7-a));
  p += .16*vec2(sin(p.y*3.9-2.*a), cos(p.x*3.1+2.*a));
  p += u_detail*.07*vec2(sin(p.y*7.3+3.*a), cos(p.x*6.1-3.*a));
  float d1 = p.y*1.15 + .45*sin(p.x*1.6+a) + .25*sin(p.x*.9-2.*a) - .12;
  float d2 = p.y*1.60 + .60*sin(p.x*1.15-2.*a) + .34;
  float d3 = p.x*1.10 + .70*sin(p.y*1.30+3.*a) + .50;
  float g = 0.;
  g += .62*ribbon(d1, .085);
  g += .34*ribbon(d2, .170);
  g += .26*ribbon(d3, .230);
  g += u_fil*( .30*ribbon(d1-.060, .0045)
             + .22*ribbon(d1+.095, .0060)
             + .18*ribbon(d2-.050, .0050)
             + .15*ribbon(d2+.120, .0080)
             + .14*ribbon(d3+.070, .0060) );
  float th = 1. + u_detail*( .20*sin(p.x*9. + p.y*4. - 2.*a)
                           + .11*sin(p.x*17. - p.y*7. + 4.*a)
                           + .06*sin(p.x*29. + p.y*13. - 5.*a) );
  g *= th;
  g *= u_intensity;
  g *= mix(1., smoothstep(-.95,.10,uv.y), u_bottomFade);
  vec3 col = u_bg;
  col = mix(col, u_deep, smoothstep(.00,.55,g));
  col = mix(col, u_peak, smoothstep(.45,1.25,g));
  float d = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233)))*43758.5453);
  gl_FragColor = vec4(col + (d-.5)/255., 1.);
}
`;

const hexToRgb = (hex) => {
  const n = parseInt(hex.replace('#',''), 16);
  return [(n>>16&255)/255, (n>>8&255)/255, (n&255)/255];
};

export default class AuroraBackground {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.opts = { ...CONFIG, ...options };
    this.running = false;
    this.raf = 0;
    this.lastDraw = -Infinity;
    this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    this._onVisibility = () => (document.hidden ? this._pause() : this._resume());
    this._onLost = (e) => { e.preventDefault(); this._pause(); };
    this._onRestored = () => { this._initGL(); this._resize(); this._resume(); };
    this._onMotionChange = () => this._resume();

    if (!this._initGL()) return;
    this.ro = new ResizeObserver(() => this._resize());
    this.ro.observe(canvas);
    this._resize();
    document.addEventListener('visibilitychange', this._onVisibility);
    canvas.addEventListener('webglcontextlost', this._onLost);
    canvas.addEventListener('webglcontextrestored', this._onRestored);
    this.reduced?.addEventListener?.('change', this._onMotionChange);
    this._resume();
  }

  _initGL() {
    const gl = this.canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false,
      powerPreference: 'low-power', preserveDrawingBuffer: false,
    });
    if (!gl) { this.canvas.style.background = this.opts.bg; return false; }
    this.gl = gl;
    const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); return sh; };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { this.canvas.style.background = this.opts.bg; return false; }
    gl.useProgram(p);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    for (const n of ['u_res','u_phase','u_scale','u_intensity','u_bottomFade','u_detail','u_fil','u_bg','u_deep','u_peak'])
      this.u[n] = gl.getUniformLocation(p, n);
    const o = this.opts;
    gl.uniform1f(this.u.u_scale, o.scale);
    gl.uniform1f(this.u.u_intensity, o.intensity);
    gl.uniform1f(this.u.u_bottomFade, o.bottomFade);
    gl.uniform1f(this.u.u_detail, o.detail);
    gl.uniform1f(this.u.u_fil, o.filaments);
    gl.uniform3fv(this.u.u_bg, hexToRgb(o.bg));
    gl.uniform3fv(this.u.u_deep, hexToRgb(o.deep));
    gl.uniform3fv(this.u.u_peak, hexToRgb(o.peak));
    return true;
  }

  _resize() {
    const { gl, canvas } = this;
    if (!gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDPR);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(this.u.u_res, w, h);
    this._draw(this._phase());
  }

  _phase() {
    const t = (performance.now() / 1000) % this.opts.period;
    return (t / this.opts.period + this.opts.phaseOffset) * Math.PI * 2;
  }

  _draw(phase) {
    const { gl } = this;
    if (!gl || gl.isContextLost()) return;
    gl.uniform1f(this.u.u_phase, phase);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  _tick = (now) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this._tick);
    if (now - this.lastDraw < 1000 / this.opts.fps) return;
    this.lastDraw = now;
    this._draw(this._phase());
  };

  _resume() {
    if (!this.gl) return;
    if (this.reduced?.matches) { this._pause(); this._draw(this.opts.phaseOffset * Math.PI * 2); return; }
    if (this.running) return;
    this.running = true;
    this.lastDraw = -Infinity;
    this.raf = requestAnimationFrame(this._tick);
  }

  _pause() { this.running = false; cancelAnimationFrame(this.raf); }

  destroy() {
    this._pause();
    this.ro?.disconnect();
    document.removeEventListener('visibilitychange', this._onVisibility);
    this.canvas.removeEventListener('webglcontextlost', this._onLost);
    this.canvas.removeEventListener('webglcontextrestored', this._onRestored);
    this.reduced?.removeEventListener?.('change', this._onMotionChange);
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl = null;
  }
}
