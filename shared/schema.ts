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

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organizations table for multi-tenancy
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  contactName: varchar("contact_name", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  logoUrl: varchar("logo_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization members for multi-tenancy
export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("member"), // admin, member
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
  photoUrl: varchar("photo_url", { length: 2000 }),
  createdBy: varchar("created_by").references(() => users.id),
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
  performedBy: varchar("performed_by").references(() => users.id),
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

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  recipients: many(recipients),
  mailItems: many(mailItems),
  integrations: many(integrations),
  mailroomLocations: many(mailroomLocations),
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

export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = typeof integrations.$inferInsert;
export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
