import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const CRM_PROTECTED_PATHS = [
  '/crm/dashboard', '/crm/colleges', '/crm/contacts',
  '/crm/tasks', '/crm/activities', '/crm/deals',
  '/crm/reports', '/crm/team', '/crm/pipeline-setup',
]

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || ''
  const url = req.nextUrl.clone()
  const isSubdomain = hostname.startsWith('crm.')

  // On crm.scholarplace.in: rewrite /dashboard -> /crm/dashboard etc.
  if (isSubdomain && !url.pathname.startsWith('/crm')) {
    url.pathname = `/crm${url.pathname}`
  }

  // Protect CRM routes — just verify the token cookie exists.
  // Real JWT verification happens on every backend API call; no need to
  // duplicate crypto here (and it avoids JWT_SECRET env-var mismatches).
  if (CRM_PROTECTED_PATHS.some(p => url.pathname.startsWith(p))) {
    const token = req.cookies.get('crm_token')?.value

    if (!token) {
      const loginUrl = new URL('/crm/login', req.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Apply subdomain rewrite if the pathname was changed above
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
