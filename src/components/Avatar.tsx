import { initials } from "@/lib/format";

const PALETTE = [
  "#34d399", "#f472b6", "#60a5fa", "#fbbf24", "#a78bfa", "#fb7185", "#22d3ee", "#facc15",
];

export function Avatar({ name, id, size = 32 }: { name: string | null; id: string; size?: number }) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const color = PALETTE[h % PALETTE.length];
  return (
    <span
      className="inline-grid place-items-center rounded-full font-bold text-black/80"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  );
}
