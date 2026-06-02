// Paleta alinhada ao app web (tema escuro + acento rosa).
export const colors = {
  bg: "#070c19",
  surface: "#0b1329",
  surface2: "#0f172a",
  card: "#111c33",
  border: "#1e293b",
  text: "#e2e8f0",
  textDim: "#94a3b8",
  textFaint: "#64748b",
  rose: "#f43f5e",
  rose600: "#e11d48",
  emerald: "#34d399",
  emeraldBg: "#064e3b",
  orange: "#fb923c",
  orangeBg: "#7c2d12",
  blue: "#60a5fa",
  white: "#ffffff",
};

export type Nivel = "baixo" | "medio" | "alto";

export function riskColor(n: Nivel): string {
  return n === "alto" ? colors.rose : n === "medio" ? colors.orange : colors.emerald;
}

export function riskLabel(n: Nivel): string {
  return n.toUpperCase();
}
