/*
 * Shaders du cosmos de L'Étoile (GLSL ES 1.0, RawShaderMaterial).
 * Toutes les couches s'additionnent : aucune n'écrit la profondeur.
 */

const NOISE = /* glsl */ `
float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x),
        mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x),
        mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return s;
}
float fbm3(vec3 p) {
  return 0.5 * vnoise(p) + 0.25 * vnoise(p * 2.03 + vec3(1.7, 9.2, 3.1)) + 0.125 * vnoise(p * 4.1 + vec3(4.4, 2.2, 7.9));
}
`;

/*
 * Étoiles instanciées : chaque instance est un quad étiré entre sa position
 * et sa position « d'avant » (déplacement de la caméra × durée de traînée),
 * ce qui donne la traînée d'hyperespace sans post-traitement. Le quad
 * s'élargit avec la traînée pour loger son halo ; la traînée s'effile et se
 * refroidit de la tête (blanche) à la queue (couleur de l'étoile).
 */
export const STAR_VERT = /* glsl */ `
precision highp float;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec2 uResolution;
uniform vec3 uTrail;
uniform float uDpr;
uniform float uStarPx;
uniform float uRefDist;
uniform float uProj;
uniform float uMaxPx;
uniform float uAlpha;
uniform float uTime;
uniform float uTwinkle;
uniform float uQuadScale;
#ifdef TUNNEL
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamFwd;
uniform float uTravel;
uniform float uTunnelLen;
#endif
attribute vec2 corner;
attribute vec3 iPos;
attribute vec3 iColor;
attribute float iLum;
varying vec3 vColor;
varying vec2 vLocal;
varying float vLen;
varying float vR;
varying float vGain;
/* Largeur du quad d'une traînée longue, en rayons d'étoile : la place du halo. */
const float STREAK_WIDEN = 1.8;
/* Longueur de traînée (px) à partir de laquelle le quad est pleinement élargi. */
const float STREAK_FULL_PX = 60.0;

void main() {
  vec3 wp = iPos;
#ifdef TUNNEL
  float z = mod(iPos.z - uTravel, uTunnelLen);
  wp = uCamPos + uCamRight * iPos.x + uCamUp * iPos.y + uCamFwd * (z + 2.0);
#endif
  vec4 vp = viewMatrix * vec4(wp, 1.0);
  if (vp.z > -0.15) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    return;
  }
  vec4 vt = viewMatrix * vec4(wp + uTrail, 1.0);
  vt.z = min(vt.z, -0.15);
  vec4 cp = projectionMatrix * vp;
  vec4 ct = projectionMatrix * vt;
  vec2 halfRes = 0.5 * uResolution;
  vec2 sp = cp.xy / cp.w * halfRes;
  vec2 st = ct.xy / ct.w * halfRes;
  float dist = -vp.z;

  float r;
  float gain;
#ifdef GAS
  float raw = iLum * uProj / dist;
  r = min(raw, uMaxPx);
  gain = smoothstep(uMaxPx * 1.6, uMaxPx * 0.5, raw);
#else
  float flux = iLum * uRefDist * uRefDist / (dist * dist + uRefDist);
  r = uStarPx * uDpr * clamp(pow(flux, 0.35), 0.5, 3.2);
  gain = clamp(flux, 0.0, 1.8);
  float rMin = 0.85 * uDpr;
  if (r < rMin) {
    gain *= r / rMin;
    r = rMin;
  }
  gain *= 1.0 - uTwinkle * 0.3 * (0.5 + 0.5 * sin(uTime * (1.3 + fract(iLum * 17.0) * 3.0) + iPos.x * 7.0));
#endif
#ifdef TUNNEL
  /* Dans le tunnel, l'éclat fait aussi l'épaisseur : des filaments fins et des fuseaux. */
  r *= 0.55 + iLum * 0.75;
#endif

  vec2 d = sp - st;
  float len = length(d);
  vec2 dir = len > 0.01 ? d / len : vec2(1.0, 0.0);
  len = min(len, uResolution.y * 0.7);
  vec2 n = vec2(-dir.y, dir.x);
  float rq = r * (uQuadScale + (STREAK_WIDEN - 1.0) * min(len / STREAK_FULL_PX, 1.0));
  float along = corner.x > 0.0 ? rq : -(len + rq);
  vec2 px = sp + dir * along + n * corner.y * rq;

  vLocal = vec2(along, corner.y * rq);
  vLen = len;
  vR = r;
  vGain = gain * uAlpha * mix(1.0, r / (r + len * 0.06), 0.6);
  vColor = iColor;
  gl_Position = vec4(px / halfRes * cp.w, cp.z, cp.w);
}
`;

export const STAR_FRAG = /* glsl */ `
precision highp float;
uniform float uQuadScale;
#ifdef TUNNEL
uniform vec3 uTint;
#endif
varying vec3 vColor;
varying vec2 vLocal;
varying float vLen;
varying float vR;
varying float vGain;

void main() {
  float ax = clamp(vLocal.x, -vLen, 0.0);
  /* Position le long de la traînée : 0 à la tête, 1 à la queue. */
  float back = -ax / max(vLen, 0.001);
  float streak = smoothstep(0.5, 3.0, vLen);
  /* Effilée : la queue fait la moitié de la tête. */
  vec2 q = vec2(vLocal.x - ax, vLocal.y / mix(1.0, 0.5, back * streak)) / vR;
  float d2 = dot(q, q);
#ifdef GAS
  float a = exp(-d2 * 3.2) * (1.0 - smoothstep(0.5, 1.0, d2));
#else
  /* Cœur net et halo large ; le halo n'existe que sur les traînées. */
  float a = exp(-d2 * 4.0) + exp(-sqrt(d2) * 3.2) * 0.16 + exp(-d2 * 0.55) * 0.22 * streak;
#endif
  vec3 color = vColor;
#ifdef TUNNEL
  color = mix(color, uTint, back * 0.8);
#endif
#ifdef SPIKES
  /* Pointes de diffraction (6), comme l'étoile du héros. */
  float s = 0.0;
  for (int i = 0; i < 3; i++) {
    float ang = 1.5708 + float(i) * 1.0472;
    vec2 dir = vec2(cos(ang), sin(ang));
    s += exp(-abs(dot(q, vec2(-dir.y, dir.x))) * 9.0) * exp(-abs(dot(q, dir)) * 0.85);
  }
  a += s * 0.5;
  a *= 1.0 - smoothstep(uQuadScale * 0.6, uQuadScale, length(q));
#endif
  /* Tête blanche-chaude, queue à la couleur de l'étoile, éteinte au bout. */
  color = mix(color, vec3(1.0), (1.0 - back) * 0.45 * streak);
  a *= mix(1.0, pow(1.0 - back, 1.5), streak);
  a *= vGain;
  if (a < 0.002) discard;
  gl_FragColor = vec4(color * a, 1.0);
}
`;

/* Disque lumineux de la galaxie, vu de loin ; s'efface quand on y entre. */
export const DISK_VERT = /* glsl */ `
precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const DISK_FRAG = /* glsl */ `
precision highp float;
uniform float uOpacity;
uniform float uRadius;
uniform float uWinding;
uniform float uCore;
varying vec2 vP;
${NOISE}
void main() {
  float r = length(vP);
  float th = atan(vP.y, vP.x);
  float rn = r / uRadius;
  float wave = 0.5 + 0.5 * cos(2.0 * (th - uWinding * log(max(r, 0.6) / uCore)));
  float arm = pow(wave, 2.2);
  float ridge = pow(wave, 7.0);
  float clump = fbm(vec3(vP * 0.35, 1.3));
  float grain = fbm(vec3(vP * 1.7, 4.1));
  /* Bandes de poussière sur le bord intérieur des bras, nœuds HII roses. */
  float dust = pow(0.5 + 0.5 * cos(2.0 * (th - uWinding * log(max(r, 0.6) / uCore)) - 0.6), 10.0);
  dust *= smoothstep(3.0, 8.0, r) * (0.6 + 0.6 * clump);
  float knots = smoothstep(0.6, 0.78, fbm(vec3(vP * 0.9, 7.7))) * ridge;
  float bulge = exp(-r * r / 30.0) * 1.6 + exp(-r / 3.0) * 0.35;
  float disk = exp(-rn * 2.6) * (0.22 + 0.78 * arm) * (0.4 + 0.85 * grain);
  disk *= 1.0 - 0.8 * dust;
  vec3 armCol = mix(vec3(0.35, 0.82, 1.0), vec3(0.85, 0.96, 1.0), grain);
  vec3 col = vec3(1.0, 0.86, 0.66) * bulge + armCol * disk * 0.85 + vec3(1.0, 0.18, 0.5) * knots * 0.7 * exp(-rn * 1.5);
  col *= smoothstep(1.12, 0.7, rn) * uOpacity;
  gl_FragColor = vec4(col, 1.0);
}
`;

/* Ciel de nébuleuses, cuit une fois dans une cubemap. */
export const SKY_VERT = /* glsl */ `
precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const SKY_FRAG = /* glsl */ `
precision highp float;
varying vec3 vDir;
${NOISE}
void main() {
  vec3 d = normalize(vDir);
  float w = fbm(d * 1.6);
  float n1 = fbm(d * 2.2 + w * 0.9);
  float n2 = fbm(d * 4.1 + vec3(5.2) + w * 0.5);
  float band = exp(-(d.y * d.y) * 10.24);
  vec3 col = vec3(0.012, 0.024, 0.05);
  col += vec3(0.22, 0.05, 0.42) * pow(n1, 3.2) * 0.55;
  col += vec3(0.0, 0.2, 0.4) * pow(n2, 3.0) * 0.6;
  col += vec3(0.55, 0.03, 0.26) * pow(n1 * n2 * 1.6, 3.0) * 0.45;
  col += vec3(0.08, 0.16, 0.3) * band * 0.22 * (0.5 + 0.6 * n2);
  col += vec3(0.0, 0.34, 0.45) * pow(fbm(d * 3.1 + vec3(9.0)), 4.0) * 0.6;
  col += vec3(0.5, 0.04, 0.3) * pow(fbm(d * 2.6 + vec3(17.0)), 4.0) * 0.5;
  col *= 1.0 - 0.7 * smoothstep(0.52, 0.72, fbm(d * 7.0 + 3.1)) * band;
  gl_FragColor = vec4(col, 1.0);
}
`;

/*
 * Astre d'une catégorie : un rayon par pixel. La photosphère est lancée
 * analytiquement et habillée de plasma lu dans le bruit cuit (projection
 * triplanaire, deux lectures fondues dans le temps pour que rien ne glisse) :
 * cellules de convection qui dérivent, filaments vifs entre elles, taches,
 * assombrissement centre-bord, rotation différentielle. La couronne se lit en
 * polaire : des streamers radiaux qui s'éloignent, en 1/r³. Bord anticrénelé
 * au pixel près, tonalité compressée pour ne pas brûler au blanc.
 */
export const SUN_VERT = /* glsl */ `
precision highp float;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 uPos;
uniform float uRadius;
uniform vec2 uResolution;
uniform float uProj;
uniform float uFade;
attribute vec2 corner;
varying vec2 vUv;
varying float vAA;
const float SPAN = 2.7;
void main() {
  vec4 vp = viewMatrix * vec4(uPos, 1.0);
  if (vp.z > -0.2) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    return;
  }
  vec4 cp = projectionMatrix * vp;
  /* L'astre apparaît en grandissant d'un point (jamais en disque pâle). */
  float radiusPx = uRadius * uProj / -vp.z * smoothstep(0.0, 1.0, uFade);
  vUv = corner * SPAN;
  vAA = 1.5 / max(radiusPx, 1.0);
  gl_Position = vec4(cp.xy + corner * radiusPx * SPAN / (0.5 * uResolution) * cp.w, cp.z, cp.w);
}
`;

export const SUN_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uSeed;
uniform float uFade;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uHot;
uniform sampler2D uNoise;
varying vec2 vUv;
varying float vAA;
/* Tours de bruit autour du limbe pour les lectures polaires : entiers, donc sans couture. */
const float TURNS_WIDE = 0.4775;
const float TURNS_FINE = 1.91;

mat2 spin(float a) {
  return mat2(cos(a), -sin(a), sin(a), cos(a));
}

/* Bruit cuit lu sur la sphère : trois projections pondérées par la normale, sans couture. */
vec4 noiseOn(vec3 p, vec3 n) {
  vec3 w = abs(n);
  w /= w.x + w.y + w.z;
  return texture2D(uNoise, p.yz) * w.x + texture2D(uNoise, p.xz) * w.y + texture2D(uNoise, p.xy) * w.z;
}

/* Plasma qui coule : deux lectures décalées d'une demi-période, fondues en triangle. */
vec4 flow(vec3 p, vec3 n, vec3 drift, float t) {
  float t1 = fract(t);
  float t2 = fract(t + 0.5);
  float w = 1.0 - abs(2.0 * t1 - 1.0);
  return mix(noiseOn(p + drift * t2, n), noiseOn(p + drift * t1, n), w);
}

#ifdef STORMS
/* Boucles de protubérances : arcs magnétiques ancrés au limbe, vus de profil. */
const int LOOPS = 3;
/* Éjections de masse coronale : période (s) de chacune, rayon atteint (en rayons stellaires). */
const int CMES = 2;
const float CME_PERIOD = 8.0;
const float CME_REACH = 1.9;

void storms(float d, float ang, float e, out float loops, out float ejecta, out float launch) {
  loops = 0.0;
  ejecta = 0.0;
  launch = 0.0;
  for (int k = 0; k < LOOPS; k++) {
    float fk = float(k);
    float anchor = uSeed * 1.3 + fk * 2.094 + sin(uTime * 0.05 + fk) * 0.3;
    float da = ang - anchor;
    da = atan(sin(da), cos(da));
    float halfWidth = 0.4 + 0.1 * sin(uTime * 0.21 + fk * 1.7);
    float height = 0.42 + 0.22 * sin(uTime * 0.13 + fk * 2.3);
    float u = da / halfWidth;
    if (abs(u) < 1.0) {
      float arc = 1.0 + height * sqrt(1.0 - u * u);
      /* Plus épaisse et plus vive aux pieds, turbulente sur toute sa longueur. */
      float thick = 0.03 + 0.05 * u * u;
      float ribbon = (d - arc) / thick;
      float plasma = 0.4 + 0.9 * texture2D(uNoise, vec2(u * 0.35 + fk * 0.31, d * 0.9 + uTime * 0.08)).b;
      float body = exp(-ribbon * ribbon) + exp(-ribbon * ribbon * 0.12) * 0.3;
      loops += body * plasma * (0.7 + 0.6 * u * u);
    }
  }
  for (int k = 0; k < CMES; k++) {
    float fk = float(k);
    float phase = fract(uTime / (CME_PERIOD + 2.5 * fk) + fk * 0.47 + uSeed * 0.1);
    float anchor = uSeed * 2.1 + fk * 2.7;
    float da = atan(sin(ang - anchor), cos(ang - anchor));
    float radius = 1.0 + phase * CME_REACH;
    float size = 0.14 + 0.6 * phase;
    /* Une bulle étirée dans le sens de la fuite : front brillant, cœur plus ténu. */
    vec2 off = vec2((d - radius) * 0.8, da * d);
    float rr = length(off);
    float front = (rr - size) / (size * 0.3);
    float bubble = (exp(-front * front) + 0.4 * exp(-rr * rr / (size * size))) * (1.0 - phase) * (1.0 - phase);
    if (bubble > 0.004) bubble *= 0.5 + 0.8 * texture2D(uNoise, off * 0.8 + vec2(uTime * 0.05, fk * 0.37)).r;
    ejecta += bubble * 2.2;
    /* Au départ, le pied de l'éjection s'embrase au limbe. */
    launch += exp(-phase * 22.0) * exp(-da * da * 9.0) * exp(-e * 10.0);
  }
  /* Vent solaire : des rayons radiaux qui s'éloignent. */
  float wind = texture2D(uNoise, vec2(ang * TURNS_FINE + uSeed, d * 0.08 - uTime * 0.03)).r;
  ejecta += wind * wind * wind * exp(-e * 2.0) * 1.2;
}
#endif

void main() {
  float d = length(vUv);
  /* Au-delà de la couronne, rien à calculer. */
  if (d > 2.65) {
    gl_FragColor = vec4(0.0);
    return;
  }
  float mu = sqrt(max(1.0 - d * d, 0.0));

  /* Surface : calculée seulement sur le disque (le quad est surtout couronne). */
  vec3 surf = vec3(0.0);
  if (d < 1.0 + vAA) {
    vec3 n = vec3(vUv / max(d, 1.0), mu);
    /* Rotation différentielle : l'équateur tourne plus vite que les pôles. */
    n.xz = spin(uTime * (0.02 + 0.025 * (1.0 - n.y * n.y))) * n.xz;
    vec3 s = n * 0.5 + vec3(uSeed * 0.37, uSeed * 0.11, 0.0);
    /* Convection : de grandes cellules qui dérivent lentement, la granulation fine entraînée par elles. */
    vec4 coarse = flow(s * 1.2, n, vec3(0.06, 0.04, 0.02), uTime * 0.05);
    vec4 fine = flow(s * 4.0 + coarse.rgr * 0.25, n, vec3(0.08, -0.05, 0.03), uTime * 0.09);
    /* Granules clairs séparés de ruelles sombres : les crêtes du bruit sont les ruelles. */
    float lanes = fine.b * fine.b;
    float granules = (1.0 - 0.5 * lanes) * (0.75 + 0.5 * fine.g);
    float plasma = 0.7 + 0.6 * coarse.r;
    /* Rampe de corps noir : cœur chaud, limbe profond ; assombrissement centre-bord marqué. */
    vec3 ramp = mix(uDeep, uMid, smoothstep(0.0, 0.5, mu));
    ramp = mix(ramp, uHot, smoothstep(0.6, 1.0, mu) * 0.55);
    surf = ramp * (0.4 + 1.9 * pow(mu, 0.7)) * granules * plasma;
#ifdef STORMS
    /* Taches (l'astre actif seulement) : rares, irrégulières ; ombre, pénombre, facules vives autour. */
    float active = coarse.a + (fine.g - 0.5) * 0.12;
    float umbra = smoothstep(0.74, 0.82, active);
    float penumbra = smoothstep(0.66, 0.74, active);
    float faculae = smoothstep(0.56, 0.66, active) * (1.0 - penumbra);
    surf = mix(surf, uDeep * 0.4, penumbra * 0.35 + umbra * 0.4);
    surf += mix(uMid, uHot, 0.5) * faculae * 0.14 * granules;
    /* Éruptions : les régions actives s'embrasent par à-coups. */
    float erupt = smoothstep(0.55, 1.0, sin(uTime * 0.9 + active * 25.0 + uSeed)) * penumbra;
    surf += uHot * erupt * 1.4;
#endif
  }

  float e = max(d - 1.0, 0.0);
  vec3 halo = vec3(0.0);
  if (d > 1.0 - vAA) {
    float ang = atan(vUv.y, vUv.x);
    /* Couronne : des rayons radiaux (le bruit presque constant le long du rayon), rompus par
       des volutes plus fines ; les deux dérivent vers le large. Elle s'éteint vite en 1/r^3,5. */
    float t = uTime * 0.012 + uSeed * 0.1;
    float rays = texture2D(uNoise, vec2(ang * TURNS_WIDE + uSeed, d * 0.05 - t)).r;
    float wisps = texture2D(uNoise, vec2(ang * TURNS_FINE + uSeed * 0.3, d * 0.25 - t * 2.0)).g;
    float streamers = pow(rays, 2.5) * 1.8 + wisps * wisps * 0.5;
    float dens = pow(1.0 / max(d, 1.0), 3.5) * (0.15 + 0.9 * streamers) * 0.9;
    halo = mix(uMid, uHot, exp(-e * 6.0)) * (dens * 0.55 + exp(-e * 12.0) * 0.6);
#ifdef STORMS
    float loops;
    float ejecta;
    float launch;
    storms(d, ang, e, loops, ejecta, launch);
    float reach = 1.0 - smoothstep(1.3, 2.4, e);
    /* Les boucles rougeoient (plasma froid), les éjections ont la couleur de la couronne. */
    halo += mix(uDeep * 1.8, uMid, 0.45) * loops * 1.3 * reach + mix(uMid, uHot, 0.3) * ejecta * reach + uHot * launch * 2.0;
#else
    /* Protubérances : arcs lents au ras du limbe. */
    float arcs = smoothstep(0.6, 0.82, texture2D(uNoise, vec2(ang * TURNS_WIDE + 0.5, uTime * 0.01 + uSeed * 0.2)).r);
    halo += uMid * 1.4 * arcs * exp(-e * 13.0) * (0.65 + 0.35 * sin(e * 38.0 - uTime * 0.8));
#endif
    /* Chromosphère : un liseré vif juste au-dessus du limbe. */
    halo += uHot * exp(-e * 30.0) * 0.9;
    halo *= 1.0 - smoothstep(0.9, 1.5, e);
  }

  /* Prémultiplié : la photosphère masque les étoiles derrière elle (alpha 1),
     la couronne s'ajoute (alpha 0). */
  float inside = 1.0 - smoothstep(1.0 - vAA, 1.0 + vAA, d);
  /* Exposition : la photosphère est la source la plus vive de l'écran. */
  vec3 col = mix(1.0 - exp(-halo * 1.1), 1.0 - exp(-surf * 1.2), inside);
  gl_FragColor = vec4(col * mix(1.0, uFade, 1.0 - inside), inside);
}
`;

/* L'étoile du héros : cœur, halo et pointes de diffraction (6 + 2). */
export const FLARE_VERT = /* glsl */ `
precision highp float;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 uPos;
uniform float uSizePx;
uniform vec2 uResolution;
attribute vec2 corner;
varying vec2 vPx;
void main() {
  vec4 cp = projectionMatrix * viewMatrix * vec4(uPos, 1.0);
  if (cp.w < 0.2) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    return;
  }
  vPx = corner * uSizePx;
  gl_Position = vec4(cp.xy + corner * uSizePx / (0.5 * uResolution) * cp.w, cp.z, cp.w);
}
`;

export const FLARE_FRAG = /* glsl */ `
precision highp float;
uniform float uCorePx;
uniform float uSizePx;
uniform float uIntensity;
uniform float uSpikes;
uniform float uCoreGain;
uniform float uMaskPx;
uniform vec3 uColor;
varying vec2 vPx;

float spike(vec2 p, float ang, float lenPx, float widthPx) {
  vec2 dir = vec2(cos(ang), sin(ang));
  float along = abs(dot(p, dir));
  float across = abs(dot(p, vec2(-dir.y, dir.x)));
  return exp(-across / widthPx) * exp(-along / lenPx);
}

void main() {
  float r = length(vPx) / uCorePx;
  float core = (exp(-r * r * 1.6) * 1.6 + exp(-r * 0.7) * 0.32) * uCoreGain;
  float len = uSizePx * 0.32;
  float s = 0.0;
  for (int i = 0; i < 3; i++) {
    s += spike(vPx, 1.5708 + float(i) * 1.0472, len, uCorePx * 0.09);
  }
  s += 0.45 * spike(vPx, 0.0, len * 0.55, uCorePx * 0.07);
  /* Sur un astre, les pointes naissent au limbe, pas sur le disque. */
  if (uMaskPx > 0.0) s *= smoothstep(uMaskPx * 0.95, uMaskPx * 1.25, length(vPx));
  float edge = smoothstep(1.0, 0.82, length(vPx) / uSizePx);
  vec3 col = (mix(uColor, vec3(1.0), clamp(core * 0.7, 0.0, 1.0)) * core + uColor * s * uSpikes) * uIntensity * edge;
  gl_FragColor = vec4(col, 1.0);
}
`;

/* Comètes, en espace écran : noyau, chevelure, queue effilée. */
export const COMET_VERT = /* glsl */ `
precision highp float;
uniform vec2 uResolution;
attribute vec2 corner;
attribute vec2 iHead;
attribute vec2 iDir;
attribute float iLen;
attribute float iWidth;
attribute float iAlpha;
varying vec2 vLocal;
varying float vLen;
varying float vWidth;
varying float vAlpha;
void main() {
  vec2 n = vec2(-iDir.y, iDir.x);
  float along = corner.x > 0.0 ? iWidth * 3.0 : -iLen;
  float across = corner.y > 0.0 ? iWidth * 9.0 : -iWidth * 3.0;
  vec2 px = iHead + iDir * along + n * across;
  vLocal = vec2(along, across);
  vLen = iLen;
  vWidth = iWidth;
  vAlpha = iAlpha;
  gl_Position = vec4(px / (0.5 * uResolution), 0.0, 1.0);
}
`;

export const COMET_FRAG = /* glsl */ `
precision highp float;
varying vec2 vLocal;
varying float vLen;
varying float vWidth;
varying float vAlpha;
void main() {
  float t = clamp(-vLocal.x / vLen, 0.0, 1.0);
  float behind = step(vLocal.x, 0.0);
  float head = exp(-dot(vLocal, vLocal) / (vWidth * vWidth) * 0.9) * 1.9;
  /* Queue ionique : droite, fine, bleue. */
  float wi = mix(vWidth * 0.45, vWidth * 0.12, t);
  float ion = exp(-vLocal.y * vLocal.y / (wi * wi)) * pow(1.0 - t, 1.2) * behind;
  /* Queue de poussière : s'écarte en courbe, s'élargit, chaude. */
  float bend = vLocal.y - vWidth * 6.0 * t * t;
  float wd = mix(vWidth * 0.9, vWidth * 3.2, t);
  float dust = exp(-bend * bend / (wd * wd)) * pow(1.0 - t, 2.0) * behind;
  vec3 col = vec3(0.92, 0.99, 1.0) * head + vec3(0.0, 0.83, 1.0) * ion * 0.95 + vec3(1.0, 0.3, 0.6) * dust * 0.5;
  gl_FragColor = vec4(col * vAlpha, 1.0);
}
`;

/* Lignes de constellation, tracées au fil de uDraw (0 → 1), tête plus vive. */
export const LINE_VERT = /* glsl */ `
precision highp float;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
attribute float aT;
varying float vT;
void main() {
  vT = aT;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}
`;

export const LINE_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uFade;
uniform float uDraw;
uniform float uTime;
varying float vT;
void main() {
  if (vT > uDraw) discard;
  float head = smoothstep(uDraw - 0.1, uDraw, vT);
  float along = (vT - fract(uTime * 0.22)) * 14.0;
  float pulse = exp(-along * along);
  gl_FragColor = vec4(uColor * uFade * (1.0 + head * 2.0 + pulse * 2.5), 1.0);
}
`;

/* Quad face caméra très étendu autour d'un astre minuscule (le pulsar et ses faisceaux). */
export const GLOW_BODY_VERT = /* glsl */ `
precision highp float;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 uPos;
uniform float uRadius;
uniform vec2 uResolution;
uniform float uProj;
attribute vec2 corner;
varying vec2 vUv;
const float SPAN = 18.0;
void main() {
  vec4 vp = viewMatrix * vec4(uPos, 1.0);
  if (vp.z > -0.2) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    return;
  }
  vec4 cp = projectionMatrix * vp;
  float px = uRadius * uProj / -vp.z * SPAN;
  vUv = corner * SPAN;
  gl_Position = vec4(cp.xy + corner * px / (0.5 * uResolution) * cp.w, cp.z, cp.w);
}
`;


/*
 * Cœur du saut en hyperespace, en espace écran : point de fuite blanc-bleu à
 * décroissance raide, anneau chromatique qui s'ouvre avec la vitesse, éclair
 * blanc au pic (l'instant où le contenu change).
 */
export const WARP_VERT = /* glsl */ `
precision highp float;
uniform vec2 uResolution;
attribute vec2 corner;
varying vec2 vPx;
void main() {
  vPx = corner * 0.5 * uResolution;
  gl_Position = vec4(corner, 0.0, 1.0);
}
`;

export const WARP_FRAG = /* glsl */ `
precision highp float;
uniform vec2 uResolution;
uniform float uWarp;
uniform float uFlash;
uniform float uShock;
uniform vec3 uTint;
varying vec2 vPx;
/* Rayon atteint par l'onde de choc, en demi-petits côtés : jusqu'aux coins d'un portrait 9:19,5. */
const float SHOCK_REACH = 2.4;
void main() {
  float r = length(vPx) / (0.5 * min(uResolution.x, uResolution.y));
  float core = pow(max(1.0 - r * 2.4, 0.0), 4.0) * 1.2 + exp(-r * r * 120.0) * 2.2;
  vec3 col = mix(vec3(0.45, 0.9, 1.0), vec3(1.0), clamp(core * 0.6, 0.0, 1.0)) * core * uWarp;
  float ringR = 0.16 + 0.22 * uWarp;
  float ring1 = (r - ringR) * 30.0;
  float ring2 = (r - ringR - 0.02) * 30.0;
  col += vec3(0.0, 0.83, 1.0) * exp(-ring1 * ring1) * uWarp * 0.5;
  col += vec3(1.0, 0.18, 0.47) * exp(-ring2 * ring2) * uWarp * 0.35;
  col += mix(vec3(1.0), uTint, 0.3) * uFlash * (exp(-r * r * 4.0) * 1.6 + 0.08);
  /* Onde de choc : un anneau qui s'ouvre jusqu'aux coins à l'instant du changement,
     bord avant net, sillage qui traîne derrière. */
  float front = (r - uShock * SHOCK_REACH) * 10.0;
  float shock = (exp(-front * front) + 0.35 * exp(-max(-front, 0.0) * 0.6) * step(front, 0.0)) * (1.0 - uShock) * step(0.001, uShock);
  col += uTint * shock * 1.4 + vec3(1.0) * shock * 0.4;
  gl_FragColor = vec4(col, 1.0);
}
`;

/*
 * Pulsar (Shooters) : une étoile à neutrons blanc-chaud dont l'axe magnétique
 * tourne autour de l'axe de rotation ; deux faisceaux coniques balaient
 * l'espace, l'étoile s'embrase quand un faisceau vise l'œil (effet phare),
 * dans un tore de vent cyan d'où partent des ondes de choc concentriques.
 */
export const PULSAR_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uFade;
varying vec2 vUv;
const float PERIOD = 1.1;
/* Ondes de choc dans le plan du tore : vitesse (rayons/s) et rayon où elles s'éteignent. */
const float WAVE_SPEED = 1.7;
const float WAVE_REACH = 9.0;
void main() {
  vec2 p = vUv;
  float r = length(p);
  float phi = uTime * 6.2831853 / PERIOD;
  vec3 spin = normalize(vec3(0.25, 1.0, 0.15));
  vec3 u = normalize(cross(spin, vec3(0.0, 0.0, 1.0)));
  vec3 v = cross(spin, u);
  float tilt = 0.85;
  vec3 m = normalize(spin * cos(tilt) + (u * cos(phi) + v * sin(phi)) * sin(tilt));

  vec2 axis = m.xy;
  float axisLen = max(length(axis), 0.001);
  vec2 dir = axis / axisLen;
  float along = dot(p, dir);
  float across = abs(dot(p, vec2(-dir.y, dir.x)));
  float reach = 14.0 * axisLen;
  float width = 0.18 + abs(along) * 0.11;
  float fall = exp(-abs(along) / max(reach * 0.45, 0.001));
  /* Faisceau : cœur blanc serré dans une gaine rose. */
  float beams = exp(-across * across / (width * width)) * fall;
  float beamCore = exp(-across * across / (width * width * 0.12)) * fall;
  float flash = pow(abs(m.z), 10.0);

  float core = exp(-r * r * 1.2) * 2.4 + exp(-r * 0.55) * 0.3;
  vec2 tp = vec2(p.x, p.y * 2.6);
  float tr = length(tp);
  float t1 = tr - 3.2;
  float t2 = tr - 5.0;
  float torus = exp(-t1 * t1 * 3.0) * 0.32 + exp(-t2 * t2 * 0.9) * 0.1;
  /* Deux ondes en quadrature : chacune naît au cœur, s'étale et s'éteint. */
  float waves = 0.0;
  for (int i = 0; i < 2; i++) {
    float wr = mod(uTime * WAVE_SPEED + float(i) * WAVE_REACH * 0.5, WAVE_REACH);
    float w = (tr - wr) * 6.0;
    float life = 1.0 - wr / WAVE_REACH;
    waves += exp(-w * w) * life * life;
  }

  vec3 col = mix(vec3(0.75, 0.95, 1.0), vec3(1.0), clamp(core * 0.5, 0.0, 1.0)) * core * (1.0 + flash * 3.0)
    + vec3(1.0, 0.22, 0.52) * beams * 1.3
    + vec3(1.0, 0.9, 0.95) * beamCore * 1.2
    + vec3(0.0, 0.75, 1.0) * (torus + waves * 0.35)
    + vec3(0.9, 0.97, 1.0) * flash * exp(-r * 0.35) * 0.6;
  col *= 1.0 - smoothstep(14.0, 18.0, max(abs(p.x), abs(p.y)));
  gl_FragColor = vec4(col * uFade, 1.0);
}
`;

/* ---------- Post-traitement ---------- */

/* Un triangle plein écran, partagé par toutes les passes. */
export const POST_VERT = /* glsl */ `
precision highp float;
attribute vec2 corner;
varying vec2 vUv;
void main() {
  vUv = corner * 0.5 + 0.5;
  gl_Position = vec4(corner, 0.0, 1.0);
}
`;

/* Seuil de luminance et réduction ×4 : quatre lectures bilinéaires, seize texels. */
export const BRIGHT_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uScene;
uniform vec2 uTexel;
uniform float uThreshold;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(uScene, vUv + uTexel * vec2(-1.0, -1.0)).rgb
    + texture2D(uScene, vUv + uTexel * vec2(1.0, -1.0)).rgb
    + texture2D(uScene, vUv + uTexel * vec2(-1.0, 1.0)).rgb
    + texture2D(uScene, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  gl_FragColor = vec4(c * smoothstep(uThreshold, uThreshold + 0.3, l), 1.0);
}
`;

/* Réduction ×2 : quatre lectures bilinéaires. */
export const DOWN_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(uTex, vUv + uTexel * vec2(-1.0, -1.0)).rgb
    + texture2D(uTex, vUv + uTexel * vec2(1.0, -1.0)).rgb
    + texture2D(uTex, vUv + uTexel * vec2(-1.0, 1.0)).rgb
    + texture2D(uTex, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  gl_FragColor = vec4(c * 0.25, 1.0);
}
`;

/* Flou gaussien séparable, neuf lectures ; uDir porte un texel. */
export const BLUR_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb * 0.227;
  c += (texture2D(uTex, vUv + uDir).rgb + texture2D(uTex, vUv - uDir).rgb) * 0.1946;
  c += (texture2D(uTex, vUv + uDir * 2.0).rgb + texture2D(uTex, vUv - uDir * 2.0).rgb) * 0.1216;
  c += (texture2D(uTex, vUv + uDir * 3.0).rgb + texture2D(uTex, vUv - uDir * 3.0).rgb) * 0.054;
  c += (texture2D(uTex, vUv + uDir * 4.0).rgb + texture2D(uTex, vUv - uDir * 4.0).rgb) * 0.016;
  gl_FragColor = vec4(c, 1.0);
}
`;

/*
 * Composition : la scène, son bloom serré et son bloom large, une aberration
 * chromatique radiale (objectif) et, en saut, un flou radial vers le point de fuite.
 */
export const COMPOSITE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform sampler2D uWide;
uniform float uStrength;
uniform float uWideGain;
uniform float uAberration;
uniform float uRadial;
varying vec2 vUv;
/* Flou radial : nombre d'échantillons et portée (fraction de l'écran) à flou plein. */
const int RADIAL_TAPS = 6;
const float RADIAL_REACH = 0.12;

vec3 lens(vec2 uv, vec2 c, float ab) {
  return vec3(texture2D(uScene, uv - c * ab).r, texture2D(uScene, uv).g, texture2D(uScene, uv + c * ab).b);
}

void main() {
  vec2 c = vUv - 0.5;
  float ab = uAberration * dot(c, c) * 0.08;
  vec3 col;
  if (uRadial > 0.002) {
    col = vec3(0.0);
    for (int i = 0; i < RADIAL_TAPS; i++) {
      col += lens(vUv - c * uRadial * RADIAL_REACH * float(i) / float(RADIAL_TAPS), c, ab);
    }
    col /= float(RADIAL_TAPS);
  } else {
    col = lens(vUv, c, ab);
  }
  col += texture2D(uBloom, vUv).rgb * uStrength + texture2D(uWide, vUv).rgb * uWideGain;
  gl_FragColor = vec4(col, 1.0);
}
`;

/*
 * Nébuleuse d'émission autour d'un astre (Alcools) : un grand quad face
 * caméra, le bruit cuit lu avec une dérive lente, cyan vers magenta, des
 * filaments plus vifs, éclairée depuis le centre par l'étoile qu'elle enveloppe.
 */
export const NEBULA_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uSeed;
uniform float uFade;
uniform sampler2D uNoise;
varying vec2 vUv;
/* Demi-largeur du quad (même SPAN que le sommet) ; teintes de la nébuleuse. */
const float SPAN = 18.0;
const vec3 CYAN = vec3(0.0, 0.7, 1.0);
const vec3 MAGENTA = vec3(1.0, 0.2, 0.6);
void main() {
  vec2 p = vUv / SPAN;
  float r = length(p);
  if (r > 1.0) discard;
  float t = uTime * 0.008;
  vec2 q = p * 0.6 + uSeed * 0.3;
  vec4 a = texture2D(uNoise, q + vec2(t, -t * 0.6));
  vec4 b = texture2D(uNoise, q * 2.3 + vec2(-t * 1.5, t));
  float cloud = a.r * 0.65 + b.g * 0.35;
  float shape = smoothstep(1.0, 0.2, r);
  float dens = smoothstep(0.4, 0.75, cloud) * shape;
  vec3 col = mix(CYAN, MAGENTA, smoothstep(0.35, 0.7, a.g)) * dens * 0.65;
  col += vec3(0.6, 0.9, 1.0) * pow(b.b, 3.0) * dens * 0.45;
  /* L'étoile au centre l'éclaire : plus vive près d'elle. */
  col *= 0.5 + 1.0 * exp(-r * 2.5);
  gl_FragColor = vec4(col * uFade, 1.0);
}
`;
