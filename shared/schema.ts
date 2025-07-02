import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  password: varchar("password").notNull(),
  isSuperAdmin: boolean("is_super_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Organizations table for multi-tenancy
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  emailDomain: varchar("email_domain", { length: 255 }), // for auto-joining users by email domain
  address: text("address"),
  contactName: varchar("contact_name", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  logoUrl: varchar("logo_url", { length: 500 }),
  // License management
  maxUsers: integer("max_users").default(5), // number of user licenses
  // Billing and subscription fields
  planType: varchar("plan_type", { length: 50 }).default("trial"), // trial, starter, professional, enterprise
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default("trial"), // trial, active, past_due, canceled, incomplete
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  billingEmail: varchar("billing_email", { length: 255 }),
  // Trial management
  trialStartDate: timestamp("trial_start_date"),
  trialEndDate: timestamp("trial_end_date"),
  // Usage tracking
  maxPackagesPerMonth: integer("max_packages_per_month").default(500),
  currentMonthPackages: integer("current_month_packages").default(0),
  usageResetDate: timestamp("usage_reset_date").defaultNow(),
  // Billing cycle
  billingCycle: varchar("billing_cycle", { length: 20 }).default("monthly"), // monthly, yearly
  nextBillingDate: timestamp("next_billing_date"),
  // Payment info
  lastPaymentDate: timestamp("last_payment_date"),
  lastPaymentAmount: integer("last_payment_amount"), // in cents
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization members for multi-tenancy
export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("member"), // admin, member
  createdAt: timestamp("created_at").defaultNow(),
});

// User invitations for joining organizations
export const userInvitations = pgTable("user_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("member"),
  invitedBy: uuid("invited_by").references(() => users.id).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(), // invitation token
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Recipients within organizations (guests/employees/residents)
export const recipients = pgTable("recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  unit: varchar("unit", { length: 100 }),
  department: varchar("department", { length: 255 }),
  recipientType: varchar("recipient_type", { length: 50 }).notNull().default("guest"), // guest, employee, resident
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mailrooms (parent containers)
export const mailrooms = pgTable("mailrooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(), // "Main Mailroom", "Secondary Office", "Loading Dock"
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Storage locations within mailrooms (bins, shelves, etc.)
export const mailroomLocations = pgTable("mailroom_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  mailroomId: uuid("mailroom_id").references(() => mailrooms.id),
  name: varchar("name", { length: 255 }).notNull(), // "Bin A1", "Shelf 2-B", "Locker 15"
  type: varchar("type", { length: 50 }).notNull().default("bin"), // bin, shelf, locker, cold_storage
  capacity: integer("capacity").default(20),
  currentCount: integer("current_count").default(0),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mail items
export const mailItems = pgTable("mail_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  recipientId: uuid("recipient_id").references(() => recipients.id),
  locationId: uuid("location_id").references(() => mailroomLocations.id),
  mailroomId: uuid("mailroom_id").references(() => mailrooms.id),
  trackingNumber: varchar("tracking_number", { length: 255 }),
  type: varchar("type", { length: 50 }).notNull(), // package, letter, certified_mail
  sender: varchar("sender", { length: 255 }),
  courierCompany: varchar("courier_company", { length: 100 }),
  collectorName: varchar("collector_name", { length: 255 }),
  senderAddress: text("sender_address"),
  description: text("description"),
  size: varchar("size", { length: 50 }), // small, medium, large
  weight: varchar("weight", { length: 50 }),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, notified, delivered, returned
  arrivedAt: timestamp("arrived_at").defaultNow(),
  notifiedAt: timestamp("notified_at"),
  deliveredAt: timestamp("delivered_at"),
  notes: text("notes"),
  photoData: text("photo_data"), // Base64 encoded optimized image
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mail item history/audit trail
export const mailItemHistory = pgTable("mail_item_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  mailItemId: uuid("mail_item_id").references(() => mailItems.id).notNull(),
  action: varchar("action", { length: 100 }).notNull(), // created, notified, delivered, status_changed
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }),
  notes: text("notes"),
  performedBy: varchar("performed_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Integrations
export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // email, sms, webhook, api
  config: jsonb("config").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization settings for customizable dropdowns and preferences
export const organizationSettings = pgTable("organization_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull().unique(),
  packageTypes: jsonb("package_types").default('["package", "letter", "certified_mail", "express", "fragile"]'),
  packageSizes: jsonb("package_sizes").default('["small", "medium", "large", "extra_large"]'),
  courierCompanies: jsonb("courier_companies").default('["FedEx", "UPS", "DHL", "USPS", "Amazon", "Other"]'),
  customStatuses: jsonb("custom_statuses").default('["pending", "notified", "delivered", "returned"]'),
  allowEditAfterDelivery: boolean("allow_edit_after_delivery").default(false),
  requirePhotoUpload: boolean("require_photo_upload").default(false),
  autoNotifyRecipients: boolean("auto_notify_recipients").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  members: many(organizationMembers),
  recipients: many(recipients),
  mailItems: many(mailItems),
  integrations: many(integrations),
  mailroomLocations: many(mailroomLocations),
  settings: one(organizationSettings),
}));

export const usersRelations = relations(users, ({ many }) => ({
  organizationMemberships: many(organizationMembers),
  createdMailItems: many(mailItems),
  historyActions: many(mailItemHistory),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}));

export const mailroomsRelations = relations(mailrooms, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [mailrooms.organizationId],
    references: [organizations.id],
  }),
  locations: many(mailroomLocations),
  mailItems: many(mailItems),
}));

export const mailroomLocationsRelations = relations(mailroomLocations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [mailroomLocations.organizationId],
    references: [organizations.id],
  }),
  mailroom: one(mailrooms, {
    fields: [mailroomLocations.mailroomId],
    references: [mailrooms.id],
  }),
  mailItems: many(mailItems),
}));

export const recipientsRelations = relations(recipients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [recipients.organizationId],
    references: [organizations.id],
  }),
  mailItems: many(mailItems),
}));

export const mailItemsRelations = relations(mailItems, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [mailItems.organizationId],
    references: [organizations.id],
  }),
  recipient: one(recipients, {
    fields: [mailItems.recipientId],
    references: [recipients.id],
  }),
  location: one(mailroomLocations, {
    fields: [mailItems.locationId],
    references: [mailroomLocations.id],
  }),
  mailroom: one(mailrooms, {
    fields: [mailItems.mailroomId],
    references: [mailrooms.id],
  }),
  createdByUser: one(users, {
    fields: [mailItems.createdBy],
    references: [users.id],
  }),
  history: many(mailItemHistory),
}));

export const mailItemHistoryRelations = relations(mailItemHistory, ({ one }) => ({
  mailItem: one(mailItems, {
    fields: [mailItemHistory.mailItemId],
    references: [mailItems.id],
  }),
  performedByUser: one(users, {
    fields: [mailItemHistory.performedBy],
    references: [users.id],
  }),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
  organization: one(organizations, {
    fields: [integrations.organizationId],
    references: [organizations.id],
  }),
}));

export const organizationSettingsRelations = relations(organizationSettings, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationSettings.organizationId],
    references: [organizations.id],
  }),
}));

// Export types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;
export const insertOrganizationSchema = createInsertSchema(organizations);

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = typeof organizationMembers.$inferInsert;
export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers);

export type Recipient = typeof recipients.$inferSelect;
export type InsertRecipient = typeof recipients.$inferInsert;
export const insertRecipientSchema = createInsertSchema(recipients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  firstName: z.string().min(1, "First name is required").max(100, "First name must be less than 100 characters"),
  lastName: z.string().min(1, "Last name is required").max(100, "Last name must be less than 100 characters"),
  email: z.string().optional().or(z.literal("")).or(z.null())
    .transform(val => val === "" || val === null ? null : val)
    .refine(val => !val || z.string().email().safeParse(val).success, {
      message: "Invalid email format"
    }),
  phone: z.string().optional().or(z.literal("")).or(z.null()).transform(val => val === "" || val === null ? null : val),
  unit: z.string().optional(),
  department: z.string().optional(),
  recipientType: z.enum(["guest", "employee", "resident"]).default("guest"),
});

export type MailItem = typeof mailItems.$inferSelect;
export type InsertMailItem = typeof mailItems.$inferInsert;
export const insertMailItemSchema = createInsertSchema(mailItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MailItemHistory = typeof mailItemHistory.$inferSelect;
export type InsertMailItemHistory = typeof mailItemHistory.$inferInsert;

export type Mailroom = typeof mailrooms.$inferSelect;
export type InsertMailroom = typeof mailrooms.$inferInsert;
export const insertMailroomSchema = createInsertSchema(mailrooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MailroomLocation = typeof mailroomLocations.$inferSelect;
export type InsertMailroomLocation = typeof mailroomLocations.$inferInsert;
export const insertMailroomLocationSchema = createInsertSchema(mailroomLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserInvitation = typeof userInvitations.$inferInsert;
export const insertUserInvitationSchema = createInsertSchema(userInvitations).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});

export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = typeof integrations.$inferInsert;
export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type OrganizationSettings = typeof organizationSettings.$inferSelect;
export type InsertOrganizationSettings = typeof organizationSettings.$inferInsert;
export const insertOrganizationSettingsSchema = createInsertSchema(organizationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});
