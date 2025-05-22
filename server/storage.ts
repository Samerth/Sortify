import {
  users,
  organizations,
  organizationMembers,
  recipients,
  mailItems,
  mailItemHistory,
  integrations,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Organization operations
  createOrganization(data: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  getUserOrganizations(userId: string): Promise<(Organization & { role: string })[]>;
  updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization>;
  
  // Organization member operations
  addOrganizationMember(data: InsertOrganizationMember): Promise<OrganizationMember>;
  getOrganizationMember(organizationId: string, userId: string): Promise<OrganizationMember | undefined>;
  
  // Recipient operations
  getRecipients(organizationId: string): Promise<Recipient[]>;
  createRecipient(data: InsertRecipient): Promise<Recipient>;
  updateRecipient(id: string, data: Partial<InsertRecipient>): Promise<Recipient>;
  deleteRecipient(id: string): Promise<void>;
  
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
  
  // Mailroom location operations
  getMailroomLocations(organizationId: string): Promise<MailroomLocation[]>;
  createMailroomLocation(data: InsertMailroomLocation): Promise<MailroomLocation>;
  updateMailroomLocation(id: string, data: Partial<InsertMailroomLocation>): Promise<MailroomLocation>;
  deleteMailroomLocation(id: string): Promise<void>;
  
  // Integration operations
  getIntegrations(organizationId: string): Promise<Integration[]>;
  createIntegration(data: InsertIntegration): Promise<Integration>;
  updateIntegration(id: string, data: Partial<InsertIntegration>): Promise<Integration>;
  deleteIntegration(id: string): Promise<void>;
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

  // Organization operations
  async createOrganization(data: InsertOrganization): Promise<Organization> {
    const [organization] = await db
      .insert(organizations)
      .values(data)
      .returning();
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
    await db.delete(recipients).where(eq(recipients.id, id));
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
        trackingNumber: mailItems.trackingNumber,
        type: mailItems.type,
        sender: mailItems.sender,
        senderAddress: mailItems.senderAddress,
        description: mailItems.description,
        size: mailItems.size,
        weight: mailItems.weight,
        status: mailItems.status,
        arrivedAt: mailItems.arrivedAt,
        notifiedAt: mailItems.notifiedAt,
        deliveredAt: mailItems.deliveredAt,
        notes: mailItems.notes,
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
      recipient: row.recipient.id ? row.recipient : undefined,
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
        trackingNumber: mailItems.trackingNumber,
        type: mailItems.type,
        sender: mailItems.sender,
        senderAddress: mailItems.senderAddress,
        description: mailItems.description,
        size: mailItems.size,
        weight: mailItems.weight,
        status: mailItems.status,
        arrivedAt: mailItems.arrivedAt,
        notifiedAt: mailItems.notifiedAt,
        deliveredAt: mailItems.deliveredAt,
        notes: mailItems.notes,
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
        trackingNumber: mailItems.trackingNumber,
        type: mailItems.type,
        sender: mailItems.sender,
        senderAddress: mailItems.senderAddress,
        description: mailItems.description,
        size: mailItems.size,
        weight: mailItems.weight,
        status: mailItems.status,
        arrivedAt: mailItems.arrivedAt,
        notifiedAt: mailItems.notifiedAt,
        deliveredAt: mailItems.deliveredAt,
        notes: mailItems.notes,
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
      recipient: row.recipient.id ? row.recipient : undefined,
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
}

export const storage = new DatabaseStorage();
