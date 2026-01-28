'use client'

import React from 'react'

interface AreaData {
  label: string
  value: number
  value2?: number
}

interface AreaChartProps {
  data: AreaData[]
  height?: number
  color?: string
  color2?: string
  label1?: string
  label2?: string
}

export function AreaChart({
  data,
  height = 300,
  color = '#4F46E5',
  color2,
  label1,
  label2,
}: AreaChartProps) {
  const maxValue = Math.max(...data.map((d) => Math.max(d.value, d.value2 || 0)), 100)
  const minValue = Math.min(...data.map((d) => Math.min(d.value, d.value2 || 0)), 0)
  const range = maxValue - minValue || 1
  const width = 800
  const padding = 60
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const points1 = data.map((point, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * chartWidth
    const y = padding + chartHeight - ((point.value - minValue) / range) * chartHeight
    return { x, y, value: point.value }
  })

  const points2 = color2 && data[0].value2
    ? data.map((point, index) => {
        const x = padding + (index / (data.length - 1 || 1)) * chartWidth
        const y = padding + chartHeight - ((point.value2! - minValue) / range) * chartHeight
        return { x, y, value: point.value2! }
      })
    : []

  const pathData1 = [
    `M ${points1[0].x} ${padding + chartHeight}`,
    ...points1.map((p) => `L ${p.x} ${p.y}`),
    `L ${points1[points1.length - 1].x} ${padding + chartHeight}`,
    'Z',
  ].join(' ')

  const pathData2 = points2.length
    ? [
        `M ${points2[0].x} ${padding + chartHeight}`,
        ...points2.map((p) => `L ${p.x} ${p.y}`),
        `L ${points2[points2.length - 1].x} ${padding + chartHeight}`,
        'Z',
      ].join(' ')
    : ''

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="w-full h-auto">
        <defs>
          <linearGradient id="gradient1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          {color2 && (
            <linearGradient id="gradient2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color2} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color2} stopOpacity={0} />
            </linearGradient>
          )}
        </defs>
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
        {pathData2 && (
          <path
            d={pathData2}
            fill="url(#gradient2)"
            stroke={color2}
            strokeWidth={2}
          />
        )}
        <path
          d={pathData1}
          fill="url(#gradient1)"
          stroke={color}
          strokeWidth={2}
        />
        {points1.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r={4} fill={color} />
        ))}
        {points2.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r={4} fill={color2} />
        ))}
        {data.map((item, index) => {
          const x = padding + (index / (data.length - 1 || 1)) * chartWidth
          return (
            <text
              key={index}
              x={x}
              y={height - padding + 20}
              textAnchor="middle"
              fontSize="11"
              fill="#64748B"
            >
              {item.label}
            </text>
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










