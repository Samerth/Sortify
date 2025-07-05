import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

console.log('🔑 SendGrid API Key loaded:', process.env.SENDGRID_API_KEY?.substring(0, 20) + '...');

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
    // Use the production domain for invitations
    const baseUrl = params.appUrl.includes('replit.dev') ? 'https://sortifyapp.com' : params.appUrl;
    const invitationUrl = `${baseUrl}/auth?invitation=${params.invitationToken}`;
    
    const emailContent = {
      to: params.to,
      from: 'samerth.pathak@codsphere.ca',
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

    console.log('📧 DEBUG: Email content being sent:', JSON.stringify(emailContent, null, 2));
    const response = await mailService.send(emailContent);
    console.log(`Invitation email sent successfully to ${params.to}`);
    console.log('SendGrid response:', response[0].statusCode, response[0].headers);
    return true;
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    console.error('Error status:', error.status || error.statusCode);
    console.error('Error message:', error.message);
    if (error.response?.body?.errors) {
      console.error('SendGrid error details:', error.response.body.errors);
    }
    if (error.response?.body) {
      console.error('Full SendGrid response body:', error.response.body);
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

interface MailNotificationParams {
  to: string;
  recipientName: string;
  organizationName: string;
  mailType: string;
  sender?: string;
  trackingNumber?: string;
  arrivedAt: string;
}

export async function sendMailNotificationEmail(params: MailNotificationParams): Promise<boolean> {
  try {
    const emailContent = {
      to: params.to,
      from: 'samerth.pathak@codsphere.ca',
      subject: `Mail Notification - ${params.mailType} has arrived`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Sortify</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Smart Package Sorting Platform</p>
          </div>
          
          <div style="background: #f0f9ff; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #1f2937; margin: 0 0 16px 0;">📦 New Mail Arrival</h2>
            <p style="color: #4b5563; margin: 0 0 16px 0;">
              Hello ${params.recipientName},
            </p>
            <p style="color: #4b5563; margin: 0 0 16px 0;">
              You have received a <strong>${params.mailType}</strong> at ${params.organizationName}.
            </p>
          </div>
          
          <div style="margin: 24px 0;">
            <h3 style="color: #1f2937; margin: 0 0 12px 0;">Details:</h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
              <li><strong>Type:</strong> ${params.mailType}</li>
              ${params.sender ? `<li><strong>From:</strong> ${params.sender}</li>` : ''}
              ${params.trackingNumber ? `<li><strong>Tracking Number:</strong> ${params.trackingNumber}</li>` : ''}
              <li><strong>Arrived:</strong> ${new Date(params.arrivedAt).toLocaleString()}</li>
            </ul>
          </div>
          
          <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #92400e; margin: 0; font-weight: 500;">
              📍 Please collect your mail from the mailroom during business hours.
            </p>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              This is an automated notification from ${params.organizationName}'s mailroom system.
            </p>
          </div>
        </div>
      `,
      text: `
        Mail Notification - ${params.mailType} has arrived
        
        Hello ${params.recipientName},
        
        You have received a ${params.mailType} at ${params.organizationName}.
        
        Details:
        - Type: ${params.mailType}
        ${params.sender ? `- From: ${params.sender}` : ''}
        ${params.trackingNumber ? `- Tracking Number: ${params.trackingNumber}` : ''}
        - Arrived: ${new Date(params.arrivedAt).toLocaleString()}
        
        Please collect your mail from the mailroom during business hours.
        
        This is an automated notification from ${params.organizationName}'s mailroom system.
      `
    };

    await mailService.send(emailContent);
    console.log(`Mail notification email sent successfully to ${params.to}`);
    return true;
  } catch (error: any) {
    console.error('SendGrid mail notification error:', error);
    if (error.response?.body?.errors) {
      console.error('SendGrid error details:', error.response.body.errors);
    }
    return false;
  }
}

interface PasswordResetEmailParams {
  to: string;
  name: string;
  resetToken: string;
  appUrl: string;
}

export async function sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<boolean> {
  const { to, name, resetToken, appUrl } = params;
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

  try {
    const emailContent = {
      to,
      from: 'samerth.pathak@codsphere.ca',
      subject: '🔑 Reset Your Sortify Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Sortify</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Smart Package Sorting Platform</p>
          </div>
          
          <div style="background: #f0f9ff; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #1f2937; margin: 0 0 16px 0;">🔑 Password Reset Request</h2>
            <p style="color: #4b5563; margin: 0 0 16px 0;">
              Hello ${name},
            </p>
            <p style="color: #4b5563; margin: 0 0 16px 0;">
              We received a request to reset your password for your Sortify account.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #2563eb; 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: bold; 
                      display: inline-block;
                      font-size: 16px;">
              Reset Your Password
            </a>
          </div>
          
          <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              ⚠️ This link will expire in 1 hour for security reasons.
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            If you didn't request this password reset, you can safely ignore this email.
          </p>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              This is an automated email from Sortify. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
      text: `
        Password Reset Request
        
        Hello ${name},
        
        We received a request to reset your password for your Sortify account.
        
        Click here to reset your password: ${resetUrl}
        
        This link will expire in 1 hour for security reasons.
        
        If you didn't request this password reset, you can safely ignore this email.
        
        This is an automated email from Sortify. Please do not reply to this email.
      `
    };

    await mailService.send(emailContent);
    console.log(`Password reset email sent successfully to ${to}`);
    return true;
  } catch (error: any) {
    console.error('SendGrid password reset email error:', error);
    if (error.response?.body?.errors) {
      console.error('SendGrid error details:', error.response.body.errors);
    }
    return false;
  }
}