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
  const width = Math.round(markRatio * height);

  return (
    <Image
      src={brandMark}
      alt="iFranchise"
      width={width}
      height={height}
      priority={priority}
      className={cn("h-auto w-auto shrink-0 object-contain brightness-0 dark:invert", className)}
      style={{ width, height }}
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
      className={cn("h-auto w-auto shrink-0 object-contain", className)}
      style={{ width, height }}
    />
  );
}

export function PortalBrand({ priority = false }: { priority?: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <PortalLogo size={40} priority={priority} className="rounded-lg" />
      <BrandLogo height={40} priority={priority} />
    </span>
  );
}
