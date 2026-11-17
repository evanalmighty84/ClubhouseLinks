// Glow Joe Electric | Clubhouse Links THA 90-day vendor pilot
// Fill in the recipient details before sending.
module.exports = {
  recipientName: 'Joe', // Primary contact first name
  recipientEmail: 'Joe@gjetx.com', // Actual recipient email address
  companyName: 'Glow Joe Electric',
  industry: 'Electrical',
  subject: 'Glow Joe Electric | Clubhouse Links HOA Vendor Partnership',
  paymentUrl: 'https://checkout.clubhouselinks.com/b/7sY9AUahHgmY1fTcbR0VO1p',
  questionnaireFilename: 'Clubhouse_Links_THA_Vendor_Questionnaire.pdf',
  bodyHtml: `
    <p>Hi {{recipientName}},</p>
    <p>I'm excited to invite <strong>Glow Joe Electric</strong> as an electrical-services partner for the Clubhouse Links 90-day neighborhood engagement pilot with <strong>Texas Homeowners Association Management</strong>.</p>
    <p>This pilot will introduce selected local businesses to homeowners in <strong>three participating HOA communities</strong>, helping residents discover trusted providers and strengthening neighborhood connections.</p>
    <p><strong>Your participation includes guaranteed placement in all three participating pilot communities and industry exclusivity for electrical services during the 90-day pilot.</strong> Only one participating vendor per primary industry will be featured in those communities during the pilot. Placement and exclusivity take effect upon completed onboarding and payment.</p>
    <p>We'll also collect your logo, company description, services and promotional offers so we can present Glow Joe Electric to residents. Opportunities to participate in HOA events and special activities can be coordinated as available.</p>
    <p><strong>To finalize your participation:</strong></p>
    <ol>
      <li>Complete and return the attached vendor onboarding questionnaire, along with your logo and any promotional images.</li>
      <li>Submit your vendor participation payment using the secure link below.</li>
    </ol>
    <p style="color:#bd1e1e;font-weight:700;font-size:17px;">PAYMENT DEADLINE: THURSDAY, NOVEMBER 12, 2026</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;"><tr><td bgcolor="#087f8c" style="border-radius:6px;">
      <a href="{{paymentUrl}}" target="_blank" style="display:inline-block;padding:14px 23px;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:15px;font-weight:700;">Complete Vendor Participation Payment — $500</a>
    </td></tr></table>
    <p>Secure checkout: <a style="color:#087f8c;" href="{{paymentUrl}}">{{paymentUrl}}</a></p>
    <p>We appreciate the opportunity to introduce Glow Joe Electric to these communities and look forward to working together.</p>
    <p>Best regards,<br>Evan</p>
  `
};
