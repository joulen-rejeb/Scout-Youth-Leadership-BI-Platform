import { Link } from "@tanstack/react-router";

import scoutBrandLogo from "@/assets/scout-dss-brand.png";
import { cn } from "@/lib/utils";

const logoImgClass =
  "h-12 w-12 shrink-0 object-contain mr-3 [image-rendering:high-quality]";

/** Primary navbar lockup — landing site header. */
export function LandingNavbarBrand({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center", className)}>
      <img
        src={scoutBrandLogo}
        alt=""
        decoding="async"
        className={logoImgClass}
        aria-hidden
      />
      <div className="leading-tight">
        <div className="text-[13px] tracking-[0.18em] uppercase text-[#1A1A1A]/45">
          Scouts Grombalia
        </div>
        <div className="-mt-0.5 text-sm font-medium text-[#1A1A1A]">Decision Support System</div>
      </div>
    </Link>
  );
}

/** Workspace / app shell header (Predictions, Overview, Analytics). */
export function WorkspaceHeaderBrand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={scoutBrandLogo}
        alt=""
        decoding="async"
        className={logoImgClass}
        aria-hidden
      />
      <div className="leading-tight">
        <p className="text-xs uppercase tracking-[0.18em] text-[#898082]">Scouts Grombalia</p>
        <p className="text-sm font-medium text-[#2a2629]">Decision Support System</p>
      </div>
    </div>
  );
}

/** Compact branding row for auth flows (below global nav semantics). */
export function AuthFormBrandRibbon({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-0 border-b border-[#2a2629]/10 pb-6", className)}>
      <img
        src={scoutBrandLogo}
        alt=""
        decoding="async"
        className={logoImgClass}
        aria-hidden
      />
      <div className="leading-tight">
        <p className="text-[13px] tracking-[0.18em] text-stone-warm">Scouts Grombalia</p>
        <p className="text-xs uppercase tracking-[0.2em] text-[#898082]">Decision Support System</p>
      </div>
    </div>
  );
}
