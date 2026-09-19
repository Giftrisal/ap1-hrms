import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AP1 Staff Portal',
    short_name: 'Staff Portal',
    description: 'AP1 Television HD Staff Self-Service Portal - Attendance, Leave, Payslips & Digital ID',
    start_url: '/portal',
    id: '/portal',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#020617',
    theme_color: '#7e22ce',
    icons: [
      {
        src: '/ap1-logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/ap1-logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
    ],
  };
}
