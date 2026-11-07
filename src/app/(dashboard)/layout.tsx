import SiteLayout from '@/components/layout/SiteLayout';

// Parent and educator dashboards share the site header, so there is always a way home (NAB-93).
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <SiteLayout>{children}</SiteLayout>;
}
