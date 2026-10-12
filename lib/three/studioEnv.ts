import {
  BackSide,
  BoxGeometry,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  type Texture,
  type WebGLRenderer,
} from "three";

/**
 * A photo-studio environment built in code: a dark ink room with a bone
 * softbox overhead, an oxblood strip light on the right and a cool fill on the
 * left, prefiltered once through PMREM. Zero network requests — no HDR files,
 * no drei presets (those fetch from githack before consent).
 *
 * The returned texture belongs to the caller: dispose it with the renderer.
 */
export function createStudioEnv(renderer: WebGLRenderer): Texture {
  const scene = new Scene();
  const geometries: { dispose(): void }[] = [];
  const materials: { dispose(): void }[] = [];

  // Ink walls. Everything not lit by a panel reflects as near-black.
  const roomGeo = new BoxGeometry(12, 8, 12);
  const roomMat = new MeshBasicMaterial({ color: new Color("#14181a"), side: BackSide });
  scene.add(new Mesh(roomGeo, roomMat));
  geometries.push(roomGeo);
  materials.push(roomMat);

  const panel = (
    w: number,
    h: number,
    hex: string,
    intensity: number,
    position: [number, number, number],
    target: [number, number, number],
  ) => {
    const geo = new PlaneGeometry(w, h);
    // Emissive by construction: an unlit colour above 1.0 survives into the
    // half-float PMREM target and reads as a light source in reflections.
    const mat = new MeshBasicMaterial({
      color: new Color(hex).multiplyScalar(intensity),
      side: DoubleSide,
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.set(...position);
    mesh.lookAt(...target);
    scene.add(mesh);
    geometries.push(geo);
    materials.push(mat);
  };

  // Bone softbox overhead, pushed slightly toward the camera side so panes
  // facing the viewer catch it along their top edge.
  panel(6, 2.6, "#e3e6e0", 2.2, [0, 3.9, 1.2], [0, 0, 1.2]);
  // Oxblood strip on the right — the rim light on every pane edge.
  panel(0.45, 5, "#7d2436", 4, [5.6, 0.2, -0.4], [0, 0.2, -0.4]);
  // Cool fill on the left, deliberately weak.
  panel(3.2, 4, "#c0c6c2", 0.6, [-5.6, 0, 0.6], [0, 0, 0.6]);
  // Faint bounce behind the camera so the front glass carries a soft sheen
  // instead of a dead-black reflection.
  panel(7, 1.6, "#e3e6e0", 0.3, [0, 1.4, 5.8], [0, 1.4, 0]);

  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.04);
  pmrem.dispose();
  for (const g of geometries) g.dispose();
  for (const m of materials) m.dispose();

  return target.texture;
}
