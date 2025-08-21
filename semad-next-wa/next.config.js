/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // evita que Next empaquete pdfkit y pierda las fuentes AFM
    serverComponentsExternalPackages: ['pdfkit', 'qrcode'],
  },
};

module.exports = nextConfig;
