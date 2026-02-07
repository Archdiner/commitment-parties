'use client';

import dynamic from 'next/dynamic';

// Dynamically import Navbar with SSR disabled to prevent build errors
// Other pages in the codebase still use Privy hooks which require client-side rendering
const Navbar = dynamic(() => import('./Navbar').then(mod => ({ default: mod.Navbar })), {
  ssr: false,
});

export function NavbarWrapper() {
  return <Navbar />;
}
