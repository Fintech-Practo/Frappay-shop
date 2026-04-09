import { Layout } from '@/index.js';
import { useState } from "react";

const sections = [
  {
    id: 1,
    title: "Order Cancellation",
    content: `• You can cancel your order any time before it is delivered.
• Simply visit your Order History page and click on the "Cancel" option (if applicable).
• The cancellation option will only be visible for eligible orders.
• You can click on the cancel button to cancel the order.`,
  },
  {
    id: 2,
    title: "Refund Policy (Prepaid Orders)",
    content: `Before Shipment:
If the order is cancelled before dispatch, the refund will be processed to the original payment method within 5-7 business days.
Platform fees if charged will not be refunded.

After Shipment:
If the order is already marked as "Shipped" or "In-Transit", we will initiate a return request with our logistics partner.
Returns are usually initiated within 24 hours of cancellation.
Refunds will be processed only after the return process completes.
If the order gets delivered, cancellation/refund will not be possible.`,
  },
  {
    id: 3,
    title: "Refund & Cancellation Updates",
    content: `• You will receive confirmation via email/SMS/WhatsApp once your cancellation is successful.
• A second notification will be sent once the refund reference ID is generated.
• Refunds typically reflect within 5–7 business days in your original payment source.`,
  },
  {
    id: 4,
    title: "Returns & Replacements",
    content: `We do not accept returns. However, replacements are available in the following cases (within 7 days of delivery):

• Incorrect product delivered
• Missing items
• Damaged products

To request a replacement, contact us through our official channels as mentioned at https://booksandcopies.com/help

Additional details may be required for verification.

Once approved, a new order ID will be generated for the replacement, and you have to handover the old product at the time of delivery of the new order. In case the delivery partner finds the replaced item is not as per details provided by you the delivery can be denied and replacement order will be cancelled.`,
  },
  {
    id: 5,
    title: "Important Notes",
    content: `• In rare cases, refund processing may fail due to payment gateway issues. Please contact us, and we will assist within 24 hours.
• Wallet balances or credits are non-refundable to the original payment source.`,
  },
  {
    id: 6,
    title: "Contact Us",
    content: `For any queries regarding cancellations, refunds, or replacements, reach out to us at https://booksandcopies.com/help`,
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
        {
          section.content
            .split(/(https:\/\/booksandcopies\.com\/help|www\.booksandcopies\.com)/g)
            .map((part, index) => {
              if (part === "https://booksandcopies.com/help") {
                return (
                  <a
                    key={index}
                    href="https://booksandcopies.com/help"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    https://booksandcopies.com/help
                  </a>
                );
              }

              if (part === "www.booksandcopies.com") {
                return (
                  <a
                    key={index}
                    href="https://www.booksandcopies.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    www.booksandcopies.com
                  </a>
                );
              }

              return part;
            })
        }
      </div>
    </div>
  </div>
);

const RefundPolicy = () => {
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
            Cancellations &amp; Refunds Policy
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

        {/* Intro */}
        <section className="px-6 pb-10">
          <div className="max-w-[1100px] mx-auto">
            <div
              className="bg-secondary border border-border rounded font-body text-foreground"
              style={{ padding: "1.4rem 1.75rem", fontSize: "0.875rem", lineHeight: "1.8" }}
            >
              This policy outlines how cancellations, refunds, returns, and replacements are handled
              for orders placed on <strong>BooksandCopies</strong> (www.booksandcopies.com),
              operated by <strong>PractoMind Solutions LLP</strong>.
              <br /><br />
              <em className="text-muted-foreground">
                Please read this policy carefully before placing an order. By purchasing on our
                platform, you agree to the terms outlined below.
              </em>
            </div>
          </div>
        </section>

        {/* Sections */}
        <section className="px-6 pb-20">
          <div className="max-w-[1100px] mx-auto bg-card border border-border rounded-md overflow-hidden">
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

          {/* Footer */}
          <p className="max-w-[760px] mx-auto mt-8 text-center font-display italic text-muted-foreground text-sm">
            For any cancellation or refund queries, reach us at{" "}
            <a
              href="https://booksandcopies.com/help"
              className="text-primary underline"
            >
              booksandcopies.com/help
            </a>
          </p>
        </section>

      </div>
    </Layout>
  );
};

export default RefundPolicy;