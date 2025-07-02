import {
  type User,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type OrganizationMember,
  type InsertOrganizationMember,
  type Recipient,
  type InsertRecipient,
  type MailItem,
  type InsertMailItem,
  type MailItemHistory,
  type InsertMailItemHistory,
  type Integration,
  type InsertIntegration,
  type OrganizationSettings,
  type InsertOrganizationSettings,
  type Mailroom,
  type InsertMailroom,
  type MailroomLocation,
  type InsertMailroomLocation,
  type UserInvitation,
  type InsertUserInvitation,
  type PasswordResetToken,
  type InsertPasswordResetToken,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sql, inArray } from "drizzle-orm";
import * as crypto from "crypto";
import {
  users,
  organizations,
  organizationMembers,
  recipients,
  mailItems,
  mailItemHistory,
  integrations,
  organizationSettings,
  mailrooms,
  mailroomLocations,
  userInvitations,
  passwordResetTokens,
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(userId: string, userData: Partial<User>): Promise<User>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<User>;
  
  // Password reset operations
  createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(id: string): Promise<void>;
  deleteExpiredPasswordResetTokens(): Promise<void>;
  
  // Super Admin operations
  getAllOrganizations(): Promise<(Organization & { memberCount: number; packageCount: number })[]>;
  getAllUsers(): Promise<(User & { organizations: Array<{ id: string; name: string; role: string }> })[]>;
  getSystemStats(): Promise<{
    totalOrganizations: number;
    totalUsers: number;
    activeTrials: number;
    paidSubscriptions: number;
    totalPackagesThisMonth: number;
    revenue: number;
  }>;
  updateUserSuperAdminStatus(userId: string, isSuperAdmin: boolean): Promise<User>;
  updateOrganizationStatus(orgId: string, updates: Partial<Organization>): Promise<Organization>;
  
  // Invitation operations
  createInvitation(data: InsertUserInvitation): Promise<UserInvitation>;
  getPendingInvitation(organizationId: string, email: string): Promise<UserInvitation | undefined>;
  deleteInvitation(id: string): Promise<void>;
  getInvitationByToken(token: string): Promise<UserInvitation | undefined>;
  markInvitationAsUsed(id: string): Promise<void>;
  
  // Organization operations
  createOrganization(data: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  getUserOrganizations(userId: string): Promise<(Organization & { role: string })[]>;
  updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization>;
  getOrganizationByEmailDomain(domain: string): Promise<Organization | undefined>;
  
  // Organization member operations
  addOrganizationMember(data: InsertOrganizationMember): Promise<OrganizationMember>;
  getOrganizationMember(organizationId: string, userId: string): Promise<OrganizationMember | undefined>;
  getOrganizationMembers(organizationId: string): Promise<(OrganizationMember & { user?: User })[]>;
  
  // Recipient operations
  getRecipients(organizationId: string): Promise<Recipient[]>;
  createRecipient(data: InsertRecipient): Promise<Recipient>;
  updateRecipient(id: string, data: Partial<InsertRecipient>): Promise<Recipient>;
  deleteRecipient(id: string): Promise<void>;
  getRecipientByEmail(organizationId: string, email: string): Promise<Recipient | undefined>;
  getRecipientByPhone(organizationId: string, phone: string): Promise<Recipient | undefined>;
  
  // Mail item operations
  getMailItems(organizationId: string, filters?: {
    type?: string;
    status?: string;
    recipientId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<(MailItem & { recipient?: Recipient })[]>;
  createMailItem(data: InsertMailItem): Promise<MailItem>;
  updateMailItem(id: string, data: Partial<InsertMailItem>): Promise<MailItem>;
  getMailItem(id: string): Promise<(MailItem & { recipient?: Recipient }) | undefined>;
  deleteMailItem(id: string): Promise<void>;
  
  // Mail item history operations
  createMailItemHistory(data: InsertMailItemHistory): Promise<MailItemHistory>;
  getMailItemHistory(mailItemId: string): Promise<MailItemHistory[]>;
  
  // Dashboard statistics
  getDashboardStats(organizationId: string): Promise<{
    todaysMail: number;
    pendingPickups: number;
    activeRecipients: number;
    deliveryRate: number;
  }>;
  
  // Recent activity
  getRecentActivity(organizationId: string, limit?: number): Promise<(MailItem & { recipient?: Recipient })[]>;
  
  // Mailroom operations (parent containers)
  getMailrooms(organizationId: string): Promise<Mailroom[]>;
  createMailroom(data: InsertMailroom): Promise<Mailroom>;
  updateMailroom(id: string, data: Partial<InsertMailroom>): Promise<Mailroom>;
  deleteMailroom(id: string): Promise<void>;
  
  // Storage location operations (bins, shelves within mailrooms)
  getMailroomLocations(organizationId: string): Promise<(MailroomLocation & { mailroomName?: string })[]>;
  getMailroomLocationsByMailroom(mailroomId: string): Promise<MailroomLocation[]>;
  createMailroomLocation(data: InsertMailroomLocation): Promise<MailroomLocation>;
  updateMailroomLocation(id: string, data: Partial<InsertMailroomLocation>): Promise<MailroomLocation>;
  deleteMailroomLocation(id: string): Promise<void>;
  
  // Integration operations
  getIntegrations(organizationId: string): Promise<Integration[]>;
  createIntegration(data: InsertIntegration): Promise<Integration>;
  updateIntegration(id: string, data: Partial<InsertIntegration>): Promise<Integration>;
  deleteIntegration(id: string): Promise<void>;

  // Organization settings operations
  getOrganizationSettings(organizationId: string): Promise<OrganizationSettings | undefined>;
  upsertOrganizationSettings(data: InsertOrganizationSettings): Promise<OrganizationSettings>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Password reset operations
  async createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [token] = await db
      .insert(passwordResetTokens)
      .values(data)
      .returning();
    return token;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken;
  }

  async markPasswordResetTokenAsUsed(id: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(sql`${passwordResetTokens.expiresAt} < NOW()`);
  }

  // Invitation operations
  async createInvitation(data: InsertUserInvitation): Promise<UserInvitation> {
    const [invitation] = await db
      .insert(userInvitations)
      .values(data)
      .returning();
    return invitation;
  }

  async getPendingInvitation(organizationId: string, email: string): Promise<UserInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(userInvitations)
      .where(
        and(
          eq(userInvitations.organizationId, organizationId),
          eq(userInvitations.email, email),
          sql`${userInvitations.usedAt} IS NULL`,
          sql`${userInvitations.expiresAt} > NOW()`
        )
      );
    return invitation;
  }

  async deleteInvitation(id: string): Promise<void> {
    await db.delete(userInvitations).where(eq(userInvitations.id, id));
  }

  async getInvitationByToken(token: string): Promise<UserInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(userInvitations)
      .where(
        and(
          eq(userInvitations.token, token),
          sql`${userInvitations.usedAt} IS NULL`,
          sql`${userInvitations.expiresAt} > NOW()`
        )
      );
    return invitation;
  }

  async markInvitationAsUsed(id: string): Promise<void> {
    await db
      .update(userInvitations)
      .set({ usedAt: new Date() })
      .where(eq(userInvitations.id, id));
  }

  // Organization operations
  async createOrganization(data: InsertOrganization): Promise<Organization> {
    const [organization] = await db
      .insert(organizations)
      .values(data)
      .returning();
    
    // Initialize trial for new organization
    const { TrialManager } = await import("./trialManager");
    await TrialManager.initializeTrial(organization.id);
    
    return organization;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    return organization;
  }

  async getUserOrganizations(userId: string): Promise<(Organization & { role: string })[]> {
    const result = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        address: organizations.address,
        contactName: organizations.contactName,
        contactEmail: organizations.contactEmail,
        contactPhone: organizations.contactPhone,
        logoUrl: organizations.logoUrl,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        role: organizationMembers.role,
      })
      .from(organizations)
      .innerJoin(organizationMembers, eq(organizations.id, organizationMembers.organizationId))
      .where(eq(organizationMembers.userId, userId));
    
    return result;
  }

  async updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization> {
    const [organization] = await db
      .update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return organization;
  }

  async getOrganizationByEmailDomain(domain: string): Promise<Organization | undefined> {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.emailDomain, domain));
    return organization;
  }

  // Organization member operations
  async addOrganizationMember(data: InsertOrganizationMember): Promise<OrganizationMember> {
    const [member] = await db
      .insert(organizationMembers)
      .values(data)
      .returning();
    return member;
  }

  async getOrganizationMember(organizationId: string, userId: string): Promise<OrganizationMember | undefined> {
    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId)
        )
      );
    return member;
  }

  async getOrganizationMembers(organizationId: string): Promise<(OrganizationMember & { user?: User })[]> {
    const members = await db
      .select({
        id: organizationMembers.id,
        organizationId: organizationMembers.organizationId,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        createdAt: organizationMembers.createdAt,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userProfileImageUrl: users.profileImageUrl,
      })
      .from(organizationMembers)
      .leftJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, organizationId));

    return members.map(member => ({
      id: member.id,
      organizationId: member.organizationId,
      userId: member.userId,
      role: member.role,
      createdAt: member.createdAt,
      user: member.userEmail ? {
        id: member.userId,
        email: member.userEmail,
        firstName: member.userFirstName,
        lastName: member.userLastName,
        profileImageUrl: member.userProfileImageUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      } : undefined
    }));
  }

  // Recipient operations
  async getRecipients(organizationId: string): Promise<Recipient[]> {
    return await db
      .select()
      .from(recipients)
      .where(eq(recipients.organizationId, organizationId))
      .orderBy(recipients.lastName, recipients.firstName);
  }

  async createRecipient(data: InsertRecipient): Promise<Recipient> {
    const [recipient] = await db
      .insert(recipients)
      .values(data)
      .returning();
    return recipient;
  }

  async updateRecipient(id: string, data: Partial<InsertRecipient>): Promise<Recipient> {
    const [recipient] = await db
      .update(recipients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(recipients.id, id))
      .returning();
    return recipient;
  }

  async deleteRecipient(id: string): Promise<void> {
    // Simple approach: prevent deletion if recipient has mail items
    const mailItemCount = await db.select({ count: count() }).from(mailItems).where(eq(mailItems.recipientId, id));
    if (mailItemCount[0]?.count > 0) {
      throw new Error("Cannot delete recipient with existing mail items. Please remove all mail items first.");
    }
    
    await db.delete(recipients).where(eq(recipients.id, id));
  }

  async getRecipientByEmail(organizationId: string, email: string): Promise<Recipient | undefined> {
    if (!email || email.trim() === "") return undefined;
    const [recipient] = await db
      .select()
      .from(recipients)
      .where(and(eq(recipients.organizationId, organizationId), eq(recipients.email, email.trim())));
    return recipient;
  }

  async getRecipientByPhone(organizationId: string, phone: string): Promise<Recipient | undefined> {
    const [recipient] = await db
      .select()
      .from(recipients)
      .where(and(eq(recipients.organizationId, organizationId), eq(recipients.phone, phone)));
    return recipient;
  }

  // Mail item operations
  async getMailItems(organizationId: string, filters?: {
    type?: string;
    status?: string;
    recipientId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<(MailItem & { recipient?: Recipient })[]> {
    let query = db
      .select({
        id: mailItems.id,
        organizationId: mailItems.organizationId,
        recipientId: mailItems.recipientId,
        locationId: mailItems.locationId,
        mailroomId: mailItems.mailroomId,
        trackingNumber: mailItems.trackingNumber,
        type: mailItems.type,
        sender: mailItems.sender,
        courierCompany: mailItems.courierCompany,
        collectorName: mailItems.collectorName,
        senderAddress: mailItems.senderAddress,
        description: mailItems.description,
        size: mailItems.size,
        weight: mailItems.weight,
        status: mailItems.status,
        arrivedAt: mailItems.arrivedAt,
        notifiedAt: mailItems.notifiedAt,
        deliveredAt: mailItems.deliveredAt,
        notes: mailItems.notes,
        photoData: mailItems.photoData,
        createdBy: mailItems.createdBy,
        createdAt: mailItems.createdAt,
        updatedAt: mailItems.updatedAt,
        recipient: {
          id: recipients.id,
          organizationId: recipients.organizationId,
          firstName: recipients.firstName,
          lastName: recipients.lastName,
          email: recipients.email,
          phone: recipients.phone,
          unit: recipients.unit,
          department: recipients.department,
          isActive: recipients.isActive,
          createdAt: recipients.createdAt,
          updatedAt: recipients.updatedAt,
        },
      })
      .from(mailItems)
      .leftJoin(recipients, eq(mailItems.recipientId, recipients.id))
      .where(eq(mailItems.organizationId, organizationId));

    if (filters?.type) {
      query = query.where(and(eq(mailItems.organizationId, organizationId), eq(mailItems.type, filters.type)));
    }
    if (filters?.status) {
      query = query.where(and(eq(mailItems.organizationId, organizationId), eq(mailItems.status, filters.status)));
    }
    if (filters?.recipientId) {
      query = query.where(and(eq(mailItems.organizationId, organizationId), eq(mailItems.recipientId, filters.recipientId)));
    }

    const result = await query.orderBy(desc(mailItems.arrivedAt));
    
    return result.map(row => ({
      ...row,
      recipient: row.recipient?.id ? row.recipient : undefined,
    }));
  }

  async createMailItem(data: InsertMailItem): Promise<MailItem> {
    const [mailItem] = await db
      .insert(mailItems)
      .values(data)
      .returning();
    return mailItem;
  }

  async updateMailItem(id: string, data: Partial<InsertMailItem>): Promise<MailItem> {
    const [mailItem] = await db
      .update(mailItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(mailItems.id, id))
      .returning();
    return mailItem;
  }

  async getMailItem(id: string): Promise<(MailItem & { recipient?: Recipient }) | undefined> {
    const [result] = await db
      .select({
        id: mailItems.id,
        organizationId: mailItems.organizationId,
        recipientId: mailItems.recipientId,
        locationId: mailItems.locationId,
        mailroomId: mailItems.mailroomId,
        trackingNumber: mailItems.trackingNumber,
        type: mailItems.type,
        sender: mailItems.sender,
        courierCompany: mailItems.courierCompany,
        collectorName: mailItems.collectorName,
        senderAddress: mailItems.senderAddress,
        description: mailItems.description,
        size: mailItems.size,
        weight: mailItems.weight,
        status: mailItems.status,
        arrivedAt: mailItems.arrivedAt,
        notifiedAt: mailItems.notifiedAt,
        deliveredAt: mailItems.deliveredAt,
        notes: mailItems.notes,
        photoData: mailItems.photoData,
        createdBy: mailItems.createdBy,
        createdAt: mailItems.createdAt,
        updatedAt: mailItems.updatedAt,
        recipient: {
          id: recipients.id,
          organizationId: recipients.organizationId,
          firstName: recipients.firstName,
          lastName: recipients.lastName,
          email: recipients.email,
          phone: recipients.phone,
          unit: recipients.unit,
          department: recipients.department,
          isActive: recipients.isActive,
          createdAt: recipients.createdAt,
          updatedAt: recipients.updatedAt,
        },
      })
      .from(mailItems)
      .leftJoin(recipients, eq(mailItems.recipientId, recipients.id))
      .where(eq(mailItems.id, id));

    if (!result) return undefined;

    return {
      ...result,
      recipient: result.recipient.id ? result.recipient : undefined,
    };
  }

  async deleteMailItem(id: string): Promise<void> {
    console.log(`=== DELETE OPERATION START for ID: ${id} ===`);
    
    try {
      // Check if item exists before deletion
      const existsBefore = await db.select({ count: sql`count(*)` }).from(mailItems).where(eq(mailItems.id, id));
      console.log(`Item exists before delete: ${existsBefore[0]?.count}`);
      
      // Delete history first
      console.log(`Deleting history for mail item: ${id}`);
      const historyResult = await db.execute(sql`DELETE FROM mail_item_history WHERE mail_item_id = ${id}`);
      console.log(`History delete result:`, historyResult);
      
      // Delete the mail item
      console.log(`Deleting mail item: ${id}`);
      const itemResult = await db.execute(sql`DELETE FROM mail_items WHERE id = ${id}`);
      console.log(`Item delete result:`, itemResult);
      
      // Check if item still exists after deletion
      const existsAfter = await db.select({ count: sql`count(*)` }).from(mailItems).where(eq(mailItems.id, id));
      console.log(`Item exists after delete: ${existsAfter[0]?.count}`);
      
      console.log(`=== DELETE OPERATION COMPLETE for ID: ${id} ===`);
    } catch (error) {
      console.error(`=== DELETE OPERATION FAILED for ID: ${id} ===`, error);
      throw error;
    }
  }

  // Mail item history operations
  async createMailItemHistory(data: InsertMailItemHistory): Promise<MailItemHistory> {
    const [history] = await db
      .insert(mailItemHistory)
      .values(data)
      .returning();
    return history;
  }

  async getMailItemHistory(mailItemId: string): Promise<MailItemHistory[]> {
    return await db
      .select()
      .from(mailItemHistory)
      .where(eq(mailItemHistory.mailItemId, mailItemId))
      .orderBy(desc(mailItemHistory.createdAt));
  }

  // Dashboard statistics
  async getDashboardStats(organizationId: string): Promise<{
    todaysMail: number;
    pendingPickups: number;
    activeRecipients: number;
    deliveryRate: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's mail count
    const [todaysMailResult] = await db
      .select({ count: count() })
      .from(mailItems)
      .where(
        and(
          eq(mailItems.organizationId, organizationId),
          sql`${mailItems.arrivedAt} >= ${today}`,
          sql`${mailItems.arrivedAt} < ${tomorrow}`
        )
      );

    // Pending pickups count
    const [pendingPickupsResult] = await db
      .select({ count: count() })
      .from(mailItems)
      .where(
        and(
          eq(mailItems.organizationId, organizationId),
          eq(mailItems.status, 'pending')
        )
      );

    // Active recipients count
    const [activeRecipientsResult] = await db
      .select({ count: count() })
      .from(recipients)
      .where(
        and(
          eq(recipients.organizationId, organizationId),
          eq(recipients.isActive, true)
        )
      );

    // Delivery rate calculation (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalMailResult] = await db
      .select({ count: count() })
      .from(mailItems)
      .where(
        and(
          eq(mailItems.organizationId, organizationId),
          sql`${mailItems.arrivedAt} >= ${thirtyDaysAgo}`
        )
      );

    const [deliveredMailResult] = await db
      .select({ count: count() })
      .from(mailItems)
      .where(
        and(
          eq(mailItems.organizationId, organizationId),
          eq(mailItems.status, 'delivered'),
          sql`${mailItems.arrivedAt} >= ${thirtyDaysAgo}`
        )
      );

    const deliveryRate = totalMailResult.count > 0 
      ? (deliveredMailResult.count / totalMailResult.count) * 100 
      : 0;

    return {
      todaysMail: todaysMailResult.count,
      pendingPickups: pendingPickupsResult.count,
      activeRecipients: activeRecipientsResult.count,
      deliveryRate: Math.round(deliveryRate * 10) / 10, // Round to 1 decimal place
    };
  }

  // Recent activity
  async getRecentActivity(organizationId: string, limit: number = 10): Promise<(MailItem & { recipient?: Recipient })[]> {
    const result = await db
      .select({
        id: mailItems.id,
        organizationId: mailItems.organizationId,
        recipientId: mailItems.recipientId,
        locationId: mailItems.locationId,
        mailroomId: mailItems.mailroomId,
        trackingNumber: mailItems.trackingNumber,
        type: mailItems.type,
        sender: mailItems.sender,
        courierCompany: mailItems.courierCompany,
        collectorName: mailItems.collectorName,
        senderAddress: mailItems.senderAddress,
        description: mailItems.description,
        size: mailItems.size,
        weight: mailItems.weight,
        status: mailItems.status,
        arrivedAt: mailItems.arrivedAt,
        notifiedAt: mailItems.notifiedAt,
        deliveredAt: mailItems.deliveredAt,
        notes: mailItems.notes,
        photoData: mailItems.photoData,
        createdBy: mailItems.createdBy,
        createdAt: mailItems.createdAt,
        updatedAt: mailItems.updatedAt,
        recipient: {
          id: recipients.id,
          organizationId: recipients.organizationId,
          firstName: recipients.firstName,
          lastName: recipients.lastName,
          email: recipients.email,
          phone: recipients.phone,
          unit: recipients.unit,
          department: recipients.department,
          isActive: recipients.isActive,
          createdAt: recipients.createdAt,
          updatedAt: recipients.updatedAt,
        },
      })
      .from(mailItems)
      .leftJoin(recipients, eq(mailItems.recipientId, recipients.id))
      .where(eq(mailItems.organizationId, organizationId))
      .orderBy(desc(mailItems.arrivedAt))
      .limit(limit);
    
    return result.map(row => ({
      ...row,
      recipient: row.recipient?.id ? row.recipient : undefined,
    }));
  }

  // Integration operations
  async getIntegrations(organizationId: string): Promise<Integration[]> {
    return await db
      .select()
      .from(integrations)
      .where(eq(integrations.organizationId, organizationId))
      .orderBy(integrations.name);
  }

  async createIntegration(data: InsertIntegration): Promise<Integration> {
    const [integration] = await db
      .insert(integrations)
      .values(data)
      .returning();
    return integration;
  }

  async updateIntegration(id: string, data: Partial<InsertIntegration>): Promise<Integration> {
    const [integration] = await db
      .update(integrations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(integrations.id, id))
      .returning();
    return integration;
  }

  async deleteIntegration(id: string): Promise<void> {
    await db.delete(integrations).where(eq(integrations.id, id));
  }

  // Mailroom operations
  async getMailrooms(organizationId: string): Promise<Mailroom[]> {
    return await db
      .select()
      .from(mailrooms)
      .where(eq(mailrooms.organizationId, organizationId))
      .orderBy(mailrooms.name);
  }

  async createMailroom(data: InsertMailroom): Promise<Mailroom> {
    const [mailroom] = await db
      .insert(mailrooms)
      .values(data)
      .returning();
    return mailroom;
  }

  async updateMailroom(id: string, data: Partial<InsertMailroom>): Promise<Mailroom> {
    const [mailroom] = await db
      .update(mailrooms)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(mailrooms.id, id))
      .returning();
    return mailroom;
  }

  async deleteMailroom(id: string): Promise<void> {
    await db.delete(mailrooms).where(eq(mailrooms.id, id));
  }

  async getMailroomLocationsByMailroom(mailroomId: string): Promise<MailroomLocation[]> {
    return await db
      .select()
      .from(mailroomLocations)
      .where(eq(mailroomLocations.mailroomId, mailroomId))
      .orderBy(mailroomLocations.name);
  }

  // Mailroom location operations
  async getMailroomLocations(organizationId: string): Promise<MailroomLocation[]> {
    return await db
      .select()
      .from(mailroomLocations)
      .where(eq(mailroomLocations.organizationId, organizationId));
  }

  async createMailroomLocation(data: InsertMailroomLocation): Promise<MailroomLocation> {
    const [location] = await db
      .insert(mailroomLocations)
      .values(data)
      .returning();
    return location;
  }

  async updateMailroomLocation(id: string, data: Partial<InsertMailroomLocation>): Promise<MailroomLocation> {
    const [location] = await db
      .update(mailroomLocations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(mailroomLocations.id, id))
      .returning();
    return location;
  }

  async deleteMailroomLocation(id: string): Promise<void> {
    await db.delete(mailroomLocations).where(eq(mailroomLocations.id, id));
  }

  // Organization settings operations
  async getOrganizationSettings(organizationId: string): Promise<OrganizationSettings | undefined> {
    const [settings] = await db
      .select()
      .from(organizationSettings)
      .where(eq(organizationSettings.organizationId, organizationId));
    return settings || undefined;
  }

  async upsertOrganizationSettings(data: InsertOrganizationSettings): Promise<OrganizationSettings> {
    const [settings] = await db
      .insert(organizationSettings)
      .values(data)
      .onConflictDoUpdate({
        target: organizationSettings.organizationId,
        set: {
          ...data,
          updatedAt: new Date(),
        },
      })
      .returning();
    return settings;
  }

  // Super Admin operations
  async getAllOrganizations(): Promise<(Organization & { memberCount: number; packageCount: number })[]> {
    const orgs = await db.select().from(organizations);
    
    const orgsWithCounts = await Promise.all(
      orgs.map(async (org) => {
        const [memberCountResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(organizationMembers)
          .where(eq(organizationMembers.organizationId, org.id));
        
        const [packageCountResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(mailItems)
          .where(eq(mailItems.organizationId, org.id));
        
        return {
          ...org,
          memberCount: memberCountResult?.count || 0,
          packageCount: packageCountResult?.count || 0,
        };
      })
    );
    
    return orgsWithCounts;
  }

  async getAllUsers(): Promise<(User & { organizations: Array<{ id: string; name: string; role: string }> })[]> {
    const allUsers = await db.select().from(users);
    
    const usersWithOrgs = await Promise.all(
      allUsers.map(async (user) => {
        const userOrgs = await db
          .select({
            id: organizations.id,
            name: organizations.name,
            role: organizationMembers.role,
          })
          .from(organizationMembers)
          .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
          .where(eq(organizationMembers.userId, user.id));
        
        return {
          ...user,
          organizations: userOrgs,
        };
      })
    );
    
    return usersWithOrgs;
  }

  async getSystemStats(): Promise<{
    totalOrganizations: number;
    totalUsers: number;
    activeTrials: number;
    paidSubscriptions: number;
    totalPackagesThisMonth: number;
    revenue: number;
  }> {
    const [orgCount] = await db.select({ count: sql<number>`count(*)` }).from(organizations);
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    
    const [trialCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizations)
      .where(eq(organizations.planType, 'trial'));
    
    const [paidCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizations)
      .where(and(
        ne(organizations.planType, 'trial'),
        eq(organizations.subscriptionStatus, 'active')
      ));
    
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const [packageCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mailItems)
      .where(gte(mailItems.createdAt, currentMonth));
    
    // Calculate revenue (simplified - would need actual billing data)
    const revenue = paidCount.count * 100; // Placeholder calculation
    
    return {
      totalOrganizations: orgCount.count,
      totalUsers: userCount.count,
      activeTrials: trialCount.count,
      paidSubscriptions: paidCount.count,
      totalPackagesThisMonth: packageCount.count,
      revenue,
    };
  }

  async updateUserSuperAdminStatus(userId: string, isSuperAdmin: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isSuperAdmin, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateOrganizationStatus(orgId: string, updates: Partial<Organization>): Promise<Organization> {
    const [org] = await db
      .update(organizations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(organizations.id, orgId))
      .returning();
    return org;
  }
}

export const storage = new DatabaseStorage();
