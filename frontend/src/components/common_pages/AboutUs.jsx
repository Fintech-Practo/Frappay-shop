import React from 'react';
import { Layout } from '@/index.js';
import { BRAND_NAME, BRAND_TAGLINE } from '@/config/brand';

const AboutUs = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <section className="bg-background py-10">
          <div className="container mx-auto px-6 text-center">
            <div className="mb-3 inline-block rounded-full bg-primary px-8 py-3 text-primary-foreground">
              <h1 className="text-lg font-medium">About {BRAND_NAME}</h1>
            </div>

            <p className="mx-auto max-w-xl text-sm italic text-muted-foreground">
              {BRAND_TAGLINE}
            </p>
          </div>
        </section>

        <section className="px-6 py-2">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="rounded-3xl border border-border bg-card/80 p-12 shadow-2xl backdrop-blur-sm">
              <p className="mx-auto mb-10 max-w-3xl text-sm leading-relaxed text-foreground">
                {BRAND_NAME} is a modern storefront experience built for smooth discovery, dependable checkout,
                and seller-friendly operations. We focus on trust, clarity, speed, and a polished buying journey
                across every screen.
              </p>

              <div className="mt-16 grid gap-8 md:grid-cols-2">
                <div className="rounded-xl bg-primary/5 p-8 text-center transition-all duration-300 hover:shadow-md">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-xl text-primary-foreground">
                    F
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-foreground">Frictionless Shopping</h3>
                  <p className="text-muted-foreground">Cleaner navigation, search, and checkout moments</p>
                </div>
                <div className="rounded-xl bg-primary/5 p-8 text-center transition-all duration-300 hover:shadow-md">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-xl text-primary-foreground">
                    P
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-foreground">Payment Confidence</h3>
                  <p className="text-muted-foreground">Reliable, brand-forward commerce with secure flows</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-background px-6 py-16">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              Start Shopping with Confidence
            </h2>

            <a
              href="/products"
              className="inline-block rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Explore the Store
            </a>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default AboutUs;
