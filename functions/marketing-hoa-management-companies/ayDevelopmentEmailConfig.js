// AY Development | Clubhouse Links THA 90-day vendor pilot
// Use with your existing THA ZeptoMail invitation script and inline signature.
module.exports = {
  recipientName: 'Yehuda', // Yehuda Izmagristo
  recipientEmail: 'yehuda@aydevelopmentgc.com',
  companyName: 'AY Development',
  industry: 'General Contracting / Custom Homes & Luxury Renovations',
  subject: 'AY Development | Clubhouse Links HOA Vendor Partnership',
  paymentUrl: 'https://checkout.clubhouselinks.com/b/7sY9AUahHgmY1fTcbR0VO1p',
  questionnaireFilename: 'Clubhouse_Links_THA_Vendor_Questionnaire_Nov_17.pdf',
  bodyHtml: `
    <p>Hi {{recipientName}},</p>
            <p>Your previous work in Richardson will undoubtedly be a added bonus to the platform and the communities that use it.</p>
    <p>I'm excited to formally invite <strong>AY Development</strong> to participate as our custom home building and luxury renovation partner for the Clubhouse Links 90-day neighborhood engagement pilot with <strong>Texas Homeowners Association Management</strong>.</p>

    <p>This pilot will introduce selected local businesses to homeowners in <strong>three participating HOA communities</strong>, helping residents discover trusted providers and strengthening neighborhood connections.</p>
    <p><strong>Your participation includes reserved placement in all three participating pilot communities and proposed industry exclusivity for general contracting and luxury renovations during the 90-day pilot.</strong> Only one participating vendor in this primary category will be featured in those communities during the pilot. Placement and exclusivity are contingent on community approval, completed onboarding and payment.</p>
    <p>We'll collect your logo, company description, services, photos of custom homes and completed renovations, and any promotional offers so we can introduce AY Development to residents. Opportunities to participate in HOA events and special activities can be coordinated as available.</p>
    <p><strong>To finalize your participation:</strong></p>
    <ol>
      <li>Complete and return the attached vendor onboarding questionnaire, along with your logo and photos of your work.</li>
      <li>Submit your vendor participation payment using the secure link below.</li>
    </ol>
    <p style="color:#bd1e1e;font-weight:700;font-size:17px;">PAYMENT DEADLINE: THURSDAY, NOVEMBER 17, 2026</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;"><tr><td bgcolor="#087f8c" style="border-radius:6px;">
      <a href="{{paymentUrl}}" target="_blank" style="display:inline-block;padding:14px 23px;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:15px;font-weight:700;">Complete Vendor Participation Payment — $500</a>
    </td></tr></table>
    <p>Secure checkout: <a style="color:#087f8c;" href="{{paymentUrl}}">{{paymentUrl}}</a></p>
    <p>I'm excited about the opportunity to showcase AY Development's custom homes and luxury renovations to homeowners across these communities and look forward to working with you, Yehuda.</p>
    <p>Best regards,<br>Evan</p>
  `
};
