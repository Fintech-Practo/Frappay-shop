import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { Card, CardContent } from '@/components/ui/card';
import {Layout } from '@/index.js';
import { BRAND_EMAIL, BRAND_NAME, BRAND_PHONE } from '@/config/brand';


const ContactUs = () => {
  const { contact_email, contact_phone } = useSiteSettings();

  const contactDetails = [
    {
      icon: <Mail className="w-6 h-6 text-primary" />,
      title: 'Email Us',
      value: contact_email || BRAND_EMAIL,
      description: 'We usually respond within 24 hours',
      action: `mailto:${contact_email || BRAND_EMAIL}`
    },
    {
      icon: <Phone className="w-6 h-6 text-primary" />,
      title: 'Call Us',
      value: contact_phone || BRAND_PHONE,
      description: 'Monday to Saturday, 10am - 6pm',
      action: `tel:${contact_phone || '+918062180677'}`
    },
    {
      icon: <MapPin className="w-6 h-6 text-primary" />,
      title: 'Visit Us',
      value: 'Odisha, India',
      description: 'Corporate Office',
      action: '#'
    }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Contact Us</h1>
            <p className="text-lg text-muted-foreground">
              Have questions about {BRAND_NAME}? Our support team is here to help you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {contactDetails.map((detail, index) => (
              <Card key={index} className="border-none shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-8 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    {detail.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{detail.title}</h3>
                  <a
                    href={detail.action}
                    className="text-primary font-medium mb-2 hover:underline"
                  >
                    {detail.value}
                  </a>
                  <p className="text-sm text-muted-foreground">{detail.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-card rounded-3xl shadow-xl p-10 max-w-2xl mx-auto text-center border border-border">
            <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Support Hours</h2>
            <div className="space-y-2 text-muted-foreground">
              <p><span className="font-semibold text-foreground">Monday - Friday:</span> 9:00 AM - 8:00 PM</p>
              <p><span className="font-semibold text-foreground">Saturday:</span> 10:00 AM - 6:00 PM</p>
              <p><span className="font-semibold text-foreground">Sunday:</span> Closed</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ContactUs;
