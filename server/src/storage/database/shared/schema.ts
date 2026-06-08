import { pgTable, index, foreignKey, varchar, timestamp, serial, text, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 定义 gen_random_uuid 函数
const gen_random_uuid = () => sql`gen_random_uuid()`;



export const syncRequests = pgTable("sync_requests", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	articleId: varchar("article_id", { length: 36 }).notNull(),
	targetKnowledgeBaseId: varchar("target_knowledge_base_id", { length: 36 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	reviewedBy: varchar("reviewed_by", { length: 36 }),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("sync_requests_article_id_idx").using("btree", table.articleId.asc().nullsLast().op("text_ops")),
	index("sync_requests_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("sync_requests_target_knowledge_base_id_idx").using("btree", table.targetKnowledgeBaseId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.articleId],
			foreignColumns: [articles.id],
			name: "sync_requests_article_id_articles_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.targetKnowledgeBaseId],
			foreignColumns: [knowledgeBases.id],
			name: "sync_requests_target_knowledge_base_id_knowledge_bases_id_fk"
		}).onDelete("cascade"),
]);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const knowledgeBases = pgTable("knowledge_bases", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	type: varchar({ length: 20 }).notNull(),
	ownerId: varchar("owner_id", { length: 36 }),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("knowledge_bases_owner_id_idx").using("btree", table.ownerId.asc().nullsLast().op("text_ops")),
	index("knowledge_bases_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const articles = pgTable("articles", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	knowledgeBaseId: varchar("knowledge_base_id", { length: 36 }).notNull(),
	name: varchar({ length: 500 }).notNull(),
	content: text(),
	summary: text(),
	keyParagraphs: jsonb("key_paragraphs"),
	tags: jsonb(),
	sourceUrl: varchar("source_url", { length: 1000 }),
	author: varchar({ length: 255 }),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	docId: varchar("doc_id", { length: 100 }),
	status: varchar({ length: 20 }).default('approved').notNull(),
	createdBy: varchar("created_by", { length: 36 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("articles_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("articles_doc_id_idx").using("btree", table.docId.asc().nullsLast().op("text_ops")),
	index("articles_knowledge_base_id_idx").using("btree", table.knowledgeBaseId.asc().nullsLast().op("text_ops")),
	index("articles_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.knowledgeBaseId],
			foreignColumns: [knowledgeBases.id],
			name: "articles_knowledge_base_id_knowledge_bases_id_fk"
		}).onDelete("cascade"),
]);

export const userKnowledgeConfigs = pgTable("user_knowledge_configs", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	knowledgeBaseIds: jsonb("knowledge_base_ids").default([]).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("user_knowledge_configs_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);
