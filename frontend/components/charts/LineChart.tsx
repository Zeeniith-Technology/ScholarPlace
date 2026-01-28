'use client'

import React from 'react'

interface DataPoint {
  label: string
  value: number
}

interface LineChartProps {
  data: DataPoint[]
  height?: number
  color?: string
  showGrid?: boolean
}

export function LineChart({ data, height = 300, color = '#4F46E5', showGrid = true }: LineChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 100)
  const minValue = Math.min(...data.map((d) => d.value), 0)
  const range = maxValue - minValue || 1
  const width = 800
  const padding = 60
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * chartWidth
    const y = padding + chartHeight - ((point.value - minValue) / range) * chartHeight
    return { x, y, value: point.value, label: point.label }
  })

  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="w-full h-auto">
        {showGrid && (
          <g>
            {[0, 25, 50, 75, 100].map((value) => {
              const y = padding + chartHeight - ((value - minValue) / range) * chartHeight
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
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <g key={index}>
            <circle cx={point.x} cy={point.y} r={6} fill={color} />
            <circle cx={point.x} cy={point.y} r={10} fill={color} fillOpacity={0.2} />
            <text
              x={point.x}
              y={point.y - 15}
              textAnchor="middle"
              fontSize="12"
              fill="#1E293B"
              fontWeight="600"
            >
              {point.value}
            </text>
            <text
              x={point.x}
              y={height - padding + 20}
              textAnchor="middle"
              fontSize="11"
              fill="#64748B"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}










