import { AdditiveBlending, Color, Mesh, PlaneGeometry, ShaderMaterial } from "three";

/**
 * The studio light bar: an additive band swept across a pane at 22°. A
 * warm-white core (#fff6ee, 0.06 wide) trailed by an oxblood fringe
 * (#7d2436, 0.14 wide). Tween `uniforms.uSweep.value` from -0.2 to 1.2; at
 * both ends the band is fully off the plane, so the mesh can stay visible.
 *
 * Place the mesh just in front of the pane's screen (z + 0.003) and size it
 * to the screen. Hide it (`mesh.visible = false`) between sweeps to skip the
 * fill cost entirely.
 */

export interface LightBarUniforms {
  uSweep: { value: number };
  uIntensity: { value: number };
  /** tan(22°)·h/w — keeps the band at 22° in world space whatever the aspect. */
  uSlope: { value: number };
  uCore: { value: Color };
  uFringe: { value: Color };
}

export interface LightBar {
  mesh: Mesh;
  uniforms: LightBarUniforms;
  dispose(): void;
}

const ANGLE = (22 * Math.PI) / 180;

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform float uSweep;
uniform float uIntensity;
uniform float uSlope;
uniform vec3 uCore;
uniform vec3 uFringe;
varying vec2 vUv;
void main() {
  // 0 at the bottom-left corner, 1 at the top-right, measured across the band.
  float s = (vUv.x + vUv.y * uSlope) / (1.0 + uSlope);
  float b = s - uSweep;
  float core = smoothstep(0.03, 0.0, abs(b));
  float fringe = smoothstep(0.14, 0.03, abs(b + 0.05));
  vec3 col = (uCore * core + uFringe * fringe * 0.6) * uIntensity;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export function createLightBar(w: number, h: number): LightBar {
  const uniforms: LightBarUniforms = {
    uSweep: { value: -0.2 },
    uIntensity: { value: 1 },
    uSlope: { value: Math.tan(ANGLE) * (h / w) },
    uCore: { value: new Color("#fff6ee") },
    uFringe: { value: new Color("#7d2436") },
  };
  const geometry = new PlaneGeometry(w, h);
  const material = new ShaderMaterial({
    uniforms: uniforms as unknown as ShaderMaterial["uniforms"],
    vertexShader,
    fragmentShader,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = "light-bar";
  mesh.renderOrder = 3;
  return {
    mesh,
    uniforms,
    dispose() {
      mesh.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
