/**
 * The WebGL lamination scene, loaded only on the 'webgl' tier by ThreeStage.
 * Kept in its own module so the dynamic import has a single home.
 */
import type { SceneFactory } from "@/lib/three/types";

export const loadLamination = (): Promise<{ default: SceneFactory }> => import("./LaminationScene");
