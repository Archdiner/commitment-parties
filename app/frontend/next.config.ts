import type { NextConfig } from "next";
import webpack from "webpack";

const nextConfig: NextConfig = {
  // Prevent bundling of problematic packages
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
  
  // Use webpack instead of Turbopack for better compatibility with Privy dependencies
  experimental: {
    webpackBuildWorker: true,
  },

  // Empty turbopack config to allow --webpack flag without error in Next.js 16
  turbopack: {},

  // =====================================================================
  // PRE-LAUNCH MODE: Redirect ALL app routes to the landing page.
  // The app is disabled for users — only the root "/" is accessible.
  // Pages are preserved in the codebase but not reachable.
  // Remove this block when ready to launch the full app.
  // =====================================================================
  async redirects() {
    return [
      { source: '/pools', destination: '/', permanent: false },
      { source: '/pools/:path*', destination: '/', permanent: false },
      { source: '/create', destination: '/', permanent: false },
      { source: '/dashboard', destination: '/', permanent: false },
      { source: '/faq', destination: '/', permanent: false },
      { source: '/how-to', destination: '/', permanent: false },
      { source: '/contact', destination: '/', permanent: false },
      { source: '/terms', destination: '/', permanent: false },
      { source: '/privacy', destination: '/', permanent: false },
      { source: '/verify-github', destination: '/', permanent: false },
      { source: '/verify-github/:path*', destination: '/', permanent: false },
    ];
  },

  webpack: (config, { isServer }) => {
    // Ignore test files and optional dependencies that cause build issues
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^why-is-node-running$/,
      })
    );
    
    // Ignore thread-stream test files
    config.plugins.push(
      new webpack.IgnorePlugin({
        checkResource(resource: string) {
          return resource.includes('thread-stream/test');
        },
      })
    );
    
    return config;
  },
};

export default nextConfig;
