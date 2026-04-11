/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/liff/events/:id/register",
        destination: "/liff/events/:id",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
