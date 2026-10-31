import React from "react"

interface LogoIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  className?: string
  animated?: boolean
}

/**
 * PROOFPATH AI — Signature Emblem
 * Features converging forensic evidence paths forming an illuminated shield
 * with a central crystalline ground-truth node.
 */
export const LogoIcon: React.FC<LogoIconProps> = ({
  size = 28,
  className = "",
  animated = false,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        {/* Core Shield & Primary Path Gradient */}
        <linearGradient id="proofpath-grad-primary" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="50%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        {/* Verification Lightbeam Gradient */}
        <linearGradient id="proofpath-grad-cyan" x1="12" y1="6" x2="36" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="60%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>

        {/* Emerald Truth Check Gradient */}
        <linearGradient id="proofpath-grad-emerald" x1="18" y1="20" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        {/* Ambient Glow Filter */}
        <filter id="proofpath-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer Shield Hull with subtle inset */}
      <path
        d="M24 3L8 9V22C8 32.5 14.8 41.8 24 45C33.2 41.8 40 32.5 40 22V9L24 3Z"
        fill="url(#proofpath-grad-primary)"
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Left Converging Evidence Path (Facet A) */}
      <path
        d="M12 13V21.5C12 28.5 16.8 35 24 38.5V25.5L16 17.5V13H12Z"
        fill="white"
        fillOpacity="0.08"
      />

      {/* Dynamic Geometric Chevron / Intersecting Path */}
      <path
        d="M24 8L36 12.5V22C36 28.2 31.8 34.2 25.8 37.1L24 24.5L31 17.5L24 15V8Z"
        fill="url(#proofpath-grad-cyan)"
        fillOpacity="0.85"
      />

      {/* Inner Forensic Ground-Truth Route (The Proof Path) */}
      <path
        d="M17 24L22.5 29.5L32 17.5"
        stroke="url(#proofpath-grad-emerald)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#proofpath-glow)"
      />

      {/* Central Radiating Truth Node */}
      <circle cx="22.5" cy="29.5" r="2.2" fill="#FFFFFF" />
      <circle cx="32" cy="17.5" r="1.8" fill="#67E8F9" />

      {/* Top Apex Compass Pip */}
      <circle cx="24" cy="7.5" r="1.2" fill="#E0F2FE" />
    </svg>
  )
}

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  showTagline?: boolean
  className?: string
  iconOnly?: boolean
}

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  showTagline = false,
  className = "",
  iconOnly = false,
}) => {
  const sizeMap = {
    sm: { icon: 22, text: "text-xs", badge: "text-[8px] px-1 py-0.2", gap: "gap-1.5" },
    md: { icon: 28, text: "text-sm", badge: "text-[9px] px-1.5 py-0.5", gap: "gap-2" },
    lg: { icon: 38, text: "text-lg", badge: "text-[10px] px-2 py-0.5", gap: "gap-2.5" },
    xl: { icon: 54, text: "text-2xl sm:text-3xl", badge: "text-xs px-2.5 py-1", gap: "gap-3.5" },
  }

  const current = sizeMap[size]

  if (iconOnly) {
    return <LogoIcon size={current.icon} className={className} />
  }

  return (
    <div className={`flex items-center ${current.gap} select-none ${className}`}>
      <div className="shrink-0 transition-transform hover:scale-105 duration-200">
        <LogoIcon size={current.icon} />
      </div>

      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1.5">
          <span className={`font-black tracking-tight text-ink font-sans ${current.text}`}>
            PROOFPATH
          </span>
          <span
            className={`font-mono font-bold uppercase rounded-md bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-subtle ${current.badge}`}
          >
            AI
          </span>
        </div>

        {showTagline && (
          <span className="text-[10px] sm:text-[11px] font-medium text-ink-secondary tracking-normal mt-1">
            Know what's missing before you decide.
          </span>
        )}
      </div>
    </div>
  )
}

export default Logo
