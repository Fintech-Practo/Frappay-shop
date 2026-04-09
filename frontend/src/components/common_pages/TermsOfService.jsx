import { Layout } from '@/index.js';
import { useState } from "react";

const sections = [
  {
    id: 1,
    title: "General",
    content: `www.frappay.shop is an online portal owned and operated by Frap Pay Shop (referred to as 'Company,' 'We,' 'Our,' or 'Us'), with its registered office at Ostapur, Kumarpur, Cuttack-754028, Odisha, India, and corporate office at Office No-638, Nexus Esplanade, Rasulgarh, Bhubaneswar – 751010, Odisha, India.

Access to the Website is offered provided you accept all terms, conditions, and notices stated in these Terms (including referenced policies), along with any changes or updates made by the Company at its sole discretion and posted on the Website. These may include extra charges for access or use of certain services.

'You' or 'User' refers to any individual or entity who registers as a buyer/seller on the Website by providing Account Information (defined below) during registration using computer systems.

The Company is not obligated to notify you—registered or otherwise—about changes to the Terms and Conditions ('Terms'). Updated Terms will be available on the Website, and your use of the Website and Services is governed by the latest version at the time of usage. You are expected to check the Website regularly for updates. It is your responsibility to stay informed about any changes. The Company may ask for your consent to updated Terms before further use; if not, continuing to use the Website means you accept those changes.

By (i) using this Website or any service provided by it, or (ii) simply browsing, you acknowledge that you have read, understood, and agree to be bound by these Terms, the Privacy Policy, and other relevant rules, guidelines, policies, and legal requirements applicable under Indian and other jurisdictions' laws. All such rules, guidelines, policies, terms, and conditions are considered part of these Terms of Use.

The Company does not deliver products purchased through the Website to locations outside India. Users may authorize another person to receive products on their behalf when using the service.`,
  },
  {
    id: 2,
    title: "Products and Services",
    content: `The Website serves as an online platform where users can request to purchase books, notebooks, stationery, school and office supplies, related products, and digital goods and services offered by the Company ("Products and Services"). Any sales or transactions between you and the Company for these Products and Services are governed by these Terms.

The Company reserves the right to amend these Terms of Use or any policy or guideline on the Website at its sole discretion, at any time. Changes become effective immediately once posted on the Website, and by using the Website, you accept all such changes—even if you do not receive direct notification of them.

Content: You understand that the Content displayed—including product catalogues and information about products and services, whether text, audio, video, or graphics—is intended only for general information and does not represent advertising or promotion of any product or service sold. The Company does not guarantee the accuracy or authenticity of this information; you are responsible for verifying it yourself.

Invitation to Offer for Sale: Listings for school and office supplies or other products on the Website are considered invitations to offer, not offers to sell. By placing an order, you are making an offer to enter into an agreement with the Company. After your offer, the Company will email you information about your order; however, this email is not an acceptance of your offer. Acceptance occurs only after your order is validated and the stock is confirmed, which will be communicated via a confirmation email.

Any mention of "offer" or "offered for sale" within these Terms should be understood as meaning "invitation to offer for sale."

Transfer of Property and Completion of Sale: Once your offer is accepted, the products will be dispatched from the warehouse and handled directly or under the personal supervision of the Company if required by law. Ownership and title of the ordered products transfer to you upon dispatch and invoicing—at this point, the sale is considered complete.

Delivery: Products and Services will be delivered by third-party contractors or partners. The courier or delivery staff are acting as your agents solely for delivery purposes, with no other responsibility or control over the products beyond standard delivery care. Shipping charges are automatically calculated based on your delivery address and displayed during checkout. There is a minimum order value of INR 100 for purchasing physical products through the website.

It is your responsibility to provide accurate information when using the Services. The Company will not verify your submitted details. Furthermore, the Company does not guarantee that the Services will meet your expectations or be uninterrupted, timely, secure, or error-free. This includes any loss of data or service interruptions caused by Company employees. The Company is also not liable for transmission errors or data corruption.`,
  },
  {
    id: 3,
    title: "Sellers",
    content: `We permit third-party sellers of school books, other publications, and related products to register on our website and offer their goods and services through us. A seller registration form is available on our site; however, completing this form does not automatically grant the right to become a seller. Our onboarding team will process these requests only after conducting thorough due diligence and verifying all provided details and may request additional information from prospective sellers as required by law. A Seller Agreement outlining the terms of engagement will be signed between the seller and Frap Pay Shop and executed in accordance with applicable laws.

All onboarded sellers are required to comply with these terms and conditions, our privacy policy, and any other policies mandated by law.`,
  },
  {
    id: 4,
    title: "Eligibility of Use",
    content: `Only individuals who can legally contract under the Indian Contract Act, 1872 may use the Website. Minors, undischarged insolvents, suspended or removed users, and those not meeting eligibility requirements cannot request Products or Services. Access is also denied to anyone under 18 unless services are used via a legal guardian. The Company may revoke access or terminate memberships at any time for any reason and prohibits multiple active accounts or account transfers.

To order Products or Services, you must register and provide true, accurate, and current information. You are responsible for maintaining your Account's confidentiality and must notify the Company of unauthorized use or breaches immediately. Failure to comply may result in liability for losses. Unregistered Users may have restricted access.

Providing false information or using another user's details is prohibited and may lead to suspension or termination. You confirm that you are the authorized holder of payment methods used. The Company is not liable for losses due to misuse of your account information. Temporary cookies are used for administration and service optimization; personally identifiable information is not stored in cookies.`,
  },
  {
    id: 5,
    title: "Pricing Information and Payment",
    content: `The Company aims to offer you the best possible prices for the products and services you need from the Website. Pricing information for purchasing products and services from the Website is outlined in these Terms.

Additionally:

(a) Your relationship with the Company is strictly principal-to-principal. By accepting these Terms of Use, you agree that the Company acts as an independent contractor and may not have control or responsibility for all products or services listed or offered on its Website.

(b) As a User, you understand that starting a request on the Website means you are entering into a legally binding contract to buy products and/or services, either on a cash-on-delivery basis or another method specified by the Company.

(c) You acknowledge that products will only be delivered if proper documentation and details and provided and meet applicable standards.

(d) As a User, you must promptly notify the Company electronically, via the appropriate Website features, about delivery or non-delivery within the time specified in these Terms of Use. If you do not notify the Company within this timeframe, it will be assumed that delivery was completed for that order.

(e) The Company can refuse to process orders from Users with a history of questionable charges or breaches of agreements or policies.

(f) Both the User and any third party acknowledge that the Company cannot be held responsible for any damages, claims, or interest resulting from the failure or delay in processing a transaction or transaction price if such circumstances are beyond the Company's control.`,
  },
  {
    id: 6,
    title: "Wallet / Reward Points",
    content: `We offer a wallet feature as part of our royalty program, which can be used for payment discounts. Certain rewards, such as cashbacks, will be credited to your wallet (referred to as "Wallet Cashback"). These Wallet Cashback rewards are considered discounts on purchases when you use them.

Rewards include, but are not limited to, incentives for purchasing orders, providing personal details for better personalization, completing specific tasks, and more. Your Wallet Cashback can only be used on our Website and Mobile Applications to purchase Products or Services from us.

You are not allowed to withdraw your wallet balance into your bank account or request a cash withdrawal under any circumstances. The wallet amount cannot be transferred to any other prepaid instrument according to applicable RBI regulations.

Wallet balances cannot be used if you choose cash on delivery (COD) for paying the remaining balance of an order; they are only available if you pay using other non-COD payment options on the Website.

Wallet Cashback expires six (6) months from the date it is credited, or as indicated on the wallet page. These terms are subject to change, so please review wallet details in your account section regularly.

We continuously collect, verify, audit, and maintain accurate customer information and reserve the right to take necessary steps at any time to comply with all relevant KYC requirements. We may discontinue services or reject wallet applications anytime if there is incorrect or inconsistent information or documentation provided by you.

You might need to complete a verification process by submitting your details (such as name and date of birth, or other KYC documents) to meet applicable legal requirements.

Any information you provide to us for wallet services belongs to us and may be used for any purpose consistent with applicable laws and regulations, at our discretion.

Wallets are offered only to Indian residents who are at least 18 years old and legally eligible to contract. Wallets are non-transferable.

You cannot add money to your wallet since it is a royalty feature that offers future discounts based on previous order values. The wallet balance cannot exceed INR 10,000 at any given time. This limit may be reviewed and adjusted by the Company without prior notice.

The Company reserves the right to suspend or discontinue wallet services for any reason at any time.

You may operate only one wallet. Any suspected breach of this rule can lead to suspension or discontinuation of your wallets on the platform.

The operation and continued availability of wallet facilities depend on compliance with applicable laws and any new regulations or directives issued by regulatory authorities in India.

You acknowledge and accept that your wallet is linked to your account and mobile phone number. You are solely responsible for any liabilities arising from loss, theft, misuse of your phone number, or deactivation of your mobile connection by your telecom provider.`,
  },
  {
    id: 7,
    title: "User Obligations",
    content: `Company grants you a personal, non-exclusive, non-transferable, and limited right to access and use this Website and its services, provided you comply with these Terms. You must only use the Website, its services, and materials for purposes allowed by these Terms, applicable laws, and generally accepted practices or guidelines.

You agree to respect all restrictions regarding the sharing, use, and copying of materials (like Product catalogues) found on the Website. Accessing the Website or its content in any way other than through Company's official interface is not permitted. You must not use automated tools like robots or spiders, or any manual process, to obtain, reproduce, or bypass the structure of the Website or its content, nor try to acquire information not expressly made available.

By using the Website or Services, you may encounter content from other users that you find offensive, indecent, or objectionable. Company isn't responsible for such content but allows you to report it as outlined. If the Website lets you post material, you must ensure your posts comply with relevant laws and are not offensive.

You also agree not to:

• Defame, abuse, harass, threaten, or violate others' legal rights;
• Impersonate anyone or misrepresent your affiliation;
• Share inappropriate, obscene, or unlawful material or information;
• Upload files protected by intellectual property laws without proper rights or permissions;
• Distribute files containing viruses or harmful software;
• Disrupt, interfere with, or attempt unauthorized access to the Website or related systems and networks;
• Test the Website's security or try to trace other users' information without authorization;
• Harm the Website's security, resources, accounts, or related networks;
• Collect or store data about other users in ways that violate these Terms;
• Use devices or software to disrupt the Website or transactions;
• Use the Website for unlawful activities or solicit illegal actions;
• Conduct surveys, contests, pyramid schemes, or chain letters;
• Download files that cannot legally be shared;
• Falsify or delete notices or labels in uploaded files;
• Violate codes of conduct or other guidelines;
• Break any applicable law or regulation;
• Violate these Terms or any additional terms;
• Reverse engineer, modify, copy, publish, or sell Website information or software.

While Company isn't required to monitor your communications, it can review and remove content at its discretion and terminate your access to communication services at any time. Company may disclose information if needed to comply with laws, regulations, legal processes, or governmental requests, or to edit, refuse, or remove materials as necessary.

You are solely responsible for breaches of these Terms and any resulting consequences, including potential loss or damages to Company or its partners. Company may modify or discontinue parts of the Website, change fees, or offer features to some or all users at any time.

Illegal uses of the Website or Services are prohibited. You may not access Company systems in ways that could harm, disable, overload, or impair them, or hinder others' use. Unauthorized access, including using someone else's login credentials, is prohibited. Soliciting others' login information is a direct violation of these Terms and applicable laws, including privacy and security regulations.`,
  },
  {
    id: 8,
    title: "Use of Materials",
    content: `Unless stated otherwise in any relevant Additional Terms, the Company gives you a personal, non-exclusive, and freely revocable (with notice) license to view, download, and print product catalogues or other materials from the Website. This access is subject to the following conditions:

• You may use these materials only for your own personal, informational, and internal purposes, and must follow the Terms.
• You are not allowed to modify or change the Product catalogues or any other materials from the Website.
• You cannot distribute, sell, rent, lease, license, or otherwise make these catalogues or materials available to others.
• You must not remove any text, copyright notices, or proprietary information from the materials.

The rights provided above do not apply to the design, layout, or "look and feel" of the Website, which are protected by intellectual property laws and cannot be copied or imitated, in whole or in part. Unless the Company specifically allows it, the Product catalogues or other materials cannot be copied or retransmitted.

Software available on the Website belongs either to the Company or third parties. You may not use, download, or install such software unless the Terms or written permission from the Company allow it.

Any merchandise or Services purchased from the Website are strictly for your personal use. By purchasing, you agree not to sell, resell, barter, or use them for commercial or profit purposes. You also acknowledge that the Services or merchandise bought are not transferable to any third party for profit.`,
  },
  {
    id: 9,
    title: "Intellectual Property Rights",
    content: `All content on the Website, including its design and arrangement, is owned and controlled by Company and protected by copyright, patent, trademark, and other intellectual property laws. The trademarks, logos, and service marks ("Marks") belong to Company or their respective third parties; you may not use them without prior consent.

Unless otherwise specified, Company holds all intellectual property rights related to Frap Pay Shop / www.frappay.shop and the Website, including copyrights, patents, designs, trade secrets, goodwill, source code, and more.

Except as explicitly stated, you may not copy, republish, display, translate, transmit, reproduce, or distribute any Content without proper authorization from Company or relevant third-party owners.`,
  },
  {
    id: 10,
    title: "Cancellation, Returns and Refund Policy",
    content: `A detailed Cancellations and Refunds Policy is available on this website and you are advised to refer the same.`,
  },
  {
    id: 11,
    title: "Disclaimer of Warranties & Liabilities",
    content: `To the fullest extent allowed by law, Company provides the website, services, and materials "as is" without any warranty. Company does not guarantee that the Website or services will meet your needs, always be available, accurate, secure, or error-free. The quality, reliability, or results from use are not assured, and no advice creates a warranty unless stated in the terms.

Company takes no responsibility for user content related to intellectual property, privacy, publicity, or other laws, nor for misuse, loss, modification, or unavailability of such content. Unauthorized account use is solely your risk. Company aims for accuracy but does not guarantee information, products, or services on the Website. Delays, unavailability during maintenance or technical issues, errors, and omissions are not Company's liability. Downloading materials is at your own risk.

Company does not accept liability for third-party products, services, or advertisements. Your use of the Website is entirely at your own risk.`,
  },
  {
    id: 12,
    title: "Indemnification and Limitation of Liability",
    content: `You agree to indemnify, defend, and hold harmless Company and its affiliates, vendors, agents, and employees against any losses, liabilities, claims, damages, costs, or expenses (including legal fees) arising from your breach of these Terms or obligations. You further agree to protect Company from third-party claims related to your website use, material, violation of the Terms, or infringement of others' rights, including intellectual property.

Company's total liability to you under these Terms is limited to refunding charges for any voucher, product, or service that gives rise to liability.

Under no circumstances shall Company or its affiliates be liable for special, incidental, indirect, consequential, or punitive damages, including loss of use, data, or profits, regardless of foreseeability or prior advice, or on any legal theory. These limitations apply to the fullest extent allowed by law.`,
  },
  {
    id: 13,
    title: "Violation of the Terms",
    content: `Company may, at its discretion and without notice, terminate your access to the Website if you violate these or additional Terms. Any violation may be deemed unlawful and unfair, causing irreparable harm to Company, which may result in injunctive or equitable relief in addition to other legal remedies.

Company may also end your access for reasons including law enforcement requests, your own account deletion, discontinuation or changes to the Website or its services, or unexpected technical issues.

If Company takes legal action due to your violation of these Terms, you are responsible for all reasonable attorneys' fees and costs, along with any granted relief.`,
  },
  {
    id: 14,
    title: "Termination",
    content: `These Terms remain effective until you or the Company end them. You may terminate the agreement by not using the Website or closing your accounts for all services, where that option exists.

The Company can terminate the Terms or your access at any time, with or without notice, if you violate any terms or policies, if required by law, if service is no longer viable, or if the Website or services are discontinued. Your account may be suspended or deleted, which could include removal of access, deletion of your data, and barring further use.

All terminations are at the Company's sole discretion, and the Company is not liable to you or others for closing your account or access. The Terms continue unless the Company decides otherwise. Upon termination, the Company may delete your content and will not be responsible for any consequences.`,
  },
  {
    id: 15,
    title: "Governing Law",
    content: `These Terms and all transactions conducted through the Website, as well as your relationship with the Company, are governed by Indian law.

Any claims or disputes related to the Website, Terms, transactions, or the Company relationship shall fall under the exclusive jurisdiction of the courts in Cuttack, Odisha, India, which you accept.`,
  },
  {
    id: 16,
    title: "Report Abuse",
    content: `If you notice any abuse, violations, or objectionable content on the Website, please contact the Company's customer support team.`,
  },
  {
    id: 17,
    title: "Privacy Policy",
    content: `We consider your privacy a priority. If the Company merges, is acquired, reorganizes, or restructures, your personal information may be shared with or transferred to another business entity, which will also follow our privacy policy. When you give us your information, it may be used by the Company and its affiliates to provide services related to your transactions, whether on www.frappay.shop or third-party merchant websites. We have a dedicated Privacy Policy page for you to read about our privacy guidelines. You are advised to go through our Privacy Policy page before using this website.`,
  },
  {
    id: 18,
    title: "Communications",
    content: `You agree to receive communications from the Company by SMS, email, phone, or WhatsApp regarding your order and the Products and services offered on the Website, as well as from Frap Pay Shop's affiliates.`,
  },
  {
    id: 19,
    title: "General Provisions",
    content: `Notice: All company notices will be delivered either via email or through a general notification on the Website. Any notice directed to the Company in accordance with these Terms should be sent to support@frappay.shop.

For any questions or concerns regarding the product, please contact us through our support page.

Assignment: You may not assign or transfer these Terms or any rights granted herein to any third party. The Company's rights under these Terms are freely transferable to any third parties without requiring your consent.

Severability: If any provision of these Terms, or part thereof, is determined by a court of competent jurisdiction to be unenforceable, such provision shall be enforced to the fullest extent possible to reflect the parties' intent. The remaining provisions of the Terms will remain in full force and effect.

Waiver: The Company's failure to enforce or exercise any provision of these Terms or associated rights does not constitute a waiver of that provision or right.`,
  },
  {
    id: 20,
    title: "Grievance Redressal Mechanism",
    content: `If you experience any issues concerning your order, please contact us via the chat support feature available on our website for prompt assistance. If your concerns remain unresolved or if you wish to raise grievances pertaining to the website, orders, content, or services, you may reach out to the designated Grievance and Nodal Officer using the contact details provided below:

Name: 
Designation: 
Address: 
Phone: +91
Email: 
Time: Monday – Saturday (10:00 – 18:00)

The aforementioned information regarding the Grievance cum Nodal Officer is provided in compliance with (1) the Information Technology Act, 2000 and the rules thereunder, and (2) the Consumer Protection (E-Commerce) Rules 2020, as amended from time to time.

The Grievance Officer shall make every effort to acknowledge user grievances, complaints, or concerns relating to the Website, Content, or Services within 48 hours of receipt and will endeavour to resolve such matters at the earliest, but no later than 30 days from receipt of the request. By submitting a complaint or grievance, you agree to provide full cooperation to the Grievance Officer and furnish all reasonable information requested.`,
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

const TermsOfService = () => {
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
            Frap Pay Shop · Frap Pay Shop
          </p>
          <h1
            className="font-display font-bold text-foreground"
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
            }}
          >
            Terms &amp; Conditions
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
              <strong className="font-semibold">Frap Pay Shop</strong> operates this
              website. Throughout the site, "we," "us," and "our" refer to Frap Pay Shop.
              We provide this website and all information, tools, and services available here to you,
              the user, on the condition that you accept all terms, conditions, policies, and notices
              described on this page.
              <br /><br />
              By visiting our website or making a purchase, you use our "Service" and agree to follow
              these terms and conditions ("Terms of Service" or "Terms"), along with any additional
              terms and policies referenced here or linked via hyperlink. These Terms of Service apply
              to everyone who uses the site, including browsers, vendors, customers, merchants, and
              those who contribute content.
              <br /><br />
              Please ensure you read the Terms of Service carefully before accessing or using our
              website. By using any part of the site, you agree to comply with these Terms of Service.
              If you disagree with any of the terms and conditions, you should not access the website
              or use our services. If these Terms of Service are understood as an offer, acceptance is
              strictly limited to these Terms of Service.
              <br /><br />
              Any new features or tools added to the store will also be governed by the Terms of
              Service. You can review the latest version of the Terms at any time on this page. We
              retain the right to update, change, or replace any section of these Terms by posting
              changes to our website. It is your responsibility to check this page regularly for
              updates. Continued use or access to the website after any changes indicates your
              acceptance of those modifications.
              <br /><br />
              <em className="text-muted-foreground">
                This document is an electronic record under the Information Technology Act, 2000, as
                amended. Generated by a computer system, it does not require physical or digital
                signatures.
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
            For any queries or concerns, reach us at{" "}
            <a
              href="mailto:support@frappay.shop"
              className="text-primary underline underline-offset-2"
            >
              support@frappay.shop
            </a>
          </p>
        </section>

        
      </div>
    </Layout>
  );
};

export default TermsOfService;
