'use strict';
module.exports = {
  recipientName: 'Lamar',
  recipientEmail: 'ltennyson@hensleyheatingandcooling.com', // REQUIRED: verified email for Lamar
  companyName: 'Hensley Heating and Cooling',
  industry: 'Heating, Ventilation & Air Conditioning (HVAC)',
  subject: 'Hensley Heating and Cooling | Invitation to the Clubhouse Links Community Pilot',
  paymentUrl: 'https://checkout.clubhouselinks.com/b/7sY9AUahHgmY1fTcbR0VO1p',
  questionnaireFilename: 'Clubhouse_Links_THA_Vendor_Questionnaire.pdf',
  bodyHtml: `
    <p>Hi {{recipientName}},</p>
    <p>I'm excited to invite <strong>Hensley Heating and Cooling</strong> to participate as our <strong>heating and cooling services partner</strong> in the Clubhouse Links 90-day neighborhood engagement pilot with <strong>Texas Homeowners Association Management</strong>.</p>
    <p>We're bringing together a select group of local providers to serve residents in <strong>three participating HOA communities</strong>. This program helps homeowners find reliable local businesses, strengthens community connections, and creates opportunities for vendors to engage with residents.</p>
    <p><strong>Your paid participation guarantees placement in all three participating pilot communities and industry exclusivity for HVAC services during the 90-day pilot.</strong> We'll feature only one participating HVAC provider in that primary category across those communities. Placement and exclusivity begin after completed onboarding and payment.</p>
    <p>We'd love to showcase Hensley Heating and Cooling's residential plumbing expertise. Your company profile can include your services, logo, and any promotions you'd like residents to see. Community event opportunities may also be coordinated as available.</p>
    <p><strong>To confirm your participation:</strong></p>
    <ol><li>Complete the attached vendor onboarding questionnaire and return it with your logo and any promotional photos.</li><li>Complete your participation payment using the secure checkout button below.</li></ol>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;"><tr><td bgcolor="#087f8c" style="border-radius:6px;">
      <a href="{{paymentUrl}}" target="_blank" style="display:inline-block;padding:14px 23px;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:15px;font-weight:700;">Confirm Vendor Participation — $500</a>
    </td></tr></table>
    <p>Secure checkout: <a style="color:#087f8c;" href="{{paymentUrl}}">{{paymentUrl}}</a></p>
    <p>I'm looking forward to working with you and introducing Hensley Heating and Cooling to these communities.</p>
    <p>Best regards,<br>Evan</p>
  `
};
