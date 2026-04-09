import {Layout, HeroSection,CategorySection,FeaturedProducts,PromoBanner} from '@/index.js';

export default function Index() {
  return (
    <Layout>
      <HeroSection />
      <CategorySection />
      {/* <div className="container mx-auto px-4 py-12">
        <PreferenceDisplay />
      </div> */}
      <FeaturedProducts />
      <PromoBanner />
    </Layout>
  );
}