/* eslint-disable @next/next/no-img-element */
import { flagUrl } from "@/lib/format";

export function Flag({
  code,
  size = 28,
  className = "",
}: {
  code: string;
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={flagUrl(code, 80)}
      alt=""
      width={size}
      height={Math.round((size * 3) / 4)}
      loading="lazy"
      className={`inline-block shrink-0 rounded-[3px] object-cover shadow-[0_0_0_1px_rgba(255,255,255,0.10)] ${className}`}
      style={{ width: size, height: Math.round((size * 3) / 4) }}
    />
  );
}
