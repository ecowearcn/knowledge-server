import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();

export interface KnowledgeBase {
  id: string;
  name: string;
  type: 'official' | 'member';
  owner_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateKnowledgeBaseDto {
  name: string;
  type: 'official' | 'member';
  owner_id?: string;
  description?: string;
}

@Injectable()
export class KnowledgeBaseService {
  // 创建知识库
  async create(dto: CreateKnowledgeBaseDto): Promise<KnowledgeBase> {
    const { data, error } = await supabase
      .from('knowledge_bases')
      .insert({
        name: dto.name,
        type: dto.type,
        owner_id: dto.owner_id || null,
        description: dto.description || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`创建知识库失败: ${error.message}`);
    }

    return data as KnowledgeBase;
  }

  // 获取所有知识库
  async findAll(): Promise<KnowledgeBase[]> {
    const { data, error } = await supabase
      .from('knowledge_bases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`获取知识库列表失败: ${error.message}`);
    }

    return data as KnowledgeBase[];
  }

  // 按类型获取知识库
  async findByType(type: 'official' | 'member'): Promise<KnowledgeBase[]> {
    const { data, error } = await supabase
      .from('knowledge_bases')
      .select('*')
      .eq('type', type)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`获取知识库列表失败: ${error.message}`);
    }

    return data as KnowledgeBase[];
  }

  // 获取单个知识库
  async findOne(id: string): Promise<KnowledgeBase | null> {
    const { data, error } = await supabase
      .from('knowledge_bases')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`获取知识库失败: ${error.message}`);
    }

    return data as KnowledgeBase | null;
  }

  // 更新知识库
  async update(
    id: string,
    dto: Partial<CreateKnowledgeBaseDto>,
  ): Promise<KnowledgeBase> {
    const { data, error } = await supabase
      .from('knowledge_bases')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`更新知识库失败: ${error.message}`);
    }

    return data as KnowledgeBase;
  }

  // 删除知识库
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('knowledge_bases')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`删除知识库失败: ${error.message}`);
    }
  }
}
