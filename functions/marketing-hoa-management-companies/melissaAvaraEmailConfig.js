
module.exports = {
  recipientName: 'Chris',
  recipientEmail: '', // REQUIRED: Chris's verified email address
  companyName: 'Top Flow Plumbing',
  industry: 'Plumbing Services',

  subject: 'Top Flow Plumbing | Invitation to the Clubhouse Links Community Pilot',

  paymentUrl: 'https://checkout.clubhouselinks.com/b/7sY9AUahHgmY1fTcbR0VO1p',

  questionnaireFilename: 'Clubhouse_Links_THA_Vendor_Questionnaire.pdf',

  bodyHtml: `
    <p>Hi {{recipientName}},</p>

    <p>I'm excited to invite <strong>Top Flow Plumbing</strong>
    to participate as our <strong>exclusive plumbing services
    partner</strong> in the Clubhouse Links 90-day neighborhood
    engagement pilot with <strong>Texas Homeowners Association
    Management</strong>.</p>

    <p>We're bringing together a select group of local
    service providers to serve residents in <strong>three
    participating HOA communities</strong>. This program
    helps homeowners connect with reliable local businesses,
    strengthens neighborhood relationships, and creates
    opportunities for vendors to engage directly with
    residents.</p>

    <p><strong>Your paid participation guarantees placement
    in all three participating pilot communities and
    industry exclusivity for plumbing services throughout
    the 90-day pilot.</strong> We'll feature only one
    participating plumbing company across these communities.
    Placement and exclusivity begin after completed
    onboarding and payment.</p>

    <p>We'd love to showcase Top Flow Plumbing's expertise
    in <strong>residential plumbing repairs, installations,
    maintenance, and other plumbing services</strong>.
    Your company profile can include your services, logo,
    and any promotions you'd like residents to see.
    Community event and neighborhood sponsorship
    opportunities may also be coordinated as available.</p>

    <p><strong>To confirm your participation:</strong></p>

    <ol>
      <li>
        Complete the attached vendor onboarding questionnaire
        and return it with your company logo and any
        promotional photos.
      </li>
      <li>
        Complete your participation payment using the
        secure checkout button below.
      </li>
    </ol>

    <table role="presentation" cellpadding="0"
           cellspacing="0" border="0"
           style="margin:22px 0;">
      <tr>
        <td bgcolor="#087f8c"
            style="border-radius:6px;">
          <a href="{{paymentUrl}}"
             target="_blank"
             style="display:inline-block;
                    padding:14px 23px;
                    color:#ffffff;
                    text-decoration:none;
                    font-family:Arial,sans-serif;
                    font-size:15px;
                    font-weight:700;">
            Confirm Vendor Participation — $500
          </a>
        </td>
      </tr>
    </table>

    <p>Secure checkout:
      <a style="color:#087f8c;"
         href="{{paymentUrl}}">
        {{paymentUrl}}
      </a>
    </p>

    <p>I'm looking forward to working with you and
    introducing Top Flow Plumbing to homeowners
    throughout these participating communities.</p>

    <p>Best regards,<br>Evan</p>
  `
};
