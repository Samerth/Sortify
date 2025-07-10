import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./simpleAuth";
import { sendInvitationEmail, sendMailNotificationEmail, sendPasswordResetEmail } from "./emailService";
import { trialMiddleware, checkActionLimit } from "./middleware/trialMiddleware";
import { TrialManager } from "./trialManager";
import Stripe from "stripe";
import crypto from "crypto";
import { hashPassword } from "./simpleAuth";
import {
  insertOrganizationSchema,
  insertRecipientSchema,
  insertMailItemSchema,
  insertIntegrationSchema,
} from "@shared/schema";
import { z } from "zod";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";

// Organization context middleware
const withOrganization = async (req: any, res: any, next: any) => {
  console.log(`🔒 withOrganization middleware hit for ${req.method} ${req.path}`);
  const organizationId = req.headers['x-organization-id'] || req.body.organizationId || req.query.organizationId;
  console.log(`🔒 Organization ID: ${organizationId}`);
  
  if (!organizationId) {
    console.log(`🔒 No organization ID provided`);
    return res.status(400).json({ message: "Organization ID is required" });
  }

  // Verify user has access to organization
  const userId = req.user?.id;
  console.log(`🔒 User ID: ${userId}`);
  const member = await storage.getOrganizationMember(organizationId, userId);
  console.log(`🔒 Member found: ${!!member}`);
  
  if (!member) {
    console.log(`🔒 Access denied to organization`);
    return res.status(403).json({ message: "Access denied to organization" });
  }

  req.organizationId = organizationId;
  req.userRole = member.role;
  console.log(`🔒 Middleware passed, calling next()`);
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Photo upload route
  app.post('/api/upload-photo', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      // For now, return a placeholder URL since we don't have file storage configured
      // In production, you would upload to a cloud storage service like AWS S3, Cloudinary, etc.
      const photoUrl = `https://via.placeholder.com/300x200?text=Package+Photo+${Date.now()}`;
      res.json({ photoUrl });
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { firstName, lastName } = req.body;
      
      if (!firstName || !lastName) {
        return res.status(400).json({ message: "First name and last name are required" });
      }

      const updatedUser = await storage.updateUser(userId, { firstName, lastName });
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.post('/api/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long" });
      }

      // Get current user to verify password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Import comparePasswords function from simpleAuth
      const { comparePasswords, hashPassword } = await import('./simpleAuth');
      
      // Verify current password
      const isCurrentPasswordValid = await comparePasswords(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password and update
      const hashedNewPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(userId, hashedNewPassword);

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Organization routes
  app.get('/api/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organizations = await storage.getUserOrganizations(userId);
      res.json(organizations);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.post('/api/organizations', isAuthenticated, trialMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validData = insertOrganizationSchema.parse(req.body);
      
      // Create organization
      const organization = await storage.createOrganization(validData);
      
      // Add user as admin
      await storage.addOrganizationMember({
        organizationId: organization.id,
        userId,
        role: 'admin',
      });
      
      res.json(organization);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  app.get('/api/organizations/:id', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const organization = await storage.getOrganization(req.params.id);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json(organization);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  app.get('/api/organizations/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = req.params.id;
      const userId = req.user.id;
      
      // Verify user is a member of this organization
      const member = await storage.getOrganizationMember(organizationId, userId);
      if (!member) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      const members = await storage.getOrganizationMembers(organizationId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching organization members:", error);
      res.status(500).json({ message: "Failed to fetch organization members" });
    }
  });

  app.put('/api/organizations/:id', isAuthenticated, withOrganization, trialMiddleware, async (req: any, res) => {
    try {
      if (req.userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const validData = insertOrganizationSchema.partial().parse(req.body);
      const organization = await storage.updateOrganization(req.params.id, validData);
      res.json(organization);
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  // Invitation verification endpoint (public - no auth required)
  app.get('/api/invitations/verify/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const invitation = await storage.getInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found or expired' });
      }

      // Get organization details
      const organization = await storage.getOrganization(invitation.organizationId);

      // Return invitation details without sensitive info
      res.json({
        email: invitation.email,
        organizationName: organization?.name || 'Organization',
        role: invitation.role,
        expiresAt: invitation.expiresAt
      });
    } catch (error) {
      console.error('Error verifying invitation:', error);
      res.status(500).json({ message: 'Failed to verify invitation' });
    }
  });

  // User invitation routes with access control
  app.post('/api/user-invitations', isAuthenticated, withOrganization, trialMiddleware, checkActionLimit('add_user'), async (req: any, res) => {
    console.log('🎯 Invitation route hit!', { body: req.body });
    
    try {
      const { email, role = 'member' } = req.body;
      const organizationId = req.organizationId;
      const userId = req.user.id;
      
      // Check if user has admin role for inviting others
      const member = await storage.getOrganizationMember(organizationId, userId);
      console.log('🔍 Admin check:', { organizationId, userId, member });
      if (!member || member.role !== 'admin') {
        console.log('❌ Admin check failed:', { member: member?.role });
        return res.status(403).json({ message: 'Only admins can invite users' });
      }
      console.log('✅ Admin check passed');
      
      // License limit checking is now handled by trial middleware
      
      // Check if user already exists or has pending invitation
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        const existingMember = await storage.getOrganizationMember(organizationId, existingUser.id);
        if (existingMember) {
          return res.status(400).json({ message: 'User is already a member of this organization' });
        }
      }

      // Check for existing pending invitation
      const existingInvitation = await storage.getPendingInvitation(organizationId, email);
      if (existingInvitation) {
        return res.status(400).json({ message: 'An invitation has already been sent to this email address' });
      }

      // Generate invitation token and expiration (7 days)
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Store invitation in database
      const invitation = await storage.createInvitation({
        organizationId,
        email,
        role,
        invitedBy: userId,
        token,
        expiresAt
      });

      // Send invitation email
      const inviter = await storage.getUser(userId);
      const organization = await storage.getOrganization(organizationId);
      
      // Use the production domain for invitations
      const appUrl = 'https://sortifyapp.com';

      console.log('📧 Attempting to send invitation email...');
      console.log('📧 Email recipient:', email);
      console.log('📧 Organization:', organization?.name);
      console.log('📧 Inviter:', inviter?.email);
      console.log('📧 App URL:', appUrl);
      
      const emailSent = await sendInvitationEmail({
        to: email,
        organizationName: organization?.name || 'Unknown Organization',
        inviterName: inviter?.email?.split('@')[0] || 'Team Member',
        invitationToken: token,
        appUrl
      });
      
      console.log('📧 Invitation email result:', emailSent ? 'SUCCESS' : 'FAILED');

      if (!emailSent) {
        // If email fails, clean up the invitation
        await storage.deleteInvitation(invitation.id);
        return res.status(500).json({ message: 'Failed to send invitation email. Please try again.' });
      }

      res.status(200).json({ 
        success: true,
        message: 'Invitation sent successfully',
        invitation: { 
          id: invitation.id,
          email,
          role,
          organizationId,
          expiresAt
        }
      });
    } catch (error) {
      console.error('Error creating invitation:', error);
      res.status(500).json({ message: 'Failed to create invitation' });
    }
  });

  // Get pending invitations for organization
  app.get('/api/user-invitations', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const organizationId = req.organizationId;
      const userId = req.user.id;
      
      // Check if user has admin role
      const member = await storage.getOrganizationMember(organizationId, userId);
      if (!member || member.role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can view invitations' });
      }
      
      const invitations = await storage.getPendingInvitations(organizationId);
      res.json(invitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      res.status(500).json({ message: 'Failed to fetch invitations' });
    }
  });

  // Resend invitation
  app.post('/api/user-invitations/:id/resend', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const invitationId = req.params.id;
      const organizationId = req.organizationId;
      const userId = req.user.id;
      
      // Check if user has admin role
      const member = await storage.getOrganizationMember(organizationId, userId);
      if (!member || member.role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can resend invitations' });
      }
      
      // Get the existing invitation
      const invitations = await storage.getPendingInvitations(organizationId);
      const invitation = invitations.find(inv => inv.id === invitationId);
      
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found or already used' });
      }
      
      // Generate new token and extend expiration
      const newToken = crypto.randomUUID();
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      // Update invitation with new token
      const updatedInvitation = await storage.updateInvitationToken(invitationId, newToken, newExpiresAt);
      
      // Get organization and inviter details for email
      const organization = await storage.getOrganization(organizationId);
      const inviter = await storage.getUser(userId);
      
      // Send invitation email
      const appUrl = req.headers.host?.includes('replit.dev') 
        ? `https://${req.headers.host}` 
        : 'https://sortifyapp.com';
      
      const emailSent = await sendInvitationEmail({
        to: invitation.email,
        organizationName: organization?.name || 'Unknown Organization',
        inviterName: inviter?.email?.split('@')[0] || 'Team Member',
        invitationToken: newToken,
        appUrl
      });
      
      if (!emailSent) {
        return res.status(500).json({ message: 'Failed to resend invitation email. Please try again.' });
      }
      
      res.json({ 
        success: true,
        message: 'Invitation resent successfully',
        invitation: {
          id: updatedInvitation.id,
          email: updatedInvitation.email,
          role: updatedInvitation.role,
          expiresAt: updatedInvitation.expiresAt
        }
      });
    } catch (error) {
      console.error('Error resending invitation:', error);
      res.status(500).json({ message: 'Failed to resend invitation' });
    }
  });

  // Organization Settings routes
  app.get('/api/organization-settings/:organizationId', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      let settings = await storage.getOrganizationSettings(req.params.organizationId);
      
      // If no settings exist, create default ones
      if (!settings) {
        const defaultSettings = {
          organizationId: req.params.organizationId,
          packageTypes: ["package", "letter", "certified_mail", "express", "fragile"],
          packageSizes: ["small", "medium", "large", "extra_large"],
          courierCompanies: ["FedEx", "UPS", "DHL", "USPS", "Amazon", "Other"],
          customStatuses: ["pending", "notified", "delivered", "returned"],
          allowEditAfterDelivery: false,
          requirePhotoUpload: false,
          autoNotifyRecipients: true,
        };
        settings = await storage.upsertOrganizationSettings(defaultSettings);
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching organization settings:", error);
      res.status(500).json({ message: "Failed to fetch organization settings" });
    }
  });

  app.put('/api/organization-settings/:organizationId', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      // Only admins can update organization settings
      if (req.userRole !== 'admin') {
        return res.status(403).json({ message: "Only admins can update organization settings" });
      }

      const settings = await storage.updateOrganizationSettings(req.params.organizationId, req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating organization settings:", error);
      res.status(500).json({ message: "Failed to update organization settings" });
    }
  });

  // Recipients routes
  app.get('/api/recipients', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const recipients = await storage.getRecipients(req.organizationId);
      res.json(recipients);
    } catch (error) {
      console.error("Error fetching recipients:", error);
      res.status(500).json({ message: "Failed to fetch recipients" });
    }
  });

  app.post('/api/recipients', isAuthenticated, withOrganization, trialMiddleware, async (req: any, res) => {
    try {
      const validData = insertRecipientSchema.parse({
        ...req.body,
        organizationId: req.organizationId,
      });
      
      // Check for duplicate email within the same organization (only if email is provided)
      if (validData.email && validData.email.trim()) {
        const existingEmailRecipient = await storage.getRecipientByEmail(req.organizationId, validData.email.trim());
        if (existingEmailRecipient) {
          return res.status(400).json({ message: "A recipient with this email already exists" });
        }
      }
      
      // Check for duplicate phone within the same organization (if phone provided)
      if (validData.phone && validData.phone.trim() !== "") {
        const existingPhoneRecipient = await storage.getRecipientByPhone(req.organizationId, validData.phone);
        if (existingPhoneRecipient) {
          return res.status(400).json({ message: "A recipient with this phone number already exists" });
        }
      }
      
      const recipient = await storage.createRecipient(validData);
      res.json(recipient);
    } catch (error) {
      console.error("Error creating recipient:", error);
      if (error instanceof Error && error.message.includes("validation")) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to create recipient" });
      }
    }
  });

  app.put('/api/recipients/:id', isAuthenticated, withOrganization, trialMiddleware, async (req: any, res) => {
    try {
      const validData = insertRecipientSchema.partial().parse(req.body);
      const recipient = await storage.updateRecipient(req.params.id, validData);
      res.json(recipient);
    } catch (error) {
      console.error("Error updating recipient:", error);
      res.status(500).json({ message: "Failed to update recipient" });
    }
  });

  app.delete('/api/recipients/:id', isAuthenticated, withOrganization, trialMiddleware, async (req: any, res) => {
    try {
      await storage.deleteRecipient(req.params.id);
      res.json({ message: "Recipient deleted successfully" });
    } catch (error) {
      console.error("Error deleting recipient:", error);
      res.status(500).json({ message: "Failed to delete recipient" });
    }
  });

  // Mail items routes
  app.get('/api/mail-items', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const filters = {
        type: req.query.type,
        status: req.query.status,
        recipientId: req.query.recipientId,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
      };
      
      const mailItems = await storage.getMailItems(req.organizationId, filters);
      res.json(mailItems);
    } catch (error) {
      console.error("Error fetching mail items:", error);
      res.status(500).json({ message: "Failed to fetch mail items" });
    }
  });

  app.post('/api/mail-items', isAuthenticated, withOrganization, trialMiddleware, checkActionLimit('add_package'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validData = insertMailItemSchema.parse({
        ...req.body,
        organizationId: req.organizationId,
        createdBy: userId,
      });
      
      const mailItem = await storage.createMailItem(validData);
      
      // Update storage location capacity if assigned
      if (mailItem.locationId) {
        try {
          // First get all locations to find the specific one
          const allLocations = await storage.getMailroomLocations(req.organizationId);
          const currentLocation = allLocations.find(loc => loc.id === mailItem.locationId);
          
          if (currentLocation) {
            await storage.updateMailroomLocation(mailItem.locationId, {
              currentCount: (currentLocation.currentCount || 0) + 1,
            });
            console.log(`📦 Updated storage location ${currentLocation.name} capacity: ${(currentLocation.currentCount || 0) + 1}/${currentLocation.capacity}`);
          }
        } catch (locationError) {
          console.error('Error updating storage location capacity:', locationError);
        }
      }
      
      // Create history entry
      await storage.createMailItemHistory({
        mailItemId: mailItem.id,
        action: 'created',
        newStatus: mailItem.status,
        performedBy: userId,
      });
      
      res.json(mailItem);
    } catch (error) {
      console.error("Error creating mail item:", error);
      res.status(500).json({ message: "Failed to create mail item" });
    }
  });

  app.put('/api/mail-items/:id', isAuthenticated, withOrganization, trialMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentItem = await storage.getMailItem(req.params.id);
      
      if (!currentItem) {
        return res.status(404).json({ message: "Mail item not found" });
      }
      
      // Handle date conversion for notify functionality
      const bodyData = { ...req.body };
      if (bodyData.notifiedAt && typeof bodyData.notifiedAt === 'string') {
        bodyData.notifiedAt = new Date(bodyData.notifiedAt);
      }
      if (bodyData.deliveredAt && typeof bodyData.deliveredAt === 'string') {
        bodyData.deliveredAt = new Date(bodyData.deliveredAt);
      }
      
      const validData = insertMailItemSchema.partial().parse(bodyData);
      const updatedItem = await storage.updateMailItem(req.params.id, validData);
      
      // Create history entry if status changed
      if (validData.status && validData.status !== currentItem.status) {
        await storage.createMailItemHistory({
          mailItemId: updatedItem.id,
          action: 'status_changed',
          previousStatus: currentItem.status,
          newStatus: validData.status,
          performedBy: userId,
        });

        // Send email notification if status changed to "notified"
        if (validData.status === 'notified' && currentItem.recipient?.email) {
          try {
            console.log('📧 Status changed to notified, sending email to:', currentItem.recipient.email);
            const organization = await storage.getOrganization(req.organizationId);
            console.log('🏢 Organization for notification:', organization?.name);
            
            const success = await sendMailNotificationEmail({
              to: currentItem.recipient.email,
              recipientName: `${currentItem.recipient.firstName} ${currentItem.recipient.lastName}`,
              organizationName: organization?.name || 'Your Organization',
              mailType: updatedItem.type,
              sender: updatedItem.sender || undefined,
              trackingNumber: updatedItem.trackingNumber || undefined,
              arrivedAt: updatedItem.arrivedAt?.toISOString() || new Date().toISOString(),
            });
            
            if (success) {
              console.log(`✅ Mail notification email sent successfully to ${currentItem.recipient.email} for mail item ${updatedItem.id}`);
            } else {
              console.error(`❌ Failed to send mail notification email to ${currentItem.recipient.email}`);
            }
          } catch (emailError) {
            console.error('❌ Email notification error:', emailError);
            // Don't fail the mail item update if email fails
          }
        }

        // Update storage location capacity when item is delivered
        if (validData.status === 'delivered' && currentItem.locationId) {
          try {
            const allLocations = await storage.getMailroomLocations(req.organizationId);
            const currentLocation = allLocations.find(loc => loc.id === currentItem.locationId);
            
            if (currentLocation && currentLocation.currentCount && currentLocation.currentCount > 0) {
              await storage.updateMailroomLocation(currentItem.locationId, {
                currentCount: currentLocation.currentCount - 1,
              });
              console.log(`📦 Decreased storage location ${currentLocation.name} capacity: ${currentLocation.currentCount - 1}/${currentLocation.capacity}`);
            }
          } catch (locationError) {
            console.error('Error updating storage location capacity on delivery:', locationError);
          }
        }
      }
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating mail item:", error);
      res.status(500).json({ message: "Failed to update mail item" });
    }
  });

  app.get('/api/mail-items/:id', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const mailItem = await storage.getMailItem(req.params.id);
      if (!mailItem) {
        return res.status(404).json({ message: "Mail item not found" });
      }
      res.json(mailItem);
    } catch (error) {
      console.error("Error fetching mail item:", error);
      res.status(500).json({ message: "Failed to fetch mail item" });
    }
  });

  // DELETE route using POST to bypass middleware conflicts  
  app.post('/api/mail-items/:id/delete', async (req: any, res) => {
    console.log(`🚨 RAW DELETE ROUTE HIT - BYPASSING ALL MIDDLEWARE`);
    try {
      // Manually delete without any middleware
      await storage.deleteMailItem(req.params.id);
      console.log(`🚨 DIRECT DELETE COMPLETED for ${req.params.id}`);
      res.json({ message: "Mail item deleted successfully" });
    } catch (error) {
      console.error("Direct delete error:", error);
      res.status(500).json({ message: "Failed to delete mail item" });
    }
  });

  app.get('/api/mail-items/:id/history', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const history = await storage.getMailItemHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching mail item history:", error);
      res.status(500).json({ message: "Failed to fetch mail item history" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const stats = await storage.getDashboardStats(req.organizationId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get('/api/dashboard/recent-activity', isAuthenticated, withOrganization, trialMiddleware, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getRecentActivity(req.organizationId, limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Mailroom routes
  app.get('/api/mailrooms', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const mailrooms = await storage.getMailrooms(req.organizationId);
      res.json(mailrooms);
    } catch (error) {
      console.error("Error fetching mailrooms:", error);
      res.status(500).json({ message: "Failed to fetch mailrooms" });
    }
  });

  app.post('/api/mailrooms', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const mailroomData = { ...req.body, organizationId: req.organizationId };
      const mailroom = await storage.createMailroom(mailroomData);
      res.status(201).json(mailroom);
    } catch (error) {
      console.error("Error creating mailroom:", error);
      res.status(500).json({ message: "Failed to create mailroom" });
    }
  });

  app.put('/api/mailrooms/:id', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const mailroom = await storage.updateMailroom(req.params.id, req.body);
      res.setHeader('Content-Type', 'application/json');
      res.json(mailroom);
    } catch (error) {
      console.error("Error updating mailroom:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ message: "Failed to update mailroom" });
    }
  });

  // Mailroom location routes
  app.get('/api/mailroom-locations', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const locations = await storage.getMailroomLocations(req.organizationId);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching mailroom locations:", error);
      res.status(500).json({ message: "Failed to fetch mailroom locations" });
    }
  });

  app.delete('/api/mailrooms/:id', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const mailroomId = req.params.id;
      
      // Get storage locations for this specific mailroom
      const mailroomLocations = await storage.getMailroomLocationsByMailroom(mailroomId);
      
      // Check if any of these locations have associated packages
      const mailItems = await storage.getMailItems(req.organizationId, {});
      const hasPackages = mailItems.some((item: any) => 
        item.locationId && mailroomLocations.some((loc: any) => loc.id === item.locationId)
      );
      
      if (hasPackages) {
        return res.status(400).json({ message: "Cannot delete mailroom with associated packages" });
      }
      
      // Delete all storage locations in this mailroom first
      console.log(`Deleting ${mailroomLocations.length} storage locations for mailroom ${mailroomId}`);
      for (const location of mailroomLocations) {
        console.log(`Deleting storage location: ${location.id}`);
        await storage.deleteMailroomLocation(location.id);
      }
      
      // Now delete the mailroom
      console.log(`Deleting mailroom: ${mailroomId}`);
      await storage.deleteMailroom(mailroomId);
      res.json({ message: "Mailroom deleted successfully" });
    } catch (error) {
      console.error("Error deleting mailroom:", error);
      res.status(500).json({ message: "Failed to delete mailroom" });
    }
  });

  app.post('/api/mailroom-locations', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const data = { ...req.body, organizationId: req.organizationId };
      const location = await storage.createMailroomLocation(data);
      res.json(location);
    } catch (error) {
      console.error("Error creating mailroom location:", error);
      res.status(500).json({ message: "Failed to create mailroom location" });
    }
  });

  app.delete('/api/mailroom-locations/:id', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      await storage.deleteMailroomLocation(req.params.id);
      res.setHeader('Content-Type', 'application/json');
      res.json({ message: "Storage location deleted successfully" });
    } catch (error) {
      console.error("Error deleting storage location:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ message: "Failed to delete storage location" });
    }
  });

  // Integration routes
  app.get('/api/integrations', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const integrations = await storage.getIntegrations(req.organizationId);
      res.json(integrations);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      res.status(500).json({ message: "Failed to fetch integrations" });
    }
  });

  app.post('/api/integrations', isAuthenticated, withOrganization, trialMiddleware, async (req: any, res) => {
    try {
      if (req.userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const validData = insertIntegrationSchema.parse({
        ...req.body,
        organizationId: req.organizationId,
      });
      
      const integration = await storage.createIntegration(validData);
      res.json(integration);
    } catch (error) {
      console.error("Error creating integration:", error);
      res.status(500).json({ message: "Failed to create integration" });
    }
  });

  app.put('/api/integrations/:id', isAuthenticated, withOrganization, trialMiddleware, async (req: any, res) => {
    try {
      if (req.userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const validData = insertIntegrationSchema.partial().parse(req.body);
      const integration = await storage.updateIntegration(req.params.id, validData);
      res.json(integration);
    } catch (error) {
      console.error("Error updating integration:", error);
      res.status(500).json({ message: "Failed to update integration" });
    }
  });

  app.delete('/api/integrations/:id', isAuthenticated, withOrganization, trialMiddleware, async (req: any, res) => {
    try {
      if (req.userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      await storage.deleteIntegration(req.params.id);
      res.json({ message: "Integration deleted successfully" });
    } catch (error) {
      console.error("Error deleting integration:", error);
      res.status(500).json({ message: "Failed to delete integration" });
    }
  });

  // Organization settings routes
  app.get('/api/organization-settings', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const settings = await storage.getOrganizationSettings(req.organizationId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching organization settings:", error);
      res.status(500).json({ message: "Failed to fetch organization settings" });
    }
  });

  app.put('/api/organization-settings', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      if (req.userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const settingsData = { ...req.body, organizationId: req.organizationId };
      const settings = await storage.upsertOrganizationSettings(settingsData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating organization settings:", error);
      res.status(500).json({ message: "Failed to update organization settings" });
    }
  });

  app.patch('/api/organization-settings', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      if (req.userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const settingsData = { ...req.body, organizationId: req.organizationId };
      const settings = await storage.upsertOrganizationSettings(settingsData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating organization settings:", error);
      res.status(500).json({ message: "Failed to update organization settings" });
    }
  });

  // Photo upload endpoint
  app.post("/api/upload-photo", withOrganization, async (req: any, res) => {
    try {
      // For now, we'll need to implement proper file upload handling
      // This requires either cloud storage (AWS S3, Cloudinary, etc.) or local file storage
      console.log("Photo upload request received:", req.headers['content-type']);
      console.log("Request body type:", typeof req.body);
      
      // Generate a unique filename for the uploaded photo
      const timestamp = Date.now();
      const photoUrl = `/uploads/photos/${timestamp}.jpg`;
      
      // TODO: Implement actual file processing and storage
      // For demonstration, return the path where the file would be stored
      res.json({ photoUrl });
    } catch (error) {
      console.error("Photo upload error:", error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  // Password reset routes
  app.post('/api/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Return specific error for non-registered emails
        return res.status(400).json({ message: 'No account found with this email address. Please check your email or register for a new account.' });
      }

      // Clean up expired tokens first
      await storage.deleteExpiredPasswordResetTokens();

      // Generate secure token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt,
      });

      // Send password reset email
      // Use HTTPS for Replit deployment - Replit always uses HTTPS for external access
      const host = req.get('host');
      const appUrl = host?.includes('replit.') ? `https://${host}` : `${req.protocol}://${host}`;
      const emailSent = await sendPasswordResetEmail({
        to: email,
        name: user.firstName || user.id,
        resetToken,
        appUrl,
      });

      if (!emailSent) {
        console.error('Failed to send password reset email');
        return res.status(500).json({ message: 'Failed to send password reset email' });
      }

      res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ message: 'Failed to process password reset request' });
    }
  });

  app.post('/api/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: 'Token and password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
      }

      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: 'Reset token has expired' });
      }

      // Check if token has already been used
      if (resetToken.usedAt) {
        return res.status(400).json({ message: 'Reset token has already been used' });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(password);

      // Update user password
      await storage.updateUserPassword(resetToken.userId, hashedPassword);

      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(resetToken.id);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

  // PayPal payment routes
  app.get("/api/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/api/paypal/order", async (req, res) => {
    // Request body should contain: { intent, amount, currency }
    await createPaypalOrder(req, res);
  });

  app.post("/api/paypal/order/:orderID/capture", async (req, res) => {
    try {
      // First capture the PayPal payment
      await capturePaypalOrder(req, res);
      
      // Log successful PayPal payment for debugging
      console.log('PayPal payment captured successfully');
      
      // If we have plan information in the request body, handle subscription upgrade
      const { planType, userCount } = req.body;
      if (planType && userCount) {
        console.log(`PayPal payment completed for plan: ${planType}, users: ${userCount}`);
        // Note: Organization upgrade will need to be handled in the frontend
        // after successful payment, since we don't have authentication context here
      }
      
    } catch (error) {
      console.error('PayPal capture error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to process payment' });
      }
    }
  });

  // Billing and subscription endpoints
  app.get("/api/billing/info", isAuthenticated, withOrganization, async (req, res) => {
    try {
      const organizationId = req.headers["x-organization-id"] as string;
      
      // Get organization with billing info
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Get trial info
      const trialInfo = await TrialManager.getTrialInfo(organizationId);
      
      // Get current user count
      const currentUsers = await storage.getOrganizationMemberCount(organizationId);

      res.json({
        organization,
        trialInfo,
        currentUsers
      });
    } catch (error) {
      console.error('Billing info error:', error);
      res.status(500).json({ error: 'Failed to fetch billing information' });
    }
  });

  // Old manual billing upgrade endpoint - DISABLED in favor of Stripe Pricing Table
  // app.post("/api/billing/upgrade", isAuthenticated, withOrganization, async (req, res) => {
  //   // This endpoint has been replaced with Stripe Pricing Table automated subscriptions
  //   res.status(410).json({ error: 'This billing method has been deprecated. Please use the Stripe Pricing Table for subscriptions.' });
  // });

  // Old manual payment confirmation endpoint - DISABLED in favor of Stripe Pricing Table
  // app.post("/api/billing/confirm-payment", isAuthenticated, withOrganization, async (req, res) => {
  //   // This endpoint has been replaced with Stripe webhook handling for automated subscriptions
  //   res.status(410).json({ error: 'This billing method has been deprecated. Payments are now handled automatically via Stripe webhooks.' });
  // });

  // Stripe checkout success redirect endpoint  
  app.get('/api/checkout/success', async (req, res) => {
    try {
      const { session_id } = req.query;
      console.log('Stripe checkout success redirect:', { session_id });
      
      // Redirect to main app with success message
      res.redirect('/?subscription=success');
    } catch (error) {
      console.error('Checkout success redirect error:', error);
      res.redirect('/?subscription=error');
    }
  });

  app.patch("/api/billing/update", isAuthenticated, withOrganization, async (req, res) => {
    try {
      const organizationId = req.headers["x-organization-id"] as string;
      const { billingEmail } = req.body;

      if (!billingEmail) {
        return res.status(400).json({ error: 'Billing email is required' });
      }

      // Update organization billing information
      const updatedOrg = await storage.updateOrganization(organizationId, {
        billingEmail
      });

      res.json(updatedOrg);
    } catch (error) {
      console.error('Billing update error:', error);
      res.status(500).json({ error: 'Failed to update billing information' });
    }
  });

  // Create Stripe customer portal session
  app.post("/api/billing/create-portal-session", isAuthenticated, withOrganization, async (req, res) => {
    try {
      const organizationId = req.headers["x-organization-id"] as string;
      const organization = await storage.getOrganization(organizationId);
      
      if (!organization?.stripeCustomerId) {
        return res.status(400).json({ error: 'No Stripe customer ID found for this organization' });
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      
      const session = await stripe.billingPortal.sessions.create({
        customer: organization.stripeCustomerId,
        return_url: `${req.headers.origin || 'https://sortifyapp.com'}/settings`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Portal session creation error:', error);
      res.status(500).json({ error: 'Failed to create customer portal session' });
    }
  });

  // Create Stripe checkout session for license-based subscriptions
  app.post("/api/billing/create-checkout-session", isAuthenticated, withOrganization, async (req, res) => {
    try {
      const organizationId = req.headers["x-organization-id"] as string;
      const { planId, customerEmail } = req.body;

      if (!planId) {
        return res.status(400).json({ error: 'Plan ID is required' });
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      
      // For testing purposes, we'll create prices dynamically
      // In production, you should create these products/prices in your Stripe dashboard
      const planPricing: Record<string, { amount: number; name: string }> = {
        'starter': { amount: 2500, name: 'Starter License' },       // $25.00
        'professional': { amount: 3500, name: 'Professional License' }, // $35.00
        'enterprise': { amount: 4500, name: 'Enterprise License' }   // $45.00
      };

      const plan = planPricing[planId];
      if (!plan) {
        return res.status(400).json({ error: 'Invalid plan ID' });
      }

      // Create a price dynamically for this checkout session
      const price = await stripe.prices.create({
        unit_amount: plan.amount,
        currency: 'usd',
        recurring: { interval: 'month' },
        product_data: {
          name: plan.name,
        },
      });

      const origin = req.headers.origin || 'https://sortifyapp.com';
      
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        success_url: `${origin}/settings?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/settings?subscription=cancelled`,
        customer_email: customerEmail,
        client_reference_id: organizationId,
        metadata: {
          organizationId,
          planId,
        },
        subscription_data: {
          metadata: {
            organizationId,
            planId,
          },
        },
      });

      console.log('Stripe checkout session created:', {
        sessionId: session.id,
        organizationId,
        planId,
        url: session.url
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Checkout session creation error:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // Stripe webhook handler for subscription events
  app.post("/api/webhooks/stripe", express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error('Stripe webhook secret not configured');
      return res.status(400).send('Webhook secret not configured');
    }

    let event;

    try {
      // Initialize Stripe
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('Stripe webhook event received:', event.type);

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionUpdate(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionCancellation(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook handler error:', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  });

  // Helper functions for webhook handling
  async function handleSubscriptionUpdate(subscription: any) {
    console.log('Processing subscription update:', subscription.id);
    
    // Find organization by Stripe customer ID
    const organization = await storage.findOrganizationByStripeCustomerId(subscription.customer);
    if (!organization) {
      console.error('Organization not found for customer:', subscription.customer);
      return;
    }

    // Update organization with subscription details
    await storage.updateOrganizationBilling(organization.id, {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionStartDate: new Date(subscription.current_period_start * 1000),
      subscriptionEndDate: new Date(subscription.current_period_end * 1000),
      planType: subscription.items.data[0]?.price?.lookup_key || 'starter',
    });

    console.log('Subscription updated for organization:', organization.id);
  }

  async function handleSubscriptionCancellation(subscription: any) {
    console.log('Processing subscription cancellation:', subscription.id);
    
    const organization = await storage.findOrganizationByStripeCustomerId(subscription.customer);
    if (!organization) {
      console.error('Organization not found for customer:', subscription.customer);
      return;
    }

    await storage.updateOrganizationBilling(organization.id, {
      subscriptionStatus: 'cancelled',
      subscriptionEndDate: new Date(subscription.ended_at * 1000),
    });

    console.log('Subscription cancelled for organization:', organization.id);
  }

  async function handlePaymentSucceeded(invoice: any) {
    console.log('Processing successful payment:', invoice.id);
    
    const organization = await storage.findOrganizationByStripeCustomerId(invoice.customer);
    if (!organization) {
      console.error('Organization not found for customer:', invoice.customer);
      return;
    }

    await storage.updateOrganizationBilling(organization.id, {
      lastPaymentDate: new Date(invoice.status_transitions.paid_at * 1000),
      lastPaymentAmount: invoice.amount_paid / 100, // Convert from cents
    });

    console.log('Payment recorded for organization:', organization.id);
  }

  async function handlePaymentFailed(invoice: any) {
    console.log('Processing failed payment:', invoice.id);
    
    const organization = await storage.findOrganizationByStripeCustomerId(invoice.customer);
    if (!organization) {
      console.error('Organization not found for customer:', invoice.customer);
      return;
    }

    // You might want to send notifications or update subscription status
    console.log('Payment failed for organization:', organization.id);
  }

  // Organization upgrade endpoint for PayPal payments
  app.post("/api/organizations/:organizationId/upgrade", isAuthenticated, async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { planType, userCount, paypalOrderId } = req.body;

      if (!planType || !userCount) {
        return res.status(400).json({ error: 'Plan type and user count are required' });
      }

      // Get plan pricing
      const pricing = TrialManager.getPlanPricing();
      const selectedPlan = pricing[planType as keyof typeof pricing];

      if (!selectedPlan) {
        return res.status(400).json({ error: 'Invalid plan type' });
      }

      // Upgrade organization to paid plan
      await TrialManager.upgradeToPaidPlan(
        organizationId,
        planType as "starter" | "professional" | "enterprise",
        undefined, // No Stripe customer ID
        paypalOrderId // Use PayPal order ID for reference
      );

      // Update additional billing info
      const billingAmount = selectedPlan.pricePerUser * userCount;
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      await storage.updateOrganization(organizationId, {
        lastPaymentDate: new Date(),
        lastPaymentAmount: billingAmount * 100, // Store in cents
        nextBillingDate,
        billingCycle: "monthly"
      });

      console.log(`Organization ${organizationId} upgraded to ${planType} plan via PayPal`);

      res.json({ 
        success: true, 
        planType,
        userCount,
        totalAmount: billingAmount
      });

    } catch (error) {
      console.error('Organization upgrade error:', error);
      res.status(500).json({ error: 'Failed to upgrade organization' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
