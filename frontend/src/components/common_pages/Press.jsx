import {Layout } from '@/index.js';

const Press = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-background">

        <section className="bg-card py-8">
          <div className="container mx-auto px-6 text-center">
            <div className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-full mb-2">
              <h1 className="text-lg font-medium">Press</h1>
            </div>
            <p className="text-sm text-muted-foreground italic">
              Media coverage and official announcements.
            </p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="container mx-auto max-w-3xl text-center text-muted-foreground">
            Press releases and media information will be published here.
          </div>
        </section>

      </div>
    </Layout>
  );
};

export default Press;