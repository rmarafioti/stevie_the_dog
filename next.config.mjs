// Next.js config.
/** @type {import('next').NextConfig} */
const nextConfig = {
  // next/image may load only this site's own Cloudinary folders (docs/client-website.md).
  images: {
    remotePatterns: [
      // Uploads from the CMS: production, then local testing.
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dzpne110u/image/upload/*/3dwd/steviethedog/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dzpne110u/image/upload/*/3dwd-dev/steviethedog/**",
      },
      // This website's own static images.
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dzpne110u/image/upload/**/stevie_the_dog/**",
      },
    ],
  },
};

export default nextConfig;
