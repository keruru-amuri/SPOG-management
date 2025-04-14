import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const isAuthenticated = !!token;
  
  // Define protected routes
  const isProtectedRoute = 
    request.nextUrl.pathname.startsWith('/dashboard') || 
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/item');
  
  // Define admin-only routes
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  
  // Check if user is trying to access a protected route without being authenticated
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Check if user is trying to access an admin route without being an admin
  if (isAdminRoute && token?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // If user is authenticated and trying to access login page, redirect to dashboard
  if (isAuthenticated && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: ['/', '/dashboard/:path*', '/admin/:path*', '/item/:path*'],
};
