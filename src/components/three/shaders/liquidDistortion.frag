precision highp float;

uniform sampler2D uTextTexture;
uniform float uTime;
uniform vec2 uMouse;
uniform float uMouseVelocity;
uniform float uReveal;
uniform float uNoiseScale;
uniform float uNoiseStrength;
uniform float uChromaticStrength;
uniform float uRippleStrength;
uniform vec2 uResolution;
uniform float uScrollProgress;

varying vec2 vUv;

/* ── Simplex 2D noise (Ashima Arts) ─────────────────────────── */
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(
     0.211324865405187,   // (3.0-sqrt(3.0))/6.0
     0.366025403784439,   // 0.5*(sqrt(3.0)-1.0)
    -0.577350269189626,   // -1.0 + 2.0 * C.x
     0.024390243902439    // 1.0/41.0
  );

  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);

  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                            + i.x + vec3(0.0, i1.x, 1.0));

  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;

  vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
  vec3 h  = abs(x_) - 0.5;
  vec3 ox = floor(x_ + 0.5);
  vec3 a0 = x_ - ox;

  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;

  return 130.0 * dot(m, g);
}

/* ── Main ───────────────────────────────────────────────────── */
void main() {
  vec2 uv = vUv;

  // Aspect ratio correction for noise so it doesn't stretch
  float aspect = uResolution.x / uResolution.y;

  // 1. Simplex noise displacement — high frequency detail
  vec2 noiseUv = uv * uNoiseScale;
  noiseUv.x *= aspect;
  float noiseX = snoise(vec2(noiseUv.x, noiseUv.y + uTime * 0.3)) * uNoiseStrength;
  float noiseY = snoise(vec2(noiseUv.x + 100.0, noiseUv.y + uTime * 0.25)) * uNoiseStrength;

  // 2. Breath noise — low frequency, slow, always present (text "floats")
  float breathX = snoise(vec2(uv.x * 0.8 * aspect, uv.y * 0.8 + uTime * 0.08)) * 0.015;
  float breathY = snoise(vec2(uv.x * 0.8 * aspect + 50.0, uv.y * 0.8 + uTime * 0.06)) * 0.012;

  // 3. Mouse ripple — wide, soft, slow propagation
  float distToMouse = distance(uv, uMouse);

  // Primary wave — wide and soft
  float wave1 = sin(distToMouse * 18.0 - uTime * 2.5) * exp(-distToMouse * 3.5);
  // Secondary wave — thinner, phase-offset, adds organic complexity
  float wave2 = sin(distToMouse * 30.0 - uTime * 3.8 + 1.2) * exp(-distToMouse * 5.0) * 0.3;

  float ripple = (wave1 + wave2) * uRippleStrength * uMouseVelocity;
  vec2 rippleDir = normalize(uv - uMouse + 0.0001);
  vec2 rippleDisp = rippleDir * ripple;

  // 4. Combine displacement
  //    Reveal controls base noise: 12x at chaos, 1.8x at regime (still alive)
  //    Breath is always present (not scaled by reveal)
  float revealNoise = mix(12.0, 1.8, smoothstep(0.0, 1.0, uReveal));
  vec2 baseDisp = vec2(noiseX, noiseY) * revealNoise;
  vec2 breathDisp = vec2(breathX, breathY);
  vec2 totalDisp = baseDisp + breathDisp + rippleDisp;

  // 5. Chromatic aberration — reduces at regime but never disappears
  float baseChromaticMix = mix(1.0, 0.35, smoothstep(0.0, 1.0, uReveal));
  float chromaticAmt = length(totalDisp) * uChromaticStrength * 15.0 * baseChromaticMix
                     + uChromaticStrength * 0.5;  // permanent floor

  float r = texture2D(uTextTexture, uv + totalDisp + vec2(chromaticAmt, 0.0)).r;
  float g = texture2D(uTextTexture, uv + totalDisp).g;
  float b = texture2D(uTextTexture, uv + totalDisp - vec2(chromaticAmt, 0.0)).b;
  float a = texture2D(uTextTexture, uv + totalDisp).a;

  // 6. Compose — dynamic cyan tint that varies organically with position
  vec3 color = vec3(r, g, b);

  float tintAmount = 0.12 + snoise(vec2(uv.x * 2.0 * aspect, uv.y * 2.0 + uTime * 0.1)) * 0.06;
  vec3 cyanTint = vec3(0.75, 0.96, 1.0);
  color = mix(color, color * cyanTint, tintAmount);

  // Edge glow — areas with more displacement glow more cyan
  float edgeGlow = length(totalDisp) * 4.0;
  color += vec3(0.0, 0.12, 0.15) * edgeGlow * color;

  // 7. Scroll fadeout
  float scrollFade = 1.0 - uScrollProgress;
  color *= scrollFade;

  gl_FragColor = vec4(color, a * scrollFade);
}
