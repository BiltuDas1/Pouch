import { ArrowUpDownIcon } from "lucide-react";
import type { SVGProps } from "react";

export default function Icon({ height, width, color }: SVGProps<SVGElement>) {
  return <ArrowUpDownIcon height={height} width={width} color={color} />;
}
