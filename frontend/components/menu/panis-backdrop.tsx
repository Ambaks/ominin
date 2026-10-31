"use client";

import { useEffect, useRef } from "react";
import "./panis-backdrop.css";
import { veloursPalettes, type VeloursPalette } from "./velours-palettes";

/*
 * Le velours : un satin animé sous toute la carte (menu QR et aperçu, voir
 * hasVelours), aux teintes de l'établissement (velours-palettes.ts). Un
 * canevas WebGL fixe, sous les fiches ; sans WebGL utilisable, la teinte du
 * satin à plat.
 */

const VERT = "attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.,1.);}";

/* Les plis sont des houles longues et obliques, étirées le long du pli,
   qu'un bruit lent à trois octaves fait onduler ; une légère courbure les
   drape. La pente vient des dérivées exactes des sinus : des plis lisses, un
   creux sombre contre une crête nette, qui se lit même dans la gouttière
   d'un téléphone. La lumière dérive lentement et suit le défilement : l'éclat
   glisse sur le tissu au lieu de voyager avec lui. Atténué en haut de page,
   sous le mot-symbole. Un grain de tissu fixe, un dither triangulaire
   contre les aplats en escalier, une vignette pour creuser les bords. Au
   téléphone, où le satin ne se voit qu'entre les fiches, des plis plus serrés
   et une teinte plus claire : chaque gouttière montre une crête et un creux. */
const velours = ({ deep, mid, sheen }: VeloursPalette) => `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uScroll;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm3(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes.y;
  float aspect=uRes.x/uRes.y;
  float portrait=1.-smoothstep(.6,1.,aspect);
  float t=uTime*mix(.3,.45,portrait);
  float freq=mix(3.6,7.,portrait)+1.2*clamp(aspect-1.,0.,1.);
  float ang=.64+.36*portrait;
  vec2 p=mat2(cos(ang),sin(ang),-sin(ang),cos(ang))*(uv*freq+vec2(0.,-uScroll*.2*freq));
  vec2 w=vec2(fbm3(p*.45+vec2(t*.3,0.)),fbm3(p*.45+vec2(3.1,-t*.24)))-.5;
  vec2 q=p+w*(1.6+.35*sin(t*.6));
  float stretch=mix(.38,.75,portrait);
  q.x=q.x*stretch+.15*sin(q.y*.8);
  float a1=dot(q,vec2(1.2,3.1))+t;
  float a2=dot(q,vec2(-1.9,2.2))-t*.7+1.3;
  float a3=dot(q,vec2(.6,5.3))+t*1.3;
  float k3=mix(.12,.2,portrait);
  float h=.55*sin(a1)+.35*sin(a2)+k3*sin(a3);
  vec2 g=.55*cos(a1)*vec2(1.2,3.1)+.35*cos(a2)*vec2(-1.9,2.2)+k3*cos(a3)*vec2(.6,5.3);
  g.x*=stretch;
  vec3 n=normalize(vec3(-g*.8,1.));
  vec3 l=normalize(vec3(-.3+.25*sin(uScroll*1.7)+.3*sin(uTime*.07),.75+.12*sin(uTime*.037+1.),.6));
  float diff=clamp(dot(n,l),0.,1.);
  float d=clamp(dot(n,normalize(l+vec3(0.,0.,1.))),0.,1.);
  vec3 deep=mix(vec3(${deep[0]}),vec3(${deep[1]}),portrait);
  vec3 mid=mix(vec3(${mid[0]}),vec3(${mid[1]}),portrait);
  vec3 col=mix(deep,mid,smoothstep(.25,.8,diff))*(mix(.8,.88,portrait)+mix(.2,.12,portrait)*smoothstep(-.5,.6,h));
  float hero=1.-.3*(1.-clamp(uScroll*2.5,0.,1.))*smoothstep(.55,.85,gl_FragCoord.y/uRes.y);
  float d8=d*d;d8*=d8;d8*=d8;
  float d40=d8*d8;d40*=d40*d8;
  float sheen=(d40*.2+d40*d40*d40*.22+d8*.02)*(.7+.3*sin(uTime*.2+h*2.));
  col+=vec3(${sheen})*sheen*hero;
  vec2 c=gl_FragCoord.xy/uRes-.5;
  col*=1.-mix(.15,.08,portrait)*dot(c,c);
  col+=(ign(gl_FragCoord.xy*.7)-.5)*.012;
  col+=(ign(gl_FragCoord.xy)+ign(gl_FragCoord.xy+vec2(47.,17.))-1.)*1.5/255.;
  gl_FragColor=vec4(col,1.);
}`;

/** Une échelle de rendu par budget de pixels : nette au téléphone, raisonnable au bureau. */
const renderScale = (width: number, height: number) =>
  Math.min(1, Math.max(0.5, Math.sqrt(400_000 / (width * height))));

/* Un canevas neuf à chaque montage : le contexte perdu au démontage ne se
   réutilise pas. Rendu à 24 images par seconde au repos, à 60 pendant un
   défilement, pour que le satin suive la carte sans à-coups. Un rendu
   logiciel ou sans précision haute garde la teinte à plat. */
export function startVelours(host: HTMLElement, palette: VeloursPalette) {
  const canvas = host.appendChild(document.createElement("canvas"));
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
    failIfMajorPerformanceCaveat: true,
  });
  const abandon = () => {
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    canvas.remove();
    return () => {};
  };
  if (!gl || !gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision) return abandon();

  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const born = performance.now();
  let uRes: WebGLUniformLocation | null = null;
  let uTime: WebGLUniformLocation | null = null;
  let uScroll: WebGLUniformLocation | null = null;
  // Le calque prend la plus grande hauteur d'écran (100lvh) : au téléphone,
  // ni la barre d'adresse ni le clavier ne le redimensionnent.
  let width = 0;
  let height = host.clientHeight || innerHeight;
  let scaleCap = 1;
  let scroll = scrollY / height;

  const draw = (now: number) => {
    gl.uniform1f(uTime, (now - born) / 1000);
    gl.uniform1f(uScroll, motion.matches ? 0 : scroll);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const allocate = () => {
    width = host.clientWidth;
    height = host.clientHeight || innerHeight;
    const scale = Math.min(scaleCap, renderScale(width, height));
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  /* Compile et lie le programme ; faux s'il échoue. */
  const build = () => {
    const program = gl.createProgram();
    for (const [type, source] of [
      [gl.VERTEX_SHADER, VERT],
      [gl.FRAGMENT_SHADER, velours(palette)],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) return false;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (process.env.NODE_ENV !== "production" && !gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
      }
      gl.attachShader(program, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return false;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    uRes = gl.getUniformLocation(program, "uRes");
    uTime = gl.getUniformLocation(program, "uTime");
    uScroll = gl.getUniformLocation(program, "uScroll");
    allocate();
    draw(performance.now());
    return true;
  };

  let pending = 0;
  const resize = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      if (host.clientWidth === width && host.clientHeight === height) return;
      allocate();
      draw(performance.now());
    });
  };

  /* Le régulateur. La période de l'écran est le plus court écart observé
     entre deux appels de rAF ; une image au repos tombe donc sur un multiple
     connu de cette période. Après les premières secondes (hydratation,
     décodage des photos), deux fenêtres de 30 images au repos de suite en
     retard de 50 % sur ce multiple baissent l'échelle d'un cran, sans jamais
     la remonter : un téléphone qui peine reste au cran qui lui va. */
  let frame = 0;
  let last = 0;
  let tick = 0;
  let period = Infinity;
  let ticks = 0;
  let late = 0;
  let count = 0;
  let strikes = 0;
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    // Au retour d'un onglet caché, l'écart ne dit rien de l'appareil.
    if (tick && now - tick < 1000) period = Math.min(period, now - tick);
    tick = now;
    ticks++;
    const target = scrollY / height;
    const moving = Math.abs(target - scroll) > 0.002;
    const step = moving ? 1000 / 60 : 1000 / 24;
    // Une marge de 4 ms : l'horodatage de rAF tremble autour de chaque pas.
    if (now - last < step - 4) return;
    if (!moving && last && now - last < 1000 && ticks > 120) {
      late += (now - last) / (Math.ceil((step - 4) / period) * period);
      if (++count === 30) {
        strikes = late / count > 1.5 ? strikes + 1 : 0;
        late = 0;
        count = 0;
        if (strikes === 2 && scaleCap > 0.5) {
          scaleCap = Math.max(0.5, Math.min(scaleCap, renderScale(width, height)) - 0.15);
          strikes = 0;
          allocate();
        }
      }
    } else {
      late = 0;
      count = 0;
    }
    scroll += (target - scroll) * (1 - Math.exp(-(now - last) / 90));
    last = now;
    draw(now);
  };
  const start = () => {
    cancelAnimationFrame(frame);
    last = 0;
    if (motion.matches) draw(performance.now());
    else frame = requestAnimationFrame(loop);
  };
  const lost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
  };
  const restored = () => {
    if (build()) start();
  };

  if (!build()) return abandon();
  canvas.addEventListener("webglcontextlost", lost);
  canvas.addEventListener("webglcontextrestored", restored);
  addEventListener("resize", resize);
  motion.addEventListener("change", start);
  start();
  return () => {
    cancelAnimationFrame(frame);
    cancelAnimationFrame(pending);
    removeEventListener("resize", resize);
    motion.removeEventListener("change", start);
    canvas.removeEventListener("webglcontextlost", lost);
    canvas.removeEventListener("webglcontextrestored", restored);
    if (!gl.isContextLost()) gl.getExtension("WEBGL_lose_context")?.loseContext();
    canvas.remove();
  };
}

export function PanisBackdrop({ slug }: { slug: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const palette = veloursPalettes[slug];
  useEffect(() => (ref.current ? startVelours(ref.current, palette) : undefined), [palette]);
  return <div ref={ref} className="panis-backdrop" style={{ background: palette.flat }} aria-hidden="true" />;
}
