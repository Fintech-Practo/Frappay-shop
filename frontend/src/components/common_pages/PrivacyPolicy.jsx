import { Layout } from '@/index.js';
import { useState } from "react";

const sections = [
  {
    id: 1,
    title: "General",
    content: `By accessing or using our website or providing your information to us, you affirm that you possess the legal capacity to enter into a binding agreement under Indian law, specifically the Indian Contract Act, 1872. You also confirm that you have read, understood, and accepted the practices and policies outlined in this Privacy Policy, and agree to adhere to its terms.

You consent to the collection, use, sharing, and disclosure of your information as described in this Privacy Policy. We reserve the right to amend, modify, add, or remove portions of the Privacy Policy at our sole discretion. Continued use of the website following any such changes will constitute implicit acceptance of the revised Privacy Policy. If you access or use the website from an overseas location, you do so at your own risk and are responsible for compliance with all applicable local laws.

IF YOU DO NOT AGREE WITH THIS PRIVACY POLICY AT ANY TIME, IN PART OR AS A WHOLE, CONTACT OUR COMPLIANCE OFFICER, DO NOT USE THE WEBSITE OR SERVICES PROVIDED ON THE WEBSITE, OR PROVIDE US WITH ANY OF YOUR INFORMATION.`,
  },
  {
    id: 2,
    title: "Information Collected and Means of Collection",
    content: `We collect the following personal information:

(a) Registration Information: When you sign up, we collect your phone number, email address, and name, verifying your phone number with a one-time password.

(b) Order Information: To process orders, we gather cart items, postal address, and payment transaction details, but do not collect bank account or card information.

(c) Usage Information: We track how you use our Website, including device and software details, traffic sources, IP address, browser, operating system, login status, access times, location, order history, and payment/browsing records. We also collect required data for third-party services you use on our Website.`,
  },
  {
    id: 3,
    title: "Use of Information",
    content: `We use your information for the following reasons:

(a) To operate, improve, and analyze our Website, Products, and Services;
(b) To process orders and manage your access and purchases;
(c) For research, analytics, trend tracking, ratings, recommendations, and product development;
(d) For compliance, audits, quality assessment, billing, ad reporting, and market research;
(e) To comply with laws and investigate fraud or safety issues;
(f) To communicate with you regarding orders, updates, queries, promotions, changes, or offers via SMS, email, or phone;
(g) To enhance customer experience and satisfaction.

To opt out of non-essential communications (like marketing), email us using the details in our contact section.`,
  },
  {
    id: 4,
    title: "Disclosure of Information",
    content: `We may share your Personal Information with third parties as outlined below:

• With logistics partners to process your orders;
• With onboarded sellers to arrange dispatch;
• With partners, affiliates, investors, stakeholders, or associates in anonymized, aggregated form for understanding Website usage and improving user experience;
• With clients, partners, users, payment aggregators and other third parties in aggregated anonymous form for delivering relevant services, advertising and marketing;
• With a third party acquiring our business through merger, consolidation, or asset purchase;
• With third parties, including those outside India, to enhance our Products and Services;
• When legally required by government order or to comply with legal process, protect rights and property, prevent a crime, or ensure users' or public safety.

Transfers outside India will only occur where the recipient provides data protection equal to Indian law. By using the Website, you consent to storage and processing of your Personal Information by third parties, including outside India, and to transfer, sharing, and disclosure as per this Privacy Policy.`,
  },
  {
    id: 5,
    title: "Third-Party Links",
    content: `The Website contains links to external sites, apps, and resources ("Third Party Links") provided by entities other than us. We don't control these Third Party Links and are not responsible for any information collected or disclosed by them. Their presence does not imply our endorsement or recommendation.

We are not liable for any loss or damage resulting from your use of Third Party Links, including reliance on their advertising, products, services, or materials. Transactions between you and third parties are independent, and we are not involved in disputes arising from such interactions.

Third party websites and applications may have their own privacy policies. Please review these policies and exercise caution before sharing information or engaging in transactions with them.`,
  },
  {
    id: 6,
    title: "Access and Changes to Your Information",
    content: `You can access your information in the "your account" section. To withdraw consent, delete your account on our website or app by selecting "Delete User Account."

To review, update, or delete your Registration and Order Information, contact us using the details provided below. We will process deletion requests within a reasonable time unless legal requirements mandate retention.

If you delete or alter your Personal Information so it cannot be verified or becomes incorrect, we may be unable to provide access to our Website or Services, which may result in discontinuation as outlined in the Terms.

We reserve the right to verify your identity and information for accurate delivery of Products and Services. Access, correction, or deletion of Personal Information may be limited if it infringes on others' rights or is prohibited by law.`,
  },
  {
    id: 7,
    title: "Security and Retention of Information",
    content: `Security of Your Information:

    We are committed to maintaining physical, technical, and procedural safeguards appropriate for protecting your information from loss, misuse, copying, damage, modification, unauthorized access, or disclosure. Our security measures include regular reviews of our information collection, storage, and processing practices, as well as the implementation of physical security measures to prevent unauthorized system access. Access to Personal Information is restricted to employees and agents who require such information for processing purposes and who are bound by strict contractual confidentiality obligations. Non-compliance with these obligations may result in disciplinary action or termination of their relationship with us.

    No employee or administrator of the Company will have access to your account password on the Website. It is important that you safeguard your password and mobile device, as outlined in the ‘User Account, Password and Security’ section of the Terms. Please ensure that you log out from the Website upon completion of your session. We disclaim any liability for unauthorized use of your account or password.

    If you suspect any unauthorized use of your account, please notify us immediately via the contact details provided in the contact section. You will be held liable to indemnify us for any losses resulting from unauthorized use of your account or password.

    Furthermore, we are not responsible for breaches of security or actions of third parties or events outside our reasonable control, including but not limited to governmental actions, computer hacking, unauthorized access to data and storage devices, system failures, breaches of security or encryption, poor internet or telephone service quality, etc.

    Retention of Information:

    We ensure that your Personal Information in our possession or under our control is destroyed or anonymized once it is reasonable to conclude that (i) the purposes for which it has been collected have been fulfilled; and (ii) retention is no longer necessary for any other reason.

    However, we reserve the right to retain and store your Personal Information for business purposes, regardless of whether such information has been deleted. Over time, your data may be anonymized, aggregated, and retained as needed to facilitate product purchases, provision of services, or for analytics.

    If you wish to withdraw your consent for the processing of your Personal Information, cancel your account, or request that we cease using your information to provide products or services, please contact us at the details provided below. Please note that withdrawal of consent or account cancellation may prevent us from delivering certain products or services or may terminate any ongoing relationships.

    Uninstalling our mobile application will not automatically delete your Personal Information.
`,
  },
  {
    id: 8,
    title: "Cookies and Other Tracking Technologies",
    content: `We use cookies and tracking technologies, including session and local variables, to collect data about website activity and enhance your experience. Cookies are small files that store information, which browsers or mobile apps can control, block, or remove through settings.

Tracking technologies may log domain names, IP addresses, browser types, operating systems, access patterns, and timestamps. Refusing cookies may limit access to certain website features and interest-based advertising. You can manage or delete cookies via your device's help files or browser settings.`,
  },
  {
    id: 9,
    title: "Changes to the Policy",
    content: `We may update, change, or modify this Privacy Policy at any time. The revised policy will take effect from the date of the update. By continuing to use the Website after changes are made, you give your implied consent to the updated Privacy Policy.`,
  },
  {
    id: 10,
    title: "Miscellaneous",
    content: `(a) Disclaimer: While we aim to protect your privacy, we cannot guarantee that your Personal Information will never be disclosed in ways outside this Privacy Policy. You should not expect your information or private messages to always remain confidential. By using the Website, you acknowledge and accept all risks and responsibility for your actions, the information you share or access, and your conduct both on and off the Website.

(b) Indemnity: You agree to indemnify us against any claims or disputes from third parties resulting from your disclosure of information to them, whether through our Website or elsewhere, and from your use of third-party websites, apps, and resources. We are not liable for any actions taken by third parties regarding your Personal Information or SPDI that you have shared with them.

(c) Severability: Every clause in this Privacy Policy is distinct, independent, and separable from the others, unless expressly stated or indicated by context. If one or more clauses are found invalid, the remaining clauses will continue to apply.`,
  },
  {
    id: 11,
    title: "Grievance Officer",
    content: `In accordance with the IT Act, the name and contact details of the Grievance Officer are provided below:

Name: 
Address:
Email: 

We welcome feedback on this Privacy Policy at hello@practomind.com and will make reasonable efforts to address it.`,
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
        maxHeight: isOpen ? "2000px" : "0",
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

const PrivacyPolicy = () => {
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
            Privacy Policy
          </h1>
          {/* Underline accent using primary color */}
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
              <strong className="font-semibold">BooksandCopies</strong>{" "}
              (<a href="https://booksandcopies.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">https://booksandcopies.com</a>) is an internet and mobile application-based platform
              ("Website") operated by{" "}
              <strong className="font-semibold">PractoMind Solutions LLP</strong> ("Company",
              "we", "our", or "us"), a company incorporated under the Limited Liability
              Partnership Act, 2008.
              <br /><br />
              By accessing the Website or availing Products and Services, you agree to our Terms
              and acknowledge that your information will be collected, stored, processed, and used
              in accordance with this Privacy Policy. Your continued use constitutes consent to
              these practices.
              <br /><br />
              This Privacy Policy is published in compliance with applicable provisions of the
              Information Technology Act, 2000 and the Information Technology (Intermediaries
              Guidelines) Rules, 2011.
              <br /><br />
              This policy explains{" "}
              <em className="text-muted-foreground">
                (a) what information we collect · (b) how we use it · (c) how you can manage it ·
                (d) how we protect and share it.
              </em>{" "}
              It applies to all users of the Website.
            </div>
          </div>
        </section>

        {/* Accordion sections */}
        <section className="px-6 pb-20">
          <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">

  {/* LEFT COLUMN */}
  <div
    className="bg-card border border-border rounded-md overflow-hidden"
    style={{ boxShadow: "var(--shadow-lg)" }}
  >
    {sections.slice(0, Math.ceil(sections.length / 2)).map((section) => (
      <AccordionItem
        key={section.id}
        section={section}
        isOpen={openId === section.id}
        onToggle={() => toggle(section.id)}
      />
    ))}
  </div>

  {/* RIGHT COLUMN */}
  <div
    className="bg-card border border-border rounded-md overflow-hidden"
    style={{ boxShadow: "var(--shadow-lg)" }}
  >
    {sections.slice(Math.ceil(sections.length / 2)).map((section) => (
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
            For any privacy-related concerns, reach us at{" "}
            <a
              href="mailto:hello@practomind.com"
              className="text-primary underline underline-offset-2"
            >
              hello@practomind.com
            </a>
          </p>
        </section>

        
      </div>
    </Layout>
  );
};

export default PrivacyPolicy;