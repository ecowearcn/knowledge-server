import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { Network } from '@/network';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Shield, ArrowLeft } from 'lucide-react-taro';

interface User {
  id: string;
  openid: string;
  nickname: string | null;
  avatar: string | null;
  role: 'admin' | 'member' | 'user';
  created_at: string;
}

const AdminPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useDidShow(() => {
    fetchUsers();
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const openid = Taro.getStorageSync('user_openid');
      const res = await Network.request({
        url: '/api/user/list',
        data: { adminOpenid: openid }
      });
      console.log('用户列表:', res.data);
      
      if (res.data?.code === 0) {
        setUsers(res.data.data || []);
      } else if (res.data?.code === 403) {
        Taro.showToast({ title: '无权限', icon: 'error' });
        setTimeout(() => {
          Taro.navigateBack();
        }, 1500);
      }
    } catch (err) {
      console.error('获取用户列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userId: string, newRole: 'admin' | 'member' | 'user') => {
    try {
      const openid = Taro.getStorageSync('user_openid');
      const res = await Network.request({
        url: '/api/user/role',
        method: 'POST',
        data: { adminOpenid: openid, userId, role: newRole }
      });
      
      if (res.data?.code === 0) {
        Taro.showToast({ title: '更新成功', icon: 'success' });
        fetchUsers();
      } else {
        Taro.showToast({ title: res.data?.msg || '更新失败', icon: 'error' });
      }
    } catch (err) {
      console.error('更新角色失败:', err);
      Taro.showToast({ title: '更新失败', icon: 'error' });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default">管理员</Badge>;
      case 'member':
        return <Badge variant="secondary">成员</Badge>;
      default:
        return <Badge variant="outline">用户</Badge>;
    }
  };

  const goBack = () => {
    Taro.navigateBack();
  };

  return (
    <View className="min-h-screen bg-gray-50 p-4">
      {/* 标题栏 */}
      <View className="flex flex-row items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft size={20} color="#666" />
        </Button>
        <View className="flex flex-row items-center gap-2">
          <Shield size={24} color="#1890ff" />
          <Text className="text-xl font-bold">管理后台</Text>
        </View>
      </View>

      {/* 用户管理 */}
      <View className="mb-6">
        <View className="flex flex-row items-center gap-2 mb-3">
          <Users size={20} color="#1890ff" />
          <Text className="text-lg font-semibold">用户管理</Text>
          <Badge variant="secondary">{users.length}</Badge>
        </View>

        {loading ? (
          <View className="space-y-2">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </View>
        ) : (
          <View className="space-y-2">
            {users.map((u) => (
              <Card key={u.id}>
                <CardHeader className="pb-2">
                  <View className="flex flex-row items-center justify-between">
                    <View className="flex flex-row items-center gap-2">
                      <Text className="text-base font-medium">
                        {u.nickname || '未命名'}
                      </Text>
                      {getRoleBadge(u.role)}
                    </View>
                  </View>
                </CardHeader>
                <CardContent className="pt-0">
                  <Text className="text-xs text-gray-400 mb-3 block">
                    ID: {u.openid.slice(0, 20)}...
                  </Text>
                  
                  {/* 角色操作按钮 */}
                  <View className="flex flex-row gap-2">
                    <Button
                      variant={u.role === 'admin' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => u.role !== 'admin' && updateRole(u.id, 'admin')}
                    >
                      <Text className="text-xs">管理员</Text>
                    </Button>
                    <Button
                      variant={u.role === 'member' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => u.role !== 'member' && updateRole(u.id, 'member')}
                    >
                      <Text className="text-xs">成员</Text>
                    </Button>
                    <Button
                      variant={u.role === 'user' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => u.role !== 'user' && updateRole(u.id, 'user')}
                    >
                      <Text className="text-xs">普通用户</Text>
                    </Button>
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

export default AdminPage;
