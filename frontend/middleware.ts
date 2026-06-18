import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// CRM routes that require authentication
const CRM_PROTECTED_PATHS = [
  '/crm/dashboard', '/crm/colleges', '/crm/contacts',
  '/crm/tasks', '/crm/activities', '/crm/deals',
  '/crm/reports', '/crm/team', '/crm/pipeline-setup',
]

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || ''
  const url = req.nextUrl.clone()
  const isSubdomain = hostname.startsWith('crm.')

  // PRODUCTION: crm.scholarplace.in — rewrite /dashboard -> /crm/dashboard etc.
  // Mutate url.pathname first so the JWT check below sees the rewritten path.
  if (isSubdomain && !url.pathname.startsWith('/crm')) {
    url.pathname = `/crm${url.pathname}`
  }

  // C-04: Protect CRM routes with server-side JWT verification
  if (CRM_PROTECTED_PATHS.some(p => url.pathname.startsWith(p))) {
    // Try cookie first (set at login), fall back to Authorization header
    const token = req.cookies.get('crm_token')?.value
                  || req.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.redirect(new URL('/crm/login', req.url))
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')
      const { payload } = await jwtVerify(token, secret)
      const role = (payload.role as string | undefined)?.toLowerCase()
                   || (payload.person_role as string | undefined)?.toLowerCase()

      if (role !== 'superadmin' && role !== 'crmexec') {
        return NextResponse.redirect(new URL('/crm/login', req.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/crm/login', req.url))
    }
  }

  // Apply the subdomain path rewrite if pathname was modified (e.g., /login -> /crm/login)
  if (isSubdomain && url.pathname !== req.nextUrl.pathname) {
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
}
