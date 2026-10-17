/*
 * Le trou noir du panier : un petit canevas WebGL2 posé sur le compteur de la
 * barre de commande. Chaque pixel lance un photon dans la métrique de
 * Schwarzschild (géodésique intégrée pas à pas, rayon de Schwarzschild = 1) :
 * ombre, anneau de photons, disque d'accrétion à effet Doppler et l'image du
 * dos du disque relevée au-dessus de l'ombre, comme sur Gargantua.
 */

/** Réglages : valeurs nommées, à valider (voir la passation). */
export const BLACK_HOLE = {
  steps: { mobile: 90, desktop: 120 },
  dprCap: { mobile: 1.25, desktop: 2 },
  /* Distance de la caméra (rayons de Schwarzschild) : panier vide → plein. */
  distance: [19, 15],
  /* Nombre d'articles à partir duquel le trou noir a sa taille maximale. */
  fullAt: 10,
  pulseSeconds: 1.1,
} as const;

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uPhase;
uniform float uDist;
uniform float uPulse;
out vec4 outColor;

float hash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}

vec3 sky(vec3 d) {
  vec3 q = d * 70.0;
  vec3 c = floor(q);
  float h = hash(c);
  vec3 f = fract(q) - 0.5;
  float s = step(0.96, h) * exp(-dot(f, f) * 30.0) * (0.5 + 2.5 * fract(h * 37.0));
  return vec3(0.85, 0.9, 1.0) * s + vec3(0.02, 0.015, 0.045);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * min(uRes.x, uRes.y));
  /* Bord du canevas fondu : le disque ne s'arrête jamais net. */
  float fadeEdge = smoothstep(1.0, 0.78, length(uv));
  if (fadeEdge <= 0.0) {
    outColor = vec4(0.0);
    return;
  }
  float roll = -0.16;
  uv = mat2(cos(roll), -sin(roll), sin(roll), cos(roll)) * uv;

  float incl = radians(7.0);
  vec3 ro = vec3(0.0, sin(incl), -cos(incl)) * uDist;
  vec3 fwd = normalize(-ro);
  vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, fwd);
  vec3 v = normalize(fwd * 1.3 + right * uv.x + up * uv.y);
  vec3 p = ro;
  vec3 hv = cross(p, v);
  float h2 = dot(hv, hv);

  vec3 col = vec3(0.0);
  float alpha = 0.0;
  float minR = 1e9;
  bool captured = false;
  float glow = 1.0 + uPulse * 2.6;

  for (int i = 0; i < MARCH_STEPS; i++) {
    float r2 = dot(p, p);
    float r = sqrt(r2);
    minR = min(minR, r);
    if (r < 1.0) { captured = true; break; }
    float dt = clamp(0.07 * r, 0.025, 0.9);
    v += -1.5 * h2 * p / (r2 * r2 * r) * dt;
    vec3 pn = p + v * dt;
    if (p.y * pn.y < 0.0) {
      vec3 hit = mix(p, pn, p.y / (p.y - pn.y));
      float hr = length(hit.xz);
      if (hr > 2.9 && hr < 10.0) {
        float omega = 2.2 * pow(hr, -1.5);
        float a = atan(hit.z, hit.x) + uPhase * omega;
        vec3 q = vec3(cos(a) * hr, sin(a) * hr, hr * 0.6);
        float swirl = vnoise(q * 1.3) * 0.6 + vnoise(q * 3.7) * 0.4;
        float t = clamp((hr - 2.9) / 7.1, 0.0, 1.0);
        float heat = pow(1.0 - t, 1.6);
        /* Disque néon : rose au large, blanc-cyan au ras de l'horizon. */
        vec3 tone = mix(vec3(1.0, 0.16, 0.46), vec3(0.75, 0.97, 1.0), heat);
        float beta = sqrt(0.5 / hr);
        vec3 orbit = normalize(vec3(-hit.z, 0.0, hit.x));
        float cosA = dot(orbit, -normalize(v));
        float g = sqrt(1.0 - beta * beta) / (1.0 - beta * cosA);
        float edge = smoothstep(2.9, 3.4, hr) * smoothstep(10.0, 6.5, hr);
        float intensity = (0.35 + 1.1 * swirl) * (0.4 + 1.2 * heat) * g * g * g;
        float da = clamp(edge * (0.55 + 0.45 * swirl), 0.0, 1.0);
        col += (1.0 - alpha) * tone * intensity * edge * glow * 1.9;
        alpha += (1.0 - alpha) * da;
      }
    }
    p = pn;
    if (r > 40.0 && dot(p, v) > 0.0) break;
  }

  float window = smoothstep(1.0, 0.45, length(uv));
  if (captured) {
    alpha = 1.0;
  } else {
    col += (1.0 - alpha) * sky(normalize(v)) * window;
    float ring = exp(-max(minR - 1.5, 0.0) * 14.0) * smoothstep(3.0, 1.5, minR);
    col += vec3(0.4, 0.9, 1.0) * ring * 0.9 * glow;
    alpha += (1.0 - alpha) * window * 0.88;
  }
  alpha *= fadeEdge;
  outColor = vec4(col * alpha, alpha);
}
`;

export interface BlackHole {
  setCount(count: number): void;
  pulse(): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
  }
  return shader;
}

export function createBlackHole(
  canvas: HTMLCanvasElement,
  { reducedMotion, mobile, onLost }: { reducedMotion: boolean; mobile: boolean; onLost: () => void }
): BlackHole | null {
  const tier = mobile ? "mobile" : "desktop";
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;

  /* Shader refusé : le contexte est rendu, la pastille d'origine reste. */
  const program = gl.createProgram()!;
  try {
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(
      program,
      compile(gl, gl.FRAGMENT_SHADER, FRAG.replace("precision highp float;", `precision highp float;\n#define MARCH_STEPS ${BLACK_HOLE.steps[tier]}`)),
    );
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link");
  } catch (error) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    throw error;
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, "uRes");
  const uPhase = gl.getUniformLocation(program, "uPhase");
  const uDist = gl.getUniformLocation(program, "uDist");
  const uPulse = gl.getUniformLocation(program, "uPulse");

  let distance: number = BLACK_HOLE.distance[0];
  let targetDistance = distance;
  let pulse = 0;
  let phase = 0;
  let raf = 0;
  let paused = false;
  let dirty = true;
  let last = performance.now();

  const resize = () => {
    dirty = true;
    const dpr = Math.min(window.devicePixelRatio || 1, BLACK_HOLE.dprCap[tier]);
    const width = Math.round(canvas.clientWidth * dpr);
    const height = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const draw = (now: number) => {
    const dt = Math.min(Math.max(now - last, 0) / 1000, 0.05);
    last = now;
    distance += (targetDistance - distance) * (1 - Math.exp(-dt / 0.35));
    pulse = Math.max(0, pulse - dt / BLACK_HOLE.pulseSeconds);
    /* Chaque ajout emballe le disque, qui revient à son régime. */
    if (!reducedMotion) phase += dt * (1 + 4 * pulse * pulse);
    raf = requestAnimationFrame(draw);
    /* Moins de mouvement : le disque est figé, on ne redessine qu'au changement. */
    const settled = pulse === 0 && Math.abs(targetDistance - distance) < 0.01;
    if (reducedMotion && settled && !dirty) return;
    dirty = !settled;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uPhase, phase);
    gl.uniform1f(uDist, distance);
    gl.uniform1f(uPulse, pulse * pulse);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const start = () => {
    cancelAnimationFrame(raf);
    last = performance.now();
    raf = requestAnimationFrame(draw);
  };
  const stop = () => cancelAnimationFrame(raf);
  const onVisibility = () => (document.hidden || paused ? stop() : start());
  const onContextLost = (event: Event) => {
    event.preventDefault();
    stop();
    onLost();
  };
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onContextLost);
  start();

  return {
    setCount(count) {
      const k = Math.min(1, Math.log1p(Math.max(count - 1, 0)) / Math.log1p(BLACK_HOLE.fullAt - 1));
      targetDistance = BLACK_HOLE.distance[0] + (BLACK_HOLE.distance[1] - BLACK_HOLE.distance[0]) * k;
    },
    pulse() {
      pulse = 1;
    },
    setPaused(next) {
      paused = next;
      dirty = true;
      onVisibility();
    },
    dispose() {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      observer.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
