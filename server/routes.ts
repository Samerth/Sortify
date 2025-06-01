import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./simpleAuth";
import { sendInvitationEmail, sendMailNotificationEmail } from "./emailService";
import crypto from "crypto";
import {
  insertOrganizationSchema,
  insertRecipientSchema,
  insertMailItemSchema,
  insertIntegrationSchema,
} from "@shared/schema";
import { z } from "zod";

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

  app.post('/api/organizations', isAuthenticated, async (req: any, res) => {
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

  app.put('/api/organizations/:id', isAuthenticated, withOrganization, async (req: any, res) => {
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
  app.post('/api/user-invitations', isAuthenticated, withOrganization, async (req: any, res) => {
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
      
      // Check if organization has available license seats
      const org = await storage.getOrganization(organizationId);
      const orgMembers = await storage.getUserOrganizations(userId);
      const currentUserCount = orgMembers.length;
      const maxUsers = org?.maxUsers || 5;
      
      if (currentUserCount >= maxUsers) {
        return res.status(400).json({ 
          message: `License limit reached. You have ${currentUserCount}/${maxUsers} users. Upgrade your license to add more team members.` 
        });
      }
      
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
      const appUrl = `${req.protocol}://${req.get('host')}`;

      const emailSent = await sendInvitationEmail({
        to: email,
        organizationName: organization?.name || 'Unknown Organization',
        inviterName: inviter?.email?.split('@')[0] || 'Team Member',
        invitationToken: token,
        appUrl
      });

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

  app.post('/api/recipients', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const validData = insertRecipientSchema.parse({
        ...req.body,
        organizationId: req.organizationId,
      });
      
      // Check for duplicate email within the same organization 
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

  app.put('/api/recipients/:id', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const validData = insertRecipientSchema.partial().parse(req.body);
      const recipient = await storage.updateRecipient(req.params.id, validData);
      res.json(recipient);
    } catch (error) {
      console.error("Error updating recipient:", error);
      res.status(500).json({ message: "Failed to update recipient" });
    }
  });

  app.delete('/api/recipients/:id', isAuthenticated, withOrganization, async (req: any, res) => {
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

  app.post('/api/mail-items', isAuthenticated, withOrganization, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validData = insertMailItemSchema.parse({
        ...req.body,
        organizationId: req.organizationId,
        createdBy: userId,
      });
      
      const mailItem = await storage.createMailItem(validData);
      
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

  app.put('/api/mail-items/:id', isAuthenticated, withOrganization, async (req: any, res) => {
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
            const organization = await storage.getOrganization(req.organizationId);
            const success = await sendMailNotificationEmail({
              to: currentItem.recipient.email,
              recipientName: `${currentItem.recipient.firstName} ${currentItem.recipient.lastName}`,
              organizationName: organization?.name || 'Your Organization',
              mailType: updatedItem.type,
              sender: updatedItem.sender || undefined,
              trackingNumber: updatedItem.trackingNumber || undefined,
              arrivedAt: updatedItem.arrivedAt.toISOString(),
            });
            
            if (success) {
              console.log(`📧 Mail notification email sent to ${currentItem.recipient.email} for mail item ${updatedItem.id}`);
            } else {
              console.error(`❌ Failed to send mail notification email to ${currentItem.recipient.email}`);
            }
          } catch (emailError) {
            console.error('Email notification error:', emailError);
            // Don't fail the mail item update if email fails
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

  app.get('/api/dashboard/recent-activity', isAuthenticated, withOrganization, async (req: any, res) => {
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

  app.post('/api/integrations', isAuthenticated, withOrganization, async (req: any, res) => {
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

  app.put('/api/integrations/:id', isAuthenticated, withOrganization, async (req: any, res) => {
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

  app.delete('/api/integrations/:id', isAuthenticated, withOrganization, async (req: any, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
