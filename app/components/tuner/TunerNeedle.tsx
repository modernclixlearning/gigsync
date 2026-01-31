import { cn } from '~/lib/utils'

export interface TunerNeedleProps {
  /** Cents deviation from perfect pitch (-50 to +50) */
  cents: number
  /** Whether the tuner is actively listening */
  isActive: boolean
  /** Size of the needle display */
  size?: 'sm' | 'md' | 'lg'
  /** Optional className */
  className?: string
}

/**
 * Visual SVG needle component for the tuner
 * Rotates based on cents deviation from perfect pitch
 */
export function TunerNeedle({ 
  cents, 
  isActive, 
  size = 'md',
  className 
}: TunerNeedleProps) {
  // Map cents (-50 to +50) to rotation degrees (-45 to +45)
  const rotation = (cents / 50) * 45
  
  // Clamp rotation to valid range
  const clampedRotation = Math.max(-45, Math.min(45, rotation))
  
  // Determine if in tune (within 5 cents)
  const isInTune = Math.abs(cents) <= 5
  
  // Size configurations
  const sizes = {
    sm: { width: 200, height: 120, needleLength: 80 },
    md: { width: 280, height: 160, needleLength: 120 },
    lg: { width: 360, height: 200, needleLength: 160 },
  }
  
  const { width, height, needleLength } = sizes[size]
  const centerX = width / 2
  const centerY = height - 20

  return (
    <div className={cn('relative', className)}>
      <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Background arc */}
        <path
          d={`M ${centerX - needleLength - 20} ${centerY} 
              A ${needleLength + 20} ${needleLength + 20} 0 0 1 ${centerX + needleLength + 20} ${centerY}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-slate-200 dark:text-slate-700"
        />
        
        {/* Tick marks */}
        {[-45, -30, -15, 0, 15, 30, 45].map((angle) => {
          const isCenter = angle === 0
          const radian = (angle - 90) * (Math.PI / 180)
          const innerRadius = needleLength + 5
          const outerRadius = needleLength + (isCenter ? 20 : 12)
          
          const x1 = centerX + innerRadius * Math.cos(radian)
          const y1 = centerY + innerRadius * Math.sin(radian)
          const x2 = centerX + outerRadius * Math.cos(radian)
          const y2 = centerY + outerRadius * Math.sin(radian)
          
          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth={isCenter ? 3 : 2}
              className={cn(
                isCenter 
                  ? 'text-emerald-500' 
                  : 'text-slate-300 dark:text-slate-600'
              )}
            />
          )
        })}
        
        {/* Flat/Sharp labels */}
        <text
          x={centerX - needleLength - 35}
          y={centerY - 10}
          textAnchor="middle"
          className="fill-slate-500 dark:fill-slate-400 text-sm font-medium"
        >
          ♭
        </text>
        <text
          x={centerX + needleLength + 35}
          y={centerY - 10}
          textAnchor="middle"
          className="fill-slate-500 dark:fill-slate-400 text-sm font-medium"
        >
          ♯
        </text>
        
        {/* Center "in tune" indicator */}
        <circle
          cx={centerX}
          cy={centerY - needleLength - 25}
          r={8}
          className={cn(
            'transition-all duration-200',
            isActive && isInTune 
              ? 'fill-emerald-500' 
              : 'fill-slate-200 dark:fill-slate-700'
          )}
        />
        
        {/* Needle */}
        <g
          transform={`rotate(${isActive ? clampedRotation : 0}, ${centerX}, ${centerY})`}
          className="transition-transform duration-100 ease-out"
        >
          {/* Needle shadow */}
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX}
            y2={centerY - needleLength}
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="6"
            strokeLinecap="round"
            transform="translate(2, 2)"
          />
          
          {/* Main needle */}
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX}
            y2={centerY - needleLength}
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className={cn(
              'transition-colors duration-200',
              !isActive 
                ? 'text-slate-400 dark:text-slate-500'
                : isInTune 
                  ? 'text-emerald-500' 
                  : cents > 0 
                    ? 'text-amber-500' 
                    : 'text-rose-500'
            )}
          />
          
          {/* Needle tip */}
          <circle
            cx={centerX}
            cy={centerY - needleLength}
            r={6}
            className={cn(
              'transition-colors duration-200',
              !isActive 
                ? 'fill-slate-400 dark:fill-slate-500'
                : isInTune 
                  ? 'fill-emerald-500' 
                  : cents > 0 
                    ? 'fill-amber-500' 
                    : 'fill-rose-500'
            )}
          />
        </g>
        
        {/* Center pivot */}
        <circle
          cx={centerX}
          cy={centerY}
          r={10}
          className="fill-slate-700 dark:fill-slate-300"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={6}
          className="fill-slate-500 dark:fill-slate-400"
        />
      </svg>
    </div>
  )
}
