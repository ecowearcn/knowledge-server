import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '../storage/database/supabase-client';
import {
  FetchClient,
  Config as FetchConfig,
  HeaderUtils,
} from 'coze-coding-dev-sdk';
import { LLMClient, Config as LLMConfig } from 'coze-coding-dev-sdk';
import {
  KnowledgeClient,
  Config as KnowledgeConfig,
  KnowledgeDocument,
  DataSourceType,
} from 'coze-coding-dev-sdk';

const supabase = getSupabaseClient();

export interface Article {
  id: string;
  knowledge_base_id: string;
  name: string; // 数据库字段名是 name
  content: string | null;
  summary: string | null;
  key_paragraphs: string[] | null;
  tags: string[] | null;
  source_url: string | null;
  author: string | null;
  published_at: string | null;
  doc_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateArticleDto {
  knowledge_base_id: string;
  source_url: string;
  created_by?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface ArticleWithSummary extends Article {
  knowledge_bases?: {
    name: string;
    type: string;
  };
}

@Injectable()
export class ArticleService {
  private llmClient: LLMClient;
  private knowledgeClient: KnowledgeClient;

  constructor() {
    this.llmClient = new LLMClient(new LLMConfig());
    this.knowledgeClient = new KnowledgeClient(new KnowledgeConfig());
  }

  // 解析文章 URL
  private async parseArticle(
    url: string,
    headers: Record<string, string>,
  ): Promise<{
    title: string;
    content: string;
    author?: string;
    publishedAt?: string;
  }> {
    const customHeaders = HeaderUtils.extractForwardHeaders(headers);
    const fetchClient = new FetchClient(new FetchConfig(), customHeaders);
    console.log('调用 fetch-url:', url);
    const response = await fetchClient.fetch(url);
    console.log('fetch-url 响应:', JSON.stringify(response, null, 2));

    if (response.status_code !== 0) {
      throw new Error(`解析文章失败: ${response.status_message}`);
    }

    // 提取文本内容
    const textContent = response.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n');

    return {
      title: response.title || '未知标题',
      content: textContent,
      author: undefined,
      publishedAt: response.publish_time,
    };
  }

  // 生成概要、关键段落和标签
  private async generateSummary(content: string): Promise<{
    summary: string;
    keyParagraphs: string[];
    tags: string[];
  }> {
    const prompt = `请分析以下文章内容，生成：
1. 一段200-300字的文章概要
2. 3-5个关键段落（核心观点或重要信息）
3. 3-5个标签（主题分类）

请以JSON格式返回：
{
  "summary": "概要内容",
  "keyParagraphs": ["段落1", "段落2", "段落3"],
  "tags": ["标签1", "标签2", "标签3"]
}

文章内容：
${content.substring(0, 8000)}`;

    const response = await this.llmClient.invoke([
      { role: 'user', content: prompt },
    ]);

    try {
      // 尝试解析 JSON
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          summary: result.summary || '',
          keyParagraphs: result.keyParagraphs || [],
          tags: result.tags || [],
        };
      }
    } catch {
      // 解析失败，返回空结果
    }

    return {
      summary: response.content.substring(0, 500),
      keyParagraphs: [],
      tags: [],
    };
  }

  // 创建文章（从URL入库或手动内容）
  async createFromUrl(
    dto: CreateArticleDto,
    headers: Record<string, string>,
    manualContent?: string,
    manualTitle?: string,
  ): Promise<Article> {
    let parsed: { title: string; content: string; author?: string; publishedAt?: string };

    if (manualContent) {
      // 使用手动粘贴的内容
      console.log('使用手动粘贴的内容');
      parsed = {
        title: manualTitle || '手动导入文章',
        content: manualContent,
      };
    } else {
      // 从 URL 解析
      console.log('开始解析文章:', dto.source_url);
      parsed = await this.parseArticle(dto.source_url, headers);
      console.log('文章解析完成:', parsed.title);
    }

    // 2. 生成概要和标签
    const { summary, keyParagraphs, tags } = await this.generateSummary(
      parsed.content,
    );
    console.log('概要生成完成:', summary.substring(0, 100));

    // 3. 存入数据库
    const { data: article, error: dbError } = await supabase
      .from('articles')
      .insert({
        knowledge_base_id: dto.knowledge_base_id,
        name: parsed.title, // 数据库字段名是 name
        content: parsed.content,
        summary,
        key_paragraphs: keyParagraphs,
        tags,
        source_url: dto.source_url,
        author: parsed.author,
        published_at: parsed.publishedAt,
        status: dto.status || 'approved',
        created_by: dto.created_by || null,
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`存储文章失败: ${dbError.message}`);
    }

    // 4. 存入托管知识库（向量化）
    const vectorContent = `${summary}\n\n标签: ${tags.join(', ')}\n\n${keyParagraphs.join('\n\n')}`;
    const documents: KnowledgeDocument[] = [
      {
        source: DataSourceType.TEXT,
        raw_data: vectorContent,
      },
    ];

    const knowledgeResponse = await this.knowledgeClient.addDocuments(
      documents,
      'coze_doc_knowledge',
    );

    if (knowledgeResponse.code === 0 && knowledgeResponse.doc_ids?.[0]) {
      // 更新文章的 doc_id
      const { error: updateError } = await supabase
        .from('articles')
        .update({ doc_id: knowledgeResponse.doc_ids[0] })
        .eq('id', article.id);

      if (updateError) {
        console.error('更新 doc_id 失败:', updateError.message);
      }

      article.doc_id = knowledgeResponse.doc_ids[0];
    }

    console.log('文章入库完成:', article.id);
    return article as Article;
  }

  // 获取文章列表
  async findByKnowledgeBase(knowledgeBaseId: string): Promise<Article[]> {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('knowledge_base_id', knowledgeBaseId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`获取文章列表失败: ${error.message}`);
    }

    return data as Article[];
  }

  // 获取单篇文章
  async findOne(id: string): Promise<Article | null> {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`获取文章详情失败: ${error.message}`);
    }

    return data as Article;
  }

  // 获取所有文章
  async findAll(): Promise<ArticleWithSummary[]> {
    const { data, error } = await supabase
      .from('articles')
      .select('*, knowledge_bases(name, type)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`获取文章列表失败: ${error.message}`);
    }

    return data as ArticleWithSummary[];
  }

  // 搜索文章
  async search(query: string, knowledgeBaseIds?: string[]): Promise<Article[]> {
    let queryBuilder = supabase
      .from('articles')
      .select('*')
      .eq('status', 'approved');

    if (knowledgeBaseIds && knowledgeBaseIds.length > 0) {
      queryBuilder = queryBuilder.in('knowledge_base_id', knowledgeBaseIds);
    }

    // 使用 ilike 进行模糊搜索
    const { data, error } = await queryBuilder.or(
      `title.ilike.%${query}%,summary.ilike.%${query}%`,
    );

    if (error) {
      throw new Error(`搜索文章失败: ${error.message}`);
    }

    return data as Article[];
  }

  // 获取单个文章
  async findOne(id: string): Promise<Article | null> {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`获取文章失败: ${error.message}`);
    }

    return data as Article | null;
  }

  // 删除文章
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('articles').delete().eq('id', id);

    if (error) {
      throw new Error(`删除文章失败: ${error.message}`);
    }
  }
}
