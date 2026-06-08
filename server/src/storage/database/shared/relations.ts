import { relations } from "drizzle-orm/relations";
import { articles, syncRequests, knowledgeBases } from "./schema";

export const syncRequestsRelations = relations(syncRequests, ({one}) => ({
	article: one(articles, {
		fields: [syncRequests.articleId],
		references: [articles.id]
	}),
	knowledgeBase: one(knowledgeBases, {
		fields: [syncRequests.targetKnowledgeBaseId],
		references: [knowledgeBases.id]
	}),
}));

export const articlesRelations = relations(articles, ({one, many}) => ({
	syncRequests: many(syncRequests),
	knowledgeBase: one(knowledgeBases, {
		fields: [articles.knowledgeBaseId],
		references: [knowledgeBases.id]
	}),
}));

export const knowledgeBasesRelations = relations(knowledgeBases, ({many}) => ({
	syncRequests: many(syncRequests),
	articles: many(articles),
}));