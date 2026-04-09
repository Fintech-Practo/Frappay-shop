import Header from './Header';
import Footer from './Footer';
import {ChatBot} from '@/index.js';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatBot />
    </div>
  );
}
