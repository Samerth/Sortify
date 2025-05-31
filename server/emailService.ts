import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface InvitationEmailParams {
  to: string;
  organizationName: string;
  inviterName: string;
  invitationToken: string;
  appUrl: string;
}

export async function sendInvitationEmail(params: InvitationEmailParams): Promise<boolean> {
  try {
    const invitationUrl = `${params.appUrl}/auth?token=${params.invitationToken}`;
    
    const emailContent = {
      to: params.to,
      from: 'samerth.pathak@codsphere.ca', // Using your verified email address
      subject: `You're invited to join ${params.organizationName} on Sortify`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Sortify</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Smart Package Sorting Platform</p>
          </div>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #1f2937; margin: 0 0 16px 0;">You've been invited!</h2>
            <p style="color: #4b5563; margin: 0 0 16px 0;">
              <strong>${params.inviterName}</strong> has invited you to join <strong>${params.organizationName}</strong> on Sortify.
            </p>
            <p style="color: #4b5563; margin: 0;">
              Sortify helps organizations manage their mailroom operations efficiently with smart package sorting and tracking.
            </p>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${invitationUrl}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
              Accept Invitation & Sign Up
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 32px;">
            <p style="color: #9ca3af; font-size: 14px; margin: 0;">
              This invitation will expire in 7 days. If you're having trouble with the button above, 
              copy and paste this link into your browser:
            </p>
            <p style="color: #2563eb; font-size: 14px; word-break: break-all; margin: 8px 0 0 0;">
              ${invitationUrl}
            </p>
          </div>
        </div>
      `,
      text: `
        You've been invited to join ${params.organizationName} on Sortify!
        
        ${params.inviterName} has invited you to join their organization on Sortify, 
        a smart package sorting and mailroom management platform.
        
        To accept this invitation and create your account, visit:
        ${invitationUrl}
        
        This invitation will expire in 7 days.
        
        Best regards,
        The Sortify Team
      `
    };

    await mailService.send(emailContent);
    console.log(`Invitation email sent successfully to ${params.to}`);
    return true;
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    if (error.response?.body?.errors) {
      console.error('SendGrid error details:', error.response.body.errors);
    }
    return false;
  }
}

export async function sendWelcomeEmail(email: string, name: string, organizationName: string): Promise<boolean> {
  try {
    const emailContent = {
      to: email,
      from: 'samerth.pathak@codsphere.ca',
      subject: `Welcome to ${organizationName} on Sortify!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Sortify</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Smart Package Sorting Platform</p>
          </div>
          
          <div style="background: #f0f9ff; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #1f2937; margin: 0 0 16px 0;">Welcome to Sortify, ${name}!</h2>
            <p style="color: #4b5563; margin: 0 0 16px 0;">
              You've successfully joined <strong>${organizationName}</strong> and can now access the mailroom management platform.
            </p>
            <p style="color: #4b5563; margin: 0;">
              Start managing packages, tracking deliveries, and organizing your mailroom operations efficiently.
            </p>
          </div>
          
          <div style="margin: 24px 0;">
            <h3 style="color: #1f2937; margin: 0 0 12px 0;">What you can do:</h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
              <li>Log incoming mail and packages</li>
              <li>Track delivery status and notifications</li>
              <li>Manage recipients and locations</li>
              <li>View analytics and reports</li>
            </ul>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 32px;">
            <p style="color: #9ca3af; font-size: 14px; margin: 0;">
              If you have any questions, feel free to reach out to your organization administrator.
            </p>
          </div>
        </div>
      `,
      text: `
        Welcome to Sortify, ${name}!
        
        You've successfully joined ${organizationName} and can now access the mailroom management platform.
        
        What you can do:
        - Log incoming mail and packages
        - Track delivery status and notifications  
        - Manage recipients and locations
        - View analytics and reports
        
        If you have any questions, feel free to reach out to your organization administrator.
        
        Best regards,
        The Sortify Team
      `
    };

    await mailService.send(emailContent);
    console.log(`Welcome email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('SendGrid welcome email error:', error);
    return false;
  }
}