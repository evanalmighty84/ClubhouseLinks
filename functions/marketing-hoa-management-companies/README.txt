Unzip into your repository; files belong inside marketing-hoa-management-companies/.
The script uses your existing marketing-hoaboard/clubhouse-logo.png and headshot.png when found.

Install once: npm install nodemailer
Set the recipient (actual address not provided):
  export LAVELLE_RECIPIENT_EMAIL='confirmed-address@example.com'
Use your existing ZeptoMail SMTP environment credentials.
Optional attachment:
  export CLUBHOUSE_WORKFLOW_PDF='/absolute/path/to/Clubhouse_Links_HOA_Workflow_FINAL_v2.pdf'
Preview without sending:
  node marketing-hoa-management-companies/lavelleZeptoScript.js --preview
Send one email:
  node marketing-hoa-management-companies/lavelleZeptoScript.js --send
