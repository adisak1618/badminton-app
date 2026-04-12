/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/liff/events/:id/register", destination: "/events/:id", permanent: true },
      { source: "/liff/events/:id", destination: "/events/:id", permanent: true },
      { source: "/liff/events/create", destination: "/events/create", permanent: true },
      { source: "/liff/events/templates", destination: "/events/templates", permanent: true },
      { source: "/liff/events/templates/:id/edit", destination: "/events/templates/:id/edit", permanent: true },
      { source: "/liff/setup", destination: "/setup", permanent: true },
      { source: "/liff/profile", destination: "/profile", permanent: true },
    ];
  },
};

export default nextConfig;
