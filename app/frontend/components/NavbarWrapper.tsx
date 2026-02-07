'use client';

import { Navbar } from './Navbar';

// NOTE: Previously used dynamic(() => import('./Navbar'), { ssr: false })
// because Navbar depended on Privy hooks. No longer needed in landing-page mode.
// Restore dynamic import when re-enabling the full app with Privy.

export function NavbarWrapper() {
  return <Navbar />;
}
