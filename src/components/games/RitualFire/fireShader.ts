export const fireVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fireFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform vec3 uColorCore;
  uniform vec3 uColorMid;
  uniform vec3 uColorEdge;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.55;
    for (int i = 0; i < 4; i++) {
      v += amp * noise(p);
      p *= 2.05;
      amp *= 0.55;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;

    vec2 noiseCoord = vec2(
      uv.x * 2.6 + uSeed * 5.0,
      uv.y * 3.4 - uTime * 1.7 + uSeed * 3.0
    );
    float n = fbm(noiseCoord);

    // La llama se angosta hacia la punta
    float taper = smoothstep(0.0, 1.0, uv.y);
    float widthMask = 1.0 - smoothstep(0.12 + taper * 0.3, 0.5, abs(uv.x - 0.5));

    float flame = clamp(n * widthMask * (1.0 - uv.y * 0.85) * 1.7, 0.0, 1.0);

    // Desvanece base y punta para que no se vea como un cuadrado
    float verticalFade = smoothstep(0.0, 0.06, uv.y) * (1.0 - smoothstep(0.7, 1.0, uv.y));
    float alpha = flame * verticalFade;

    vec3 color = mix(uColorEdge, uColorMid, smoothstep(0.0, 0.45, flame));
    color = mix(color, uColorCore, smoothstep(0.45, 0.85, flame));

    gl_FragColor = vec4(color, alpha);
  }
`;