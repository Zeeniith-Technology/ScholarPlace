'use client'

import React from 'react'

/**
 * Renders markdown-like text (### ## ** ` * lists) without react-markdown.
 * Use this when the package is not installed or to avoid extra deps.
 */
export function renderMarkdown(text: string): React.ReactNode {
  if (!text || typeof text !== 'string') return null

  const lines = text.split('\n')
  const out: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trimEnd()

    // Headings
    if (trimmed.startsWith('### ')) {
      out.push(<h3 key={i} className="font-semibold text-neutral mt-4 mb-1 text-base">{parseInline(trimmed.slice(4))}</h3>)
      continue
    }
    if (trimmed.startsWith('## ')) {
      out.push(<h2 key={i} className="font-semibold text-neutral mt-4 mb-1 text-lg">{parseInline(trimmed.slice(3))}</h2>)
      continue
    }
    if (trimmed.startsWith('# ')) {
      out.push(<h1 key={i} className="font-semibold text-neutral mt-4 mb-1 text-xl">{parseInline(trimmed.slice(2))}</h1>)
      continue
    }

    // Bullet
    if (trimmed.startsWith('* ') && !trimmed.startsWith('**')) {
      out.push(<div key={i} className="ml-4 my-0.5">{parseInline(trimmed.slice(2))}</div>)
      continue
    }
    // Numbered
    const numMatch = trimmed.match(/^(\d+)\.\s/)
    if (numMatch) {
      out.push(<div key={i} className="ml-4 my-0.5">{parseInline(trimmed.slice(numMatch[0].length))}</div>)
      continue
    }

    // Empty line
    if (trimmed === '') {
      out.push(<br key={i} />)
      continue
    }

    out.push(<div key={i} className="my-0.5">{parseInline(trimmed)}</div>)
  }

  return <>{out}</>
}

/** Parse inline markdown: **bold**, *italic*, `code` */
function parseInline(str: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let remaining = str
  let key = 0

  while (remaining.length > 0) {
    const iBold = remaining.indexOf('**')
    const iCode = remaining.indexOf('`')
    const iItalic = remaining.match(/\*([^*])/)?.index ?? -1

    let next = -1
    let kind = ''
    if (iBold >= 0 && (next < 0 || iBold < next)) { next = iBold; kind = 'bold' }
    if (iCode >= 0 && (next < 0 || iCode < next)) { next = iCode; kind = 'code' }
    if (iItalic >= 0 && (next < 0 || iItalic < next)) { next = iItalic; kind = 'italic' }

    if (next > 0) {
      parts.push(remaining.slice(0, next))
      remaining = remaining.slice(next)
      continue
    }
    if (next < 0) {
      if (remaining) parts.push(remaining)
      break
    }

    if (kind === 'bold') {
      const end = remaining.indexOf('**', 2)
      if (end === -1) { parts.push(remaining); break }
      parts.push(<strong key={key++} className="font-semibold text-neutral">{remaining.slice(2, end)}</strong>)
      remaining = remaining.slice(end + 2)
    } else if (kind === 'code') {
      const end = remaining.indexOf('`', 1)
      if (end === -1) { parts.push(remaining); break }
      parts.push(<code key={key++} className="bg-neutral-light/10 px-1 rounded text-sm font-mono">{remaining.slice(1, end)}</code>)
      remaining = remaining.slice(end + 1)
    } else if (kind === 'italic') {
      const end = remaining.indexOf('*', 1)
      if (end === -1) { parts.push(remaining); break }
      parts.push(<em key={key++} className="italic">{remaining.slice(1, end)}</em>)
      remaining = remaining.slice(end + 1)
    }
  }

  return parts
}
