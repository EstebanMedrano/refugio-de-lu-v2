import * as THREE from 'three';

// ── Geometría del mundo ───────────────────────────────────────────────────────
export const CLIFF_EDGE_Z  = -6;    // Borde del acantilado
export const LAKE_Y        = -12;   // Altura del lago
export const LAKE_CENTER_Z = -45;   // ¡MUCHO MÁS LEJOS! (antes era -18)
export const LAKE_RADIUS   = 55;    // ¡MUCHO MÁS GRANDE! (antes era 18)

// ── Posiciones de cámara ──────────────────────────────────────────────────────
export const STAND_POS  = new THREE.Vector3(0, 1.75, 8);
export const SEAT_POS   = new THREE.Vector3(0, 0.55, -4.5);
// Mirar al lago, pero un poquito más elevado para apreciar el borde
export const SEAT_LOOK  = new THREE.Vector3(0, LAKE_Y + 6, LAKE_CENTER_Z);

// ── Constantes del láser y cierre ─────────────────────────────────────────────
export const MAX_BEAMS         = 8;
export const BEAM_LIFETIME     = 0.5;
export const SHOTS_FOR_CLOSURE = 8;