const isCapacitor = process.env.CAPACITOR_BUILD === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "akcjzvftujuscaqnydzj.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
  ...(isCapacitor ? { output: 'export', images: { unoptimized: true } } : {}),
};

export default nextConfig;
