// waterShader.ts — Shader del lago: borde neón intenso + ondas brillantes
import * as THREE from 'three';

export const MAX_RIPPLES     = 16;
export const RIPPLE_LIFETIME = 4.5;
export const RIPPLE_SPEED    = 4.2;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec4  uRipples[${MAX_RIPPLES}];
  varying vec3  vWorldPos;
  varying float vRippleHeight;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    float a = hash(i), b = hash(i+vec2(1,0)), c = hash(i+vec2(0,1)), d = hash(i+vec2(1,1));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
  }
  float fbm(vec2 p) {
    float v=0.0, a=0.5;
    for(int i=0;i<4;i++){v+=a*noise(p);p*=2.1;a*=0.5;}
    return v;
  }

  void main() {
    vec4 worldPos4 = modelMatrix * vec4(position, 1.0);

    // Olas ambientales suaves
    float wind = (fbm(worldPos4.xz * 0.055 + uTime * 0.06) - 0.5) * 0.14;

    // Desplazamiento por ripples del láser
    float rippleH = 0.0;
    for(int i = 0; i < ${MAX_RIPPLES}; i++) {
      vec4 r = uRipples[i];
      float age = uTime - r.z;
      if(r.z > -999.0 && age > 0.0 && age < ${RIPPLE_LIFETIME.toFixed(1)}) {
        float dist  = distance(worldPos4.xz, r.xy);
        float front = age * ${RIPPLE_SPEED.toFixed(1)};
        float ring  = exp(-pow(dist - front, 2.0) * 0.75);
        float fade  = 1.0 - age / ${RIPPLE_LIFETIME.toFixed(1)};
        rippleH += ring * fade * 0.60;
      }
    }

    vRippleHeight = rippleH;
    vec3 displaced = position;
    displaced.y += wind + rippleH;
    vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec4  uRipples[${MAX_RIPPLES}];
  uniform vec3  uRippleColors[${MAX_RIPPLES}];
  uniform vec3  uDeepColor;
  uniform vec3  uEdgeGlow;
  uniform float uRadius;
  uniform vec2  uLakeCenter;   // centro del lago en xz (world)

  varying vec3  vWorldPos;
  varying float vRippleHeight;

  void main() {
    float distFromCenter = length(vWorldPos.xz - uLakeCenter);
    float d = clamp(distFromCenter / uRadius, 0.0, 1.0);

    // Base del agua: un tono azul/verde profundo en lugar de negro.
    vec3 base = mix(uDeepColor, uDeepColor * 2.5, d * 0.45);

    // ── Borde NEÓN brillante (El efecto estrella) ──────────────────────────
    // Un borde duro y fino en la misma orilla
    float rim = exp(-pow((d - 1.0) * 25.0, 2.0));
    // Un halo suave y amplio justo antes de la orilla
    float softRim = exp(-pow((d - 0.80) * 8.0, 2.0)) * 0.6;
    // Pulso animado
    float edgePulse = 0.85 + 0.15 * sin(uTime * 1.8 + distFromCenter * 0.25);
    
    vec3 color = mix(base, uEdgeGlow * edgePulse * 2.5, max(rim, softRim));

    // Añadir una neblina sutil sobre toda el agua
    color += uEdgeGlow * 0.05 * (1.0 - d) * edgePulse;

    // ── Ondas del láser (super brillantes) ──────────────────────────────────
    for(int i = 0; i < ${MAX_RIPPLES}; i++) {
      vec4 r = uRipples[i];
      float age = uTime - r.z;
      if(r.z > -999.0 && age > 0.0 && age < ${RIPPLE_LIFETIME.toFixed(1)}) {
        float dist  = distance(vWorldPos.xz, r.xy);
        float front = age * ${RIPPLE_SPEED.toFixed(1)};
        // Anillo de onda más definido
        float ring  = exp(-pow(dist - front, 2.0) * 0.45);
        float fade  = 1.0 - age / ${RIPPLE_LIFETIME.toFixed(1)};
        // Intensidad del color del láser aumentada
        color += uRippleColors[i] * ring * fade * 4.5;
      }
    }

    // Brillo extra en la cresta de la ola
    color += vec3(vRippleHeight * 0.9);

    // Destellos de superficie (pequeños puntos de luz)
    float sh = sin(vWorldPos.x * 4.6 + uTime * 1.6) * sin(vWorldPos.z * 4.6 - uTime * 1.2);
    color += vec3(0.02, 0.08, 0.12) * sh;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createWaterMaterial(radius: number, centerZ: number): THREE.ShaderMaterial {
  const ripples = Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -1000, 0));
  const rippleColors = Array.from({ length: MAX_RIPPLES }, () => new THREE.Color('#00ffd0'));

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime:        { value: 0 },
      uRipples:     { value: ripples },
      uRippleColors:{ value: rippleColors },
      uDeepColor:   { value: new THREE.Color('#00161f') }, // Un azul oscuro pero no negro
      uEdgeGlow:    { value: new THREE.Color('#00ffcc') }, // Color neón "estrella"
      uRadius:      { value: radius },
      uLakeCenter:  { value: new THREE.Vector2(0, centerZ) },
    },
  });
}

export function pushRipple(
  material: THREE.ShaderMaterial,
  x: number, z: number, time: number, color: THREE.Color,
) {
  const cursor = ((material.userData.rippleCursor as number) ?? 0);
  const idx = cursor % MAX_RIPPLES;
  material.userData.rippleCursor = cursor + 1;
  (material.uniforms.uRipples.value as THREE.Vector4[])[idx].set(x, z, time, 0);
  (material.uniforms.uRippleColors.value as THREE.Color[])[idx].copy(color);
}