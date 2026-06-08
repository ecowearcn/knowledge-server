import { pgTable, serial, timestamp, varchar, text, boolean, jsonb, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 系统健康检查表（禁止删除）
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 知识库表
export const knowledgeBases = pgTable(
  "knowledge_bases",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 20 }).notNull(), // 'official' | 'member'
    owner_id: varchar("owner_id", { length: 36 }), // 创建者ID（官方库为 null）
    description: text("description"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("knowledge_bases_type_idx").on(table.type),
    index("knowledge_bases_owner_id_idx").on(table.owner_id),
  ]
);

// 文章表
export const articles = pgTable(
  "articles",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    knowledge_base_id: varchar("knowledge_base_id", { length: 36 }).notNull().references(() => knowledgeBases.id, { onDelete: "cascade" }),
    title: varchar("name", { length: 500 }).notNull(),
    content: text("content"), // 完整正文
    summary: text("summary"), // 概要
    key_paragraphs: jsonb("key_paragraphs").$type<string[]>(), // 关键段落
    tags: jsonb("tags").$type<string[]>(), // 标签
    source_url: varchar("source_url", { length: 1000 }), // 原文链接
    author: varchar("author", { length: 255 }), // 原文作者
    published_at: timestamp("published_at", { withTimezone: true }), // 原文发布时间
    doc_id: varchar("doc_id", { length: 100 }), // 托管知识库的文档ID
    status: varchar("status", { length: 20 }).notNull().default("approved"), // 'pending' | 'approved' | 'rejected'
    created_by: varchar("created_by", { length: 36 }), // 入库人
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("articles_knowledge_base_id_idx").on(table.knowledge_base_id),
    index("articles_status_idx").on(table.status),
    index("articles_created_at_idx").on(table.created_at),
    index("articles_doc_id_idx").on(table.doc_id),
  ]
);

// 入库申请表（成员申请同步到官方库）
export const syncRequests = pgTable(
  "sync_requests",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    article_id: varchar("article_id", { length: 36 }).notNull().references(() => articles.id, { onDelete: "cascade" }),
    target_knowledge_base_id: varchar("target_knowledge_base_id", { length: 36 }).notNull().references(() => knowledgeBases.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
    reviewed_by: varchar("reviewed_by", { length: 36 }), // 审核人
    reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("sync_requests_article_id_idx").on(table.article_id),
    index("sync_requests_target_knowledge_base_id_idx").on(table.target_knowledge_base_id),
    index("sync_requests_status_idx").on(table.status),
  ]
);

// 用户知识库配置表
export const userKnowledgeConfigs = pgTable(
  "user_knowledge_configs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull(),
    knowledge_base_ids: jsonb("knowledge_base_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`), // 用户当前加载的知识库ID列表
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("user_knowledge_configs_user_id_idx").on(table.user_id),
  ]
);
