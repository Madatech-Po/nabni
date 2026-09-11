import HeroSection from '@/components/home/HeroSection';
import StatsSection from '@/components/home/StatsSection';
import FeaturedEducators from '@/components/home/FeaturedEducators';
import LatestRequests from '@/components/home/LatestRequests';
import CategoriesSection from '@/components/home/CategoriesSection';
import HowItWorksSection from '@/components/home/HowItWorksSection';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import EducatorCTASection from '@/components/home/EducatorCTASection';

export default function Home() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <FeaturedEducators />
      <LatestRequests />
      <CategoriesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <EducatorCTASection />
    </>
  );
}
