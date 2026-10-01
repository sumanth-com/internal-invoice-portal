import portalLogo from "@/assets/Logo.png";
import brandMark from "@/assets/logoif.png";
import { cn } from "@/lib/utils";
import Image from "next/image";

const markRatio = brandMark.width / brandMark.height;
const portalRatio = portalLogo.width / portalLogo.height;

export function BrandLogo({
  height = 40,
  className,
  priority = false,
}: {
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={brandMark}
      alt="iFranchise"
      width={Math.round(markRatio * height)}
      height={height}
      priority={priority}
      className={cn("brightness-0 dark:invert", className)}
    />
  );
}

export function PortalLogo({
  size = 32,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const height = size;
  const width = Math.round(portalRatio * height);

  return (
    <Image
      src={portalLogo}
      alt="iFranchise"
      width={width}
      height={height}
      priority={priority}
      className={cn("shrink-0 rounded-md", className)}
    />
  );
}
