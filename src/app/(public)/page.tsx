import HeroSection from '@/components/home/HeroSection';
import StatsSection from '@/components/home/StatsSection';
import FeaturedEducators from '@/components/home/FeaturedEducators';
import LatestRequests, { LATEST_REQUESTS_COUNT } from '@/components/home/LatestRequests';
import CategoriesSection from '@/components/home/CategoriesSection';
import HowItWorksSection from '@/components/home/HowItWorksSection';
import EducatorCTASection from '@/components/home/EducatorCTASection';
import { getPublicHomeStats } from '@/services/homeStats';
import { getEducators } from '@/services/tutors';
import { getOpenRequests } from '@/services/requests';

/** How many verified educators the home carousel shows at most. */
const FEATURED_EDUCATORS_COUNT = 8;

// Everything on the home page is real data (NAB-123). If a source fails, its section hides
// instead of breaking the page or showing placeholders.
export default async function Home() {
  const [stats, educators, requests] = await Promise.all([
    getPublicHomeStats(),
    getEducators().catch(() => []),
    getOpenRequests().catch(() => []),
  ]);

  return (
    <>
      <HeroSection />
      <StatsSection stats={stats} />
      <FeaturedEducators educators={educators.slice(0, FEATURED_EDUCATORS_COUNT)} />
      <LatestRequests requests={requests.slice(0, LATEST_REQUESTS_COUNT)} />
      <CategoriesSection />
      <HowItWorksSection />
      {/* TestimonialsSection stays out until there are real ratings (see the note in that file). */}
      <EducatorCTASection />
    </>
  );
}
