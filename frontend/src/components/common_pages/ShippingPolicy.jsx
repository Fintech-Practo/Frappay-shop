import { Layout } from '@/index.js';
import { useState } from "react";

const sections = [
  {
    id: 1,
    title: "Shipping Partners",
    content: `We partner with trusted courier services such as Delhivery, Shiprocket, India Post, DTDC, FedEx, and other logistics providers to ensure reliable delivery.`,
  },
  {
    id: 2,
    title: "Shipping Charges",
    content: `• Shipping charges are calculated based on order weight and delivery location.
• Final shipping cost is displayed at checkout with no hidden charges.
• Free shipping may be offered on select orders or promotional campaigns as decided by the company from time to time.`,
  },
  {
    id: 3,
    title: "Order Processing",
    content: `• Orders are processed within 1–2 business days.
• Orders may be shipped the same or next working day.
• Customers receive updates via SMS/email after dispatch.
• You can always check the status from the My Orders page.`,
  },
  {
    id: 4,
    title: "Delivery Timeline",
    content: `• Delivery across India typically takes 3–7 business days after dispatch.
• Delays may occur due to external factors like courier issues or remote locations.`,
  },
  {
    id: 5,
    title: "Shipping Coverage",
    content: `Currently, we ship only within India and our delivery service is available to almost all major PIN codes.`,
  },
  {
    id: 6,
    title: "Order Tracking",
    content: `• A tracking link/ID will be shared once the order is shipped.
• You can also find the same in the My Orders page.
• We also offer an open tracking link to track order delivery.`,
  },
  {
    id: 7,
    title: "Incorrect Address",
    content: `• Customers must provide accurate shipping details.
• We are not responsible for delivery failures due to incorrect addresses.`,
  },
  {
    id: 8,
    title: "Lost or Damaged Shipments",
    content: `While we ensure proper packaging, we are not liable for damage or loss after dispatch.
However, we will assist in resolving issues with the courier partner.`,
  },
  {
    id: 9,
    title: "Policy Updates",
    content: `We reserve the right to update this policy at any time. Changes will be posted on our website.`,
  },

  // ✅ FIXED SECTION 10 (Clickable Link)
  {
    id: 10,
    title: "Contact Us",
    content: (
      <>
        For any queries regarding delivery, cancellations, refunds, or replacements, reach out to us at{" "}
        <a
          href="https://booksandcopies.com/help"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          https://booksandcopies.com/help
        </a>
      </>
    ),
  },
];

const AccordionItem = ({ section, isOpen, onToggle }) => (
  <div className="border-b border-border transition-colors duration-200 hover:bg-muted/30">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-6 py-4 text-left gap-4 cursor-pointer bg-transparent border-none"
    >
      <div className="flex items-center gap-4">
        <span
          className="font-display italic text-xs text-primary min-w-[2rem] font-normal"
          style={{ letterSpacing: "0.04em" }}
        >
          {String(section.id).padStart(2, "0")}
        </span>
        <span
          className="font-display text-foreground font-semibold"
          style={{ fontSize: "0.97rem", letterSpacing: "0.01em" }}
        >
          {section.title}
        </span>
      </div>
      <span
        className="text-primary flex-shrink-0 leading-none transition-transform duration-300"
        style={{
          fontSize: "1.1rem",
          transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
          display: "inline-block",
        }}
      >
        +
      </span>
    </button>
    <div
      style={{
        maxHeight: isOpen ? "3000px" : "0",
        overflow: "hidden",
        transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <div
        className="font-body text-muted-foreground"
        style={{
          padding: "0 1.5rem 1.4rem 4rem",
          fontSize: "0.875rem",
          lineHeight: "1.85",
          whiteSpace: "pre-line",
        }}
      >
        {section.content}
      </div>
    </div>
  </div>
);

const ShippingPolicy = () => {
  const [openId, setOpenId] = useState(null);
  const toggle = (id) => setOpenId(openId === id ? null : id);

  return (
    <Layout>
      <div className="min-h-screen bg-background">

        {/* Header */}
        <section className="pt-12 pb-8 px-6 text-center">
          <p
            className="font-display italic text-primary text-xs uppercase mb-3"
            style={{ letterSpacing: "0.18em" }}
          >
            BooksandCopies · PractoMind Solutions LLP
          </p>
          <h1
            className="font-display font-bold text-foreground"
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
            }}
          >
            Shipping Policy
          </h1>
          <div
            className="mx-auto mt-5"
            style={{
              width: "48px",
              height: "2px",
              background: "hsl(var(--primary))",
            }}
          />
        </section>

        {/* Intro block */}
        <section className="px-6 pb-10">
          <div className="max-w-[1100px] mx-auto">
            <div
              className="bg-secondary border border-border rounded font-body text-foreground"
              style={{ padding: "1.4rem 1.75rem", fontSize: "0.875rem", lineHeight: "1.8" }}
            >
              At <strong className="font-semibold">BooksandCopies</strong> (www.booksandcopies.com),
              we aim to deliver books, notebooks, and office supplies efficiently and securely across India.
              <br /><br />
              <em className="text-muted-foreground">
                Please read this policy carefully before placing an order. By purchasing on our
                platform, you agree to the terms outlined below.
              </em>
            </div>
          </div>
        </section>

        {/* Accordion sections */}
        <section className="px-6 pb-20">
         <div
  className="max-w-[1100px] mx-auto bg-card border border-border rounded-md overflow-hidden"
  style={{ boxShadow: "var(--shadow-lg)" }}
>
  <div className="grid grid-cols-1 md:grid-cols-2">
    {sections.map((section) => (
      <AccordionItem
        key={section.id}
        section={section}
        isOpen={openId === section.id}
        onToggle={() => toggle(section.id)}
      />
    ))}
  </div>
</div>

          {/* Footer note */}
          <p className="max-w-[760px] mx-auto mt-8 text-center font-display italic text-muted-foreground text-sm">
            For any delivery or shipping queries, reach us at{" "}
            <a
              href="https://booksandcopies.com/help"
              className="text-primary underline underline-offset-2"
            >
              booksandcopies.com/help
            </a>
          </p>
        </section>

      </div>
    </Layout>
  );
};

export default ShippingPolicy;