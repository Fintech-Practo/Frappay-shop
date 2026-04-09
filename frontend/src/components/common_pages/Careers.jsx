import React from 'react';
import {Layout } from '@/index.js';


const Careers = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">

        <section className="bg-white py-8">
          <div className="container mx-auto px-6 text-center">
            <div className="inline-block bg-primary text-white px-8 py-3 rounded-full mb-2">
              <h1 className="text-lg font-medium">Careers</h1>
            </div>
            <p className="text-sm text-gray-600 max-w-xl mx-auto italic">
              Explore career opportunities with Books & Copies.
            </p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="container mx-auto max-w-3xl text-center text-gray-700">
            Job openings and hiring details will be updated here.
          </div>
        </section>

      </div>
    </Layout>
  );
};

export default Careers;