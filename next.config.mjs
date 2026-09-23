import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // The parent folder holds the old Vite prototype and its own lockfile, so
  // Next guesses the wrong workspace root. Pin it to this app.
  outputFileTracingRoot: path.resolve(import.meta.dirname),
};

export default nextConfig;
