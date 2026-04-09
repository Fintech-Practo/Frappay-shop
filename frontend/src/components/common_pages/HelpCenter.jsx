import { useState } from 'react';
import {Layout }  from '@/index.js';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { Mail, Phone, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/config/api';
import { BRAND_EMAIL, BRAND_NAME, BRAND_PHONE } from '@/config/brand';

const HelpCenter = () => {
  const { isAuthenticated, token } = useAuth();
  const { contact_email, contact_phone } = useSiteSettings();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.message.trim()) {
      toast({
        title: 'Message required',
        description: 'Please enter your message',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const res = await api.post('/api/support', formData);

      toast({
        title: 'Request Sent',
        description: 'We have received your request and will get back to you shortly.',
      });
      setFormData({ subject: '', message: '' });

    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">


  {/* Hero Section */}
        <section className="bg-background py-8">
          <div className="container mx-auto px-6 text-center">
            <div className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-full mb-2">
              <h1 className="text-lg font-medium">Help Center</h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto italic">
              Need help? Submit a request and our team will assist you.
            </p>
          </div>
        </section>

      
        {/* Contact + Message Box */}
        <section className="py-10">
          <div className="w-full max-w-5xl mx-auto px-4 md:px-6 space-y-8">

            {/* Contact Info Sidebar */}
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div className="space-y-6">
                <div className="bg-card p-8 rounded-3xl shadow-lg border border-border">
                  <h2 className="text-xl font-bold mb-6 text-foreground">Direct Support</h2>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Email Us</h3>
                        <p className="text-sm text-muted-foreground mb-1">For general inquiries and order support</p>
                        <a href={`mailto:${contact_email || BRAND_EMAIL}`} className="text-primary hover:underline font-medium">
                          {contact_email || BRAND_EMAIL}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Call Support</h3>
                        <p className="text-sm text-muted-foreground mb-1">Available Mon-Sat, 10am - 6pm</p>
                        <a href={`tel:${contact_phone || '+918062180677'}`} className="text-primary hover:underline font-medium">
                          {contact_phone || BRAND_PHONE}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 p-8 rounded-3xl border border-primary/10">
                  <h3 className="font-bold mb-2 text-foreground">Need a faster response?</h3>
                  <p className="text-sm text-muted-foreground">
                    Submit the form on the right, and the {BRAND_NAME} support team will pick it up directly.
                  </p>
                </div>
              </div>

              {/* Message Box (only if logged in) */}
              {isAuthenticated ? (
                <form
                  onSubmit={handleSubmit}
                  className="bg-card p-8 rounded-3xl shadow-lg border border-border space-y-4"
                >
                  <h2 className="text-xl font-bold text-center mb-4 text-foreground">
                    Submit a Request
                  </h2>

                  <div>
                    <Label>Subject (optional)</Label>
                    <Input
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="Brief summary of your issue"
                    />
                  </div>

                  <div>
                    <Label>Message *</Label>
                    <Textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={6}
                      placeholder="Describe your issue or question in detail..."
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-lg"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Submit Request'}
                  </Button>
                </form>
              ) : (
                <div className="text-center text-sm text-muted-foreground bg-card p-12 rounded-3xl shadow-lg border border-border flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Mail className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-foreground mb-2">Login Required</p>
                  <p className="mb-6 text-muted-foreground">Please login to submit a support request or use the direct contact methods.</p>
                  <Button asChild>
                    <Link to="/login">Go to Login</Link>
                  </Button>
                </div>
              )}
            </div>

          </div>
        </section>
      </div>
    </Layout>
  );
};

export default HelpCenter;
