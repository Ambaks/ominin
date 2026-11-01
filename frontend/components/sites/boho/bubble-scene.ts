/*
 * La bulle du haut de page : un dôme de verre calculé, pas une image. WebGL ne
 * peut pas réfracter le DOM, alors la scène se redessine d'abord elle-même sur
 * un canevas 2D (la nuit, les dômes de l'affiche, le titre aux mêmes pixels que
 * le vrai <h1>), et le verre réfracte cette texture : les lettres se courbent
 * pour de bon en passant derrière. Chargé à part, seulement si WebGL répond.
 */

const BUBBLE = {
  maxPixelRatio: 1.5,
  /** La scène réfractée, plus fine que le rendu : les lettres restent nettes dans le verre. */
  maxTexturePixelRatio: 2,
  /** Sous cette cadence, la scène se recalcule une fois plus petit. */
  slowFrameMs: 30,
  slowFrameCount: 45,
  slowScale: 0.7,
  /** Le ressort qui suit le pointeur et fait trembler le verre. */
  stiffness: 26,
  damping: 7,
  pointerReach: 46,
  scrollDrift: 0.16,
  sky: ["#080b18", "#0d1426"],
  gold: ["#ffe2a0", "#f2b64f", "#c98a2b"],
};

const VERTEX = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

const FRAGMENT = `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec3 uS[3];
uniform float uT;
uniform float uScale;
uniform float uWob;
const vec3 GOLD=vec3(1.,.74,.36);

vec3 scene(vec2 p){return texture2D(uTex,clamp(p/uRes,0.,1.)).rgb;}

// Les nervures du dôme et leurs guirlandes, comme sur l'affiche.
vec3 ribs(vec3 n,float strength){
  float cy=cos(uT*.07),sy=sin(uT*.07);
  vec3 r=vec3(cy*n.x+sy*n.z,n.y,-sy*n.x+cy*n.z);
  float t=.42,ct=cos(t),st=sin(t);
  r=vec3(r.x,ct*r.y-st*r.z,st*r.y+ct*r.z);
  float lat=asin(clamp(r.y,-1.,1.));
  float lon=atan(r.x,r.z);
  float m=7.;
  float c=fract(lon*m/6.2832)-.5;
  float dLon=abs(c)*6.2832/m*cos(lat);
  float rib=smoothstep(.016,.004,dLon)*.5;
  float k=fract(lat*17./3.1416)-.5;
  float dLat=abs(k)*3.1416/17.;
  float id=floor(lat*17./3.1416)+floor(lon*m/6.2832)*7.;
  float tw=.65+.35*sin(uT*1.6+id*2.4);
  float bulb=exp(-(dLon*dLon+dLat*dLat)/.00028)*1.5*tw;
  return (GOLD*rib*.55+vec3(1.,.86,.58)*bulb)*strength;
}

vec3 bubble(vec3 col,vec2 p,vec3 s,float lit){
  if(s.z<1.)return col;
  vec2 d=(p-s.xy)/s.z;
  float a=atan(d.y,d.x);
  float w=uWob*(sin(a*3.+uT*5.)*.5+sin(a*2.-uT*3.)*.5)+.006*sin(a*2.+uT*.8);
  float l=length(d)/(1.+w);
  if(l>1.){return col+GOLD*exp(-(l-1.)*5.)*.1*step(l,2.2);}
  d/=(1.+w);
  float rr=min(dot(d,d),1.);
  float z=sqrt(1.-rr);
  vec3 n=vec3(d,z);
  n.xy+=.012*vec2(sin(d.y*9.+uT*1.1),cos(d.x*8.-uT*.9));
  n=normalize(n);
  float rim=pow(l,6.);
  float m=.76+1.05*rim;
  float ca=.012+.05*rim;
  vec3 refr=vec3(
    scene(s.xy+d*s.z*m*(1.-ca)).r,
    scene(s.xy+d*s.z*m).g,
    scene(s.xy+d*s.z*m*(1.+ca)).b);
  float F=pow(1.-z,2.6);
  vec3 c=refr*(1.05+.12*z);
  c+=GOLD*F*.62;
  c+=vec3(.55,.68,1.)*pow(max(dot(n,normalize(vec3(.7,-.5,.45))),0.),5.)*.09;
  float win=pow(max(dot(n,normalize(vec3(-.48,-.62,.62))),0.),16.);
  c+=vec3(1.,.97,.9)*win*.26;
  c+=vec3(1.)*pow(max(dot(n,normalize(vec3(-.42,-.56,.71))),0.),260.)*1.6;
  c+=GOLD*pow(max(dot(n,normalize(vec3(.28,.86,.42))),0.),9.)*.42;
  if(lit>0.){
    c+=ribs(n,lit);
    c+=ribs(vec3(n.xy,-n.z),lit*.3);
  }
  float aa=smoothstep(1.,1.-2.2/s.z,l);
  return mix(col,c,aa);
}

void main(){
  vec2 p=gl_FragCoord.xy/uScale;
  p.y=uRes.y-p.y;
  vec3 c=scene(p);
  c=bubble(c,p,uS[1],0.);
  c=bubble(c,p,uS[2],0.);
  c=bubble(c,p,uS[0],1.);
  gl_FragColor=vec4(c,1.);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

/** Les halos lointains du jardin : toujours les mêmes, quelle que soit la largeur. */
const HALOS = [
  [0.06, 0.2, 0.05], [0.14, 0.42, 0.03], [0.24, 0.12, 0.022], [0.37, 0.34, 0.018], [0.52, 0.08, 0.02],
  [0.68, 0.17, 0.03], [0.8, 0.36, 0.024], [0.93, 0.13, 0.055], [0.97, 0.44, 0.03], [0.03, 0.52, 0.03],
];

function drawScene(
  target: HTMLCanvasElement,
  hero: HTMLElement,
  photo: HTMLImageElement,
  focusX: number,
  bandBottom: number,
  width: number,
  height: number,
  scale: number,
) {
  const ctx = target.getContext("2d");
  if (!ctx) return;
  target.width = Math.round(width * scale);
  target.height = Math.round(height * scale);
  ctx.scale(scale, scale);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, BUBBLE.sky[0]);
  sky.addColorStop(1, BUBBLE.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const unit = Math.max(width, height);
  for (const [x, y, r] of HALOS) {
    const glow = ctx.createRadialGradient(x * width, y * height, 0, x * width, y * height, r * unit);
    glow.addColorStop(0, "rgb(242 182 79 / 0.34)");
    glow.addColorStop(1, "rgb(242 182 79 / 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  // Les dômes en bas de scène, sur leur propre calque : leur haut s'efface pour
  // de bon (le texte et le prix de l'affiche restent hors champ), sans couture.
  const bandHeight = Math.max(height * (width < 700 ? 0.58 : 0.62), (width * photo.height) / photo.width);
  const bandWidth = (bandHeight * photo.width) / photo.height;
  const bandTop = bandBottom - bandHeight;
  const bandLeft = Math.min(0, Math.max(width - bandWidth, width / 2 - bandWidth * focusX));
  const layer = document.createElement("canvas");
  layer.width = target.width;
  layer.height = target.height;
  const band = layer.getContext("2d");
  if (band) {
    band.scale(scale, scale);
    band.drawImage(photo, bandLeft, bandTop, bandWidth, bandHeight);
    band.fillStyle = "rgb(8 11 24 / 0.16)";
    band.fillRect(0, 0, width, height);
    band.globalCompositeOperation = "destination-in";
    const fade = band.createLinearGradient(0, bandTop, 0, bandTop + bandHeight);
    fade.addColorStop(0, "rgb(0 0 0 / 0)");
    fade.addColorStop(0.24, "rgb(0 0 0 / 0)");
    fade.addColorStop(0.52, "rgb(0 0 0 / 1)");
    fade.addColorStop(bandBottom < height ? 0.9 : 1, "rgb(0 0 0 / 1)");
    fade.addColorStop(1, bandBottom < height ? "rgb(0 0 0 / 0)" : "rgb(0 0 0 / 1)");
    band.fillStyle = fade;
    band.fillRect(0, 0, width, height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, 0, 0);
    ctx.scale(scale, scale);
    // Safari libère ses canevas tard : on rend la mémoire tout de suite.
    layer.width = layer.height = 0;
  }

  const origin = hero.getBoundingClientRect();
  for (const element of hero.querySelectorAll<HTMLElement>("[data-refract]")) {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    const text = element.textContent ?? "";
    const size = parseFloat(style.fontSize);
    const spacing = parseFloat(style.letterSpacing) || 0;
    ctx.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
    ctx.textBaseline = "alphabetic";
    const metrics = ctx.measureText(text);
    const chars = [...text];
    const total = chars.reduce((sum, char) => sum + ctx.measureText(char).width + spacing, 0);
    const top = box.top - origin.top;
    const baseline = top + (box.height + metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2;
    const ink = ctx.createLinearGradient(0, top, 0, top + box.height);
    ink.addColorStop(0, BUBBLE.gold[0]);
    ink.addColorStop(0.55, BUBBLE.gold[1]);
    ink.addColorStop(1, BUBBLE.gold[2]);
    ctx.fillStyle = ink;
    if (spacing) {
      let x = box.left - origin.left + (box.width - total) / 2;
      for (const char of chars) {
        ctx.fillText(char, x, baseline);
        x += ctx.measureText(char).width + spacing;
      }
    } else {
      ctx.fillText(text, box.left - origin.left + (box.width - metrics.width) / 2, baseline);
    }
  }
}

/** Démarre la scène ; renvoie de quoi l'arrêter, ou null si le navigateur n'en est pas capable. */
export async function startBubbleScene({
  canvas,
  hero,
  title,
  photo,
  still,
  onLost,
}: {
  canvas: HTMLCanvasElement;
  hero: HTMLElement;
  title: HTMLElement;
  /** La photo déjà chargée par la page : pas de second téléchargement. */
  photo: HTMLImageElement;
  /** Mouvement réduit : une seule image, la bulle à sa place. */
  still: boolean;
  onLost: () => void;
}) {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "default" });
  if (!gl) return null;
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  await Promise.all([
    photo.decode(),
    ...[...hero.querySelectorAll<HTMLElement>("[data-refract]")].map((element) => {
      const style = getComputedStyle(element);
      return document.fonts.load(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, element.textContent ?? "");
    }),
  ]);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const attribute = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(attribute);
  gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const uRes = uniform("uRes");
  const uS = uniform("uS");
  const uT = uniform("uT");
  const uScale = uniform("uScale");
  const uWob = uniform("uWob");

  const offscreen = document.createElement("canvas");
  let width = 0;
  let height = 0;
  let scale = Math.min(window.devicePixelRatio || 1, BUBBLE.maxPixelRatio);
  let anchor = { x: 0, y: 0, r: 0 };

  const layout = () => {
    const box = hero.getBoundingClientRect();
    width = box.width;
    height = box.height;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const narrow = width < 700;
    // Sur téléphone, le panneau couvre le bas : les dômes remontent pour paraître au-dessus.
    const panel = hero.querySelector<HTMLElement>(".bo-hero-panel")?.getBoundingClientRect();
    const bandBottom = narrow && panel ? Math.min(height, panel.top - box.top + panel.height * 0.5) : height;
    const textureScale = Math.min(window.devicePixelRatio || 1, BUBBLE.maxTexturePixelRatio);
    drawScene(offscreen, hero, photo, narrow ? 0.27 : 0.4, bandBottom, width, height, textureScale);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, offscreen);
    gl.uniform2f(uRes, width, height);
    gl.uniform1f(uScale, scale);
    const lettering = title.getBoundingClientRect();
    const r = narrow ? Math.min(width * 0.34, height * 0.18) : Math.min(height * 0.3, width * 0.2);
    anchor = {
      x: width * (narrow ? 0.58 : 0.64),
      y: lettering.bottom - hero.getBoundingClientRect().top + r * (narrow ? 0.8 : 0.42),
      r,
    };
  };
  layout();

  const pointer = { x: 0, y: 0 };
  const position = { x: anchor.x, y: anchor.y, vx: 0, vy: 0 };
  // La bulle se gonfle à l'ouverture, avec le même ressort, en mouvement seulement.
  const swell = { value: still ? 1 : 0, velocity: 0 };
  let last = performance.now();
  const start = last;
  let frame = 0;
  let running = false;
  let slowFrames = 0;
  let scaledDown = false;
  let lost = false;

  const draw = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    const elapsed = dt * 1000;
    last = now;
    const t = (now - start) / 1000;
    const drift = window.scrollY * BUBBLE.scrollDrift;

    const targetX = anchor.x + pointer.x * BUBBLE.pointerReach + Math.sin(t * 0.32) * anchor.r * 0.05;
    const targetY = anchor.y + pointer.y * BUBBLE.pointerReach + Math.cos(t * 0.41) * anchor.r * 0.04 - drift;
    position.vx += ((targetX - position.x) * BUBBLE.stiffness - position.vx * BUBBLE.damping) * dt;
    position.vy += ((targetY - position.y) * BUBBLE.stiffness - position.vy * BUBBLE.damping) * dt;
    position.x += position.vx * dt;
    position.y += position.vy * dt;
    swell.velocity += ((1 - swell.value) * 40 - swell.velocity * 6.5) * dt;
    swell.value += swell.velocity * dt;

    const r = anchor.r * Math.max(swell.value, 0);
    const speed = Math.hypot(position.vx, position.vy) / Math.max(anchor.r, 1);
    gl.uniform3fv(uS, [
      position.x, position.y, r,
      anchor.x - width * 0.34 + Math.sin(t * 0.5) * 8 + (position.x - anchor.x) * 0.3,
      anchor.y + anchor.r * 0.62 + Math.cos(t * 0.44) * 10 - drift * 0.6,
      r * 0.2,
      anchor.x + anchor.r * 1.24 + Math.cos(t * 0.37) * 7 + (position.x - anchor.x) * 0.5,
      anchor.y + anchor.r * 0.28 + Math.sin(t * 0.52) * 9 - drift * 1.3,
      r * 0.13,
    ]);
    gl.uniform1f(uT, t);
    gl.uniform1f(uWob, Math.min(speed * 0.022 + Math.abs(swell.velocity) * 0.012, 0.06));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!scaledDown && !still && t > 1) {
      slowFrames = elapsed > BUBBLE.slowFrameMs ? slowFrames + 1 : 0;
      if (slowFrames >= BUBBLE.slowFrameCount) {
        scaledDown = true;
        scale *= BUBBLE.slowScale;
        layout();
      }
    }
    if (running) frame = requestAnimationFrame(draw);
  };

  const play = () => {
    if (lost || running || still) return;
    running = true;
    last = performance.now();
    frame = requestAnimationFrame(draw);
  };
  const pause = () => {
    running = false;
    cancelAnimationFrame(frame);
  };

  let onScreen = true;
  const observer = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen && !document.hidden) play();
    else pause();
  });
  observer.observe(hero);

  const onVisibility = () => {
    if (document.hidden) pause();
    else if (onScreen) play();
  };
  const onPointer = (event: PointerEvent) => {
    pointer.x = event.clientX / window.innerWidth - 0.5;
    pointer.y = event.clientY / window.innerHeight - 0.5;
  };
  let resizeTimer: ReturnType<typeof setTimeout>;
  const resized = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (lost) return;
      layout();
      if (still) {
        position.x = anchor.x;
        position.y = anchor.y;
        draw(performance.now());
      }
    }, 150);
  });
  resized.observe(hero);
  const onContextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    pause();
    onLost();
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pointermove", onPointer, { passive: true });
  canvas.addEventListener("webglcontextlost", onContextLost);

  // Une image dessinée avant de se montrer : le titre ne s'efface jamais sur du vide.
  draw(performance.now());
  play();

  return () => {
    pause();
    clearTimeout(resizeTimer);
    observer.disconnect();
    resized.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pointermove", onPointer);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    offscreen.width = offscreen.height = 0;
  };
}
