import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();

export type UserRole = 'admin' | 'member' | 'user';

export interface User {
  id: string;
  openid: string;
  nickname: string | null;
  avatar: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string | null;
}

@Injectable()
export class UserService {
  /**
   * 根据 openid 获取或创建用户
   * 如果用户不存在，自动创建为普通用户
   */
  async getOrCreateUser(openid: string, nickname?: string, avatar?: string): Promise<User> {
    // 先查询是否存在
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('openid', openid)
      .single();

    if (existing) {
      // 如果提供了新的昵称/头像，更新
      if (nickname || avatar) {
        const { data: updated } = await supabase
          .from('users')
          .update({
            nickname: nickname || existing.nickname,
            avatar: avatar || existing.avatar,
            updated_at: new Date().toISOString(),
          })
          .eq('openid', openid)
          .select()
          .single();
        return updated as User;
      }
      return existing as User;
    }

    // 不存在，创建新用户
    const { data: created, error } = await supabase
      .from('users')
      .insert({
        openid,
        nickname: nickname || '用户',
        avatar: avatar || null,
        role: 'user',
      })
      .select()
      .single();

    if (error) {
      console.error('[UserService] 创建用户失败:', error);
      throw new Error('创建用户失败');
    }

    console.log('[UserService] 创建新用户:', { openid, role: 'user' });
    return created as User;
  }

  /**
   * 根据 ID 获取用户
   */
  async getUserById(id: string): Promise<User | null> {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    return data as User | null;
  }

  /**
   * 获取所有用户（管理员功能）
   */
  async getAllUsers(): Promise<User[]> {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    return (data || []) as User[];
  }

  /**
   * 更新用户角色（管理员功能）
   */
  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error('用户不存在或更新失败');
    }

    console.log('[UserService] 更新用户角色:', { userId, role });
    return data as User;
  }

  /**
   * 检查用户是否是管理员
   */
  async isAdmin(openid: string): Promise<boolean> {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('openid', openid)
      .single();
    return data?.role === 'admin';
  }

  /**
   * 检查用户是否是团队成员（含管理员）
   */
  async isMember(openid: string): Promise<boolean> {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('openid', openid)
      .single();
    return data?.role === 'admin' || data?.role === 'member';
  }
}
