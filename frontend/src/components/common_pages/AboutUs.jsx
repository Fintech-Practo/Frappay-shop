import React from 'react';
import {Layout } from '@/index.js';


const AboutUs = () => {
  return (
    
      <Layout>
        <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="bg-background py-10">
  <div className="container mx-auto px-6 text-center">
    
    <div className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-full mb-3">
      <h1 className="text-lg font-medium">
        About Books & Copies
      </h1>
    </div>

    <p className="text-sm text-muted-foreground max-w-xl mx-auto italic">
      Books & Copy is an online bookstore focused exclusively on books.
    </p>

  </div>
</section>



        {/* Content Section */}
        <section className="py-2 px-6">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="bg-card/80 backdrop-blur-sm p-12 rounded-3xl shadow-2xl border border-border">
              <p className="text-sm text-foreground leading-relaxed mb-10 max-w-3xl mx-auto">
                We make it easy for readers to discover, purchase, and receive books through a simple and secure shopping experience. 
                Our goal is to make books accessible, affordable, and enjoyable for everyone.
              </p>
              
              <div className="grid md:grid-cols-2 gap-8 mt-16">
                <div className="bg-primary/5 p-8 rounded-xl text-center hover:shadow-md transition-all duration-300">
                  <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4 text-xl text-primary-foreground">
                    📖
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">Discover</h3>
                  <p className="text-muted-foreground">Find your next favorite book</p>
                </div>
                <div className="bg-primary/5 p-8 rounded-xl text-center hover:shadow-md transition-all duration-300">
                  <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4 text-xl text-primary-foreground">
                    🛒
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">Purchase Securely</h3>
                  <p className="text-muted-foreground">Simple and safe shopping</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-6 bg-background">
  <div className="container mx-auto text-center max-w-4xl">
    <h2 className="text-xl font-semibold text-foreground mb-4">
      Start Reading Today
    </h2>

    <a
      href="/products"
      className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
    >
      Browse Books
    </a>
  </div>
</section>
      </div>    
      </Layout>
      
    
  );
};

export default AboutUs;