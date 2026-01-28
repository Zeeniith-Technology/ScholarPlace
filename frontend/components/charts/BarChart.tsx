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
}

export function BarChart({
  data,
  height = 300,
  color = '#4F46E5',
  color2,
  showGrid = true,
  label1,
  label2,
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => Math.max(d.value, d.value2 || 0)), 100)
  const width = 800
  const padding = 60
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2
  const barWidth = chartWidth / (data.length * (color2 ? 2.5 : 1.5))
  const gap = barWidth * 0.3

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="w-full h-auto">
        {showGrid && (
          <g>
            {[0, 25, 50, 75, 100].map((value) => {
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
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding - 10}
                    y={y + 5}
                    textAnchor="end"
                    fontSize="12"
                    fill="#64748B"
                  >
                    {value}
                  </text>
                </g>
              )
            })}
          </g>
        )}
        {data.map((item, index) => {
          const x = padding + (index * chartWidth) / data.length + gap
          const barHeight1 = (item.value / maxValue) * chartHeight
          const y1 = padding + chartHeight - barHeight1
          const barHeight2 = color2 && item.value2 ? (item.value2 / maxValue) * chartHeight : 0
          const y2 = padding + chartHeight - barHeight2

          return (
            <g key={index}>
              <rect
                x={x}
                y={y1}
                width={barWidth}
                height={barHeight1}
                fill={color}
                rx={8}
              />
              {color2 && item.value2 && (
                <rect
                  x={x + barWidth + gap / 2}
                  y={y2}
                  width={barWidth}
                  height={barHeight2}
                  fill={color2}
                  rx={8}
                />
              )}
              <text
                x={x + barWidth / 2}
                y={y1 - 5}
                textAnchor="middle"
                fontSize="11"
                fill="#1E293B"
                fontWeight="600"
              >
                {item.value}
              </text>
              {color2 && item.value2 && (
                <text
                  x={x + barWidth + gap / 2 + barWidth / 2}
                  y={y2 - 5}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#1E293B"
                  fontWeight="600"
                >
                  {item.value2}
                </text>
              )}
              <text
                x={x + (color2 ? barWidth + gap / 4 : barWidth / 2)}
                y={height - padding + 20}
                textAnchor="middle"
                fontSize="11"
                fill="#64748B"
              >
                {item.name}
              </text>
            </g>
          )
        })}
        {(label1 || label2) && (
          <g transform={`translate(${width - padding - 100}, ${padding})`}>
            {label1 && (
              <g>
                <rect width={12} height={12} fill={color} rx={2} />
                <text x={18} y={10} fontSize="12" fill="#64748B">
                  {label1}
                </text>
              </g>
            )}
            {label2 && (
              <g transform={`translate(0, 20)`}>
                <rect width={12} height={12} fill={color2} rx={2} />
                <text x={18} y={10} fontSize="12" fill="#64748B">
                  {label2}
                </text>
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  )
}










