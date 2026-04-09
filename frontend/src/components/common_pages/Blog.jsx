import React from 'react';
import {Layout }  from '@/index.js';


const Blog = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">

        <section className="bg-white py-8">
          <div className="container mx-auto px-6 text-center">
            <div className="inline-block bg-primary text-white px-8 py-3 rounded-full mb-2">
              <h1 className="text-lg font-medium">Blog</h1>
            </div>
            <p className="text-sm text-gray-600 italic">
              Insights, stories, and updates from us.
            </p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="container mx-auto max-w-3xl text-center text-gray-700">
            Blog posts will appear here soon.
          </div>
        </section>

      </div>
    </Layout>
  );
};

export default Blog;