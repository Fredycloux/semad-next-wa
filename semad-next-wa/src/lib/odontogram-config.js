// src/lib/odontogram-config.js
export const LABELS = [
  "Caries",
  "Obturación",
  "Endodoncia",
  "Corona",
  "Fractura",
  "Pérdida",
  "Otro",
];

// Colores sugeridos (ajústalos a tu gusto)
// Caries -> negro, Obturación -> azul, Endodoncia -> morado, Corona -> ámbar,
// Fractura -> rojo, Pérdida -> gris, Otro -> verde
export const DIAG_COLORS = {
  Caries:      "#111827",
  Obturación:  "#0ea5e9",
  Endodoncia:  "#8b5cf6",
  Corona:      "#f59e0b",
  Fractura:    "#ef4444",
  Pérdida:     "#6b7280",
  Otro:        "#10b981",
};

export function colorForLabel(label) {
  return DIAG_COLORS[label] || "#7c3aed";
}
