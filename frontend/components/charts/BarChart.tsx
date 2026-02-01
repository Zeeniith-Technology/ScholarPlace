'use client'

import React from 'react'

interface BarData {
  name: string
  value: number
  value2?: number
}

interface BarChartProps {
  data: BarData[]
  height?: number
  color?: string
  color2?: string
  showGrid?: boolean
  label1?: string
  label2?: string
  /** Fixed Y-axis max (e.g. 100 for score charts) */
  yMax?: number
}

export function BarChart({
  data,
  height = 300,
  color = '#4F46E5',
  color2,
  showGrid = true,
  label1,
  label2,
  yMax: yMaxProp,
}: BarChartProps) {
  const dataMax = data.length ? Math.max(...data.map((d) => Math.max(d.value, d.value2 ?? 0))) : 100
  const maxValue = yMaxProp !== undefined ? yMaxProp : Math.max(dataMax, 100)
  const width = 800
  const padding = 56
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const hasTwoSeries = Boolean(color2)
  const slotWidth = chartWidth / data.length
  const gapBetweenBars = 14
  const groupWidth = slotWidth * 0.72
  const barWidth = hasTwoSeries ? (groupWidth - gapBetweenBars) / 2 : Math.min(groupWidth * 0.6, 32)
  const groupOffset = (slotWidth - groupWidth) / 2

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="w-full h-auto" aria-label="Bar chart">
        {showGrid && (
          <g>
            {[0, 25, 50, 75, 100].filter((v) => v <= maxValue).map((value) => {
              const y = padding + chartHeight - (value / maxValue) * chartHeight
              return (
                <g key={value}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={width - padding}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <text x={padding - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#64748B">
                    {value}
                  </text>
                </g>
              )
            })}
          </g>
        )}
        {data.map((item, index) => {
          const slotLeft = padding + index * slotWidth + groupOffset
          const x1 = slotLeft
          const x2 = slotLeft + barWidth + gapBetweenBars
          const barHeight1 = maxValue > 0 ? (item.value / maxValue) * chartHeight : 0
          const barHeight2 = color2 && item.value2 != null && maxValue > 0 ? (item.value2 / maxValue) * chartHeight : 0
          const y1 = padding + chartHeight - barHeight1
          const y2 = padding + chartHeight - barHeight2
          const labelX = slotLeft + groupWidth / 2

          return (
            <g key={index}>
              <rect
                x={x1}
                y={y1}
                width={barWidth}
                height={Math.max(barHeight1, 0)}
                fill={color}
                rx={6}
                ry={6}
              />
              {hasTwoSeries && (
                <rect
                  x={x2}
                  y={y2}
                  width={barWidth}
                  height={Math.max(barHeight2, 0)}
                  fill={color2}
                  rx={6}
                  ry={6}
                />
              )}
              {item.value > 0 && (
                <text
                  x={x1 + barWidth / 2}
                  y={y1 - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#334155"
                  fontWeight="600"
                >
                  {item.value}
                </text>
              )}
              {hasTwoSeries && item.value2 != null && item.value2 > 0 && (
                <text
                  x={x2 + barWidth / 2}
                  y={y2 - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#334155"
                  fontWeight="600"
                >
                  {item.value2}
                </text>
              )}
              <text
                x={labelX}
                y={height - padding + 18}
                textAnchor="middle"
                fontSize="11"
                fill="#64748B"
              >
                {item.name}
              </text>
            </g>
          )
        })}
      </svg>
      {(label1 || label2) && (
        <div className="flex flex-wrap items-center justify-center gap-6 mt-4 pt-3 border-t border-neutral-light/20">
          {label1 && (
            <div className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded shrink-0"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              <span className="text-sm text-neutral-light">{label1}</span>
            </div>
          )}
          {label2 && (
            <div className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded shrink-0"
                style={{ backgroundColor: color2 }}
                aria-hidden
              />
              <span className="text-sm text-neutral-light">{label2}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}










