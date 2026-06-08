import { initials } from "@/lib/format";

// warm, on-brand backgrounds; all read well with cream text
const PALETTE = ["#1a3d2e", "#6b2d3c", "#7e6600", "#245a43", "#6b4a26", "#4a1c1c", "#5b6b2d", "#2d4a4a"];

export function Avatar({ name, id, size = 32 }: { name: string | null; id: string; size?: number }) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const color = PALETTE[h % PALETTE.length];
  return (
    <span
      className="display inline-grid place-items-center rounded-full font-bold text-cream ring-1 ring-gold/40"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  );
}
