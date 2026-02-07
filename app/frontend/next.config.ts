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
