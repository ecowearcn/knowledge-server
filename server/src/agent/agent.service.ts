import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { FetchClient, Config as FetchConfig } from 'coze-coding-dev-sdk';
import { LLMClient, Config as LLMConfig } from 'coze-coding-dev-sdk';
import {
  KnowledgeClient,
  Config as KnowledgeConfig,
} from 'coze-coding-dev-sdk';

const supabase = getSupabaseClient();

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  message: string;
  knowledge_base_ids?: string[];
  history?: ChatMessage[];
}

export interface CritiqueRequest {
  url: string;
  knowledge_base_ids?: string[];
}

export interface CritiqueResult {
  credibility: 'high' | 'medium' | 'low';
  analysis: string;
  relatedArticles: Array<{
    title: string;
    summary: string;
    knowledge_base_name: string;
  }>;
}

@Injectable()
export class AgentService {
  private fetchClient: FetchClient;
  private llmClient: LLMClient;
  private knowledgeClient: KnowledgeClient;

  constructor() {
    this.fetchClient = new FetchClient(new FetchConfig());
    this.llmClient = new LLMClient(new LLMConfig());
    this.knowledgeClient = new KnowledgeClient(new KnowledgeConfig());
  }

  // 从知识库检索相关内容
  private async searchKnowledge(
    query: string,
    knowledgeBaseIds?: string[],
  ): Promise<string> {
    const searchResponse = await this.knowledgeClient.search(query, undefined, 5, 0.5);

    if (searchResponse.code !== 0 || !searchResponse.chunks?.length) {
      return '';
    }

    // 如果指定了知识库，需要过滤
    let chunks = searchResponse.chunks;
    if (knowledgeBaseIds && knowledgeBaseIds.length > 0) {
      // 获取 doc_id 对应的文章信息
      const docIds = chunks.map((c) => c.doc_id).filter(Boolean);
      if (docIds.length > 0) {
        const { data: articles } = await supabase
          .from('articles')
          .select('doc_id, knowledge_base_id')
          .in('doc_id', docIds);

        const validDocIds = new Set(
          (articles || [])
            .filter((a) => knowledgeBaseIds.includes(a.knowledge_base_id))
            .map((a) => a.doc_id),
        );

        chunks = chunks.filter((c) => validDocIds.has(c.doc_id));
      }
    }

    return chunks
      .map((chunk, i) => `[${i + 1}] ${chunk.content}`)
      .join('\n\n');
  }

  // Agent 对话
  async chat(request: ChatRequest): Promise<string> {
    const { message, knowledge_base_ids, history = [] } = request;

    // 从知识库检索相关内容
    const knowledgeContent = await this.searchKnowledge(
      message,
      knowledge_base_ids,
    );

    // 构建系统提示
    const systemPrompt = `你是一个专业的健康科普助手，专注于女性健康和环境激素领域。
你的职责是基于知识库中的内容回答用户问题，提供准确、科学的健康知识。

${knowledgeContent ? `相关知识库内容：\n${knowledgeContent}\n\n请基于以上内容回答用户问题。如果知识库中没有相关信息，请诚实告知。` : '当前没有可用的知识库内容，请根据你的专业知识回答，但要说明这不是来自知识库。'}`;

    // 构建消息
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ];

    const response = await this.llmClient.invoke(messages, {
      temperature: 0.7,
    });

    return response.content;
  }

  // 锐评文章
  async critique(request: CritiqueRequest): Promise<CritiqueResult> {
    const { url, knowledge_base_ids } = request;

    // 1. 解析待评文章
    const fetchResponse = await this.fetchClient.fetch(url);
    if (fetchResponse.status_code !== 0) {
      throw new Error(`解析文章失败: ${fetchResponse.status_message}`);
    }

    const articleTitle = fetchResponse.title || '未知标题';
    const articleContent = fetchResponse.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n');

    // 2. 从知识库检索相关内容
    const searchQuery = `${articleTitle}\n\n${articleContent.substring(0, 2000)}`;
    const knowledgeContent = await this.searchKnowledge(
      searchQuery,
      knowledge_base_ids,
    );

    // 3. 让 LLM 进行锐评
    const critiquePrompt = `你是一个专业的健康科普内容审核专家。请对以下文章进行可信度评估。

待评文章标题：${articleTitle}
待评文章内容：
${articleContent.substring(0, 6000)}

${knowledgeContent ? `相关知识库内容（作为参考标准）：
${knowledgeContent}` : '当前没有可用的知识库参考。'}

请评估这篇文章的可信度，并给出分析。以JSON格式返回：
{
  "credibility": "high/medium/low",
  "analysis": "详细分析，包括：1. 主要观点总结 2. 与知识库对比结果 3. 潜在问题或疑点 4. 建议"
}`;

    const response = await this.llmClient.invoke([
      { role: 'user', content: critiquePrompt },
    ]);

    let credibility: 'high' | 'medium' | 'low' = 'medium';
    let analysis = response.content;

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        credibility = parsed.credibility || 'medium';
        analysis = parsed.analysis || response.content;
      }
    } catch {
      // 解析失败，使用原始响应
    }

    // 4. 获取相关文章推荐
    const relatedArticles: CritiqueResult['relatedArticles'] = [];

    if (knowledgeContent) {
      // 通过 doc_id 查询相关文章
      const searchResponse = await this.knowledgeClient.search(
        articleTitle,
        undefined,
        3,
      );

      if (searchResponse.code === 0 && searchResponse.chunks?.length) {
        const docIds = searchResponse.chunks.map((c) => c.doc_id).filter(Boolean);
        if (docIds.length > 0) {
          const { data: articles } = await supabase
            .from('articles')
            .select('title, summary, doc_id, knowledge_bases(name)')
            .in('doc_id', docIds);

          if (articles) {
            for (const article of articles) {
              relatedArticles.push({
                title: article.title,
                summary: article.summary || '',
                knowledge_base_name: (article.knowledge_bases as any)?.name || '',
              });
            }
          }
        }
      }
    }

    return {
      credibility,
      analysis,
      relatedArticles,
    };
  }
}
