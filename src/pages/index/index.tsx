import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { Network } from '@/network';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, BookOpen, Plus, Library, Settings } from 'lucide-react-taro';

interface KnowledgeBase {
  id: string;
  name: string;
  type: 'official' | 'member';
  owner_id: string | null;
  description: string | null;
  created_at: string;
}

interface User {
  id: string;
  openid: string;
  nickname: string | null;
  avatar: string | null;
  role: 'admin' | 'member' | 'user';
}

// 全局用户状态（简单实现，后续可升级为 context）
let globalUser: User | null = null;

export const getCurrentUser = () => globalUser;

const IndexPage = () => {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  useDidShow(() => {
    fetchUser();
    fetchKnowledgeBases();
  });

  // 获取用户身份
  const fetchUser = async () => {
    setUserLoading(true);
    try {
      // 尝试获取存储的 openid
      let openid = Taro.getStorageSync('user_openid');
      
      // 如果没有，生成一个临时 openid（基于设备）
      if (!openid) {
        // 在小程序环境，使用设备信息生成唯一标识
        await Taro.getSystemInfo();
        openid = `device_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        Taro.setStorageSync('user_openid', openid);
      }

      // 调用后端获取/创建用户
      const res = await Network.request({
        url: '/api/user/info',
        data: { openid }
      });
      console.log('用户信息:', res.data);
      
      if (res.data?.code === 0) {
        const userData = res.data.data;
        globalUser = userData;
        setUser(userData);
      }
    } catch (err) {
      console.error('获取用户失败:', err);
    } finally {
      setUserLoading(false);
    }
  };

  const fetchKnowledgeBases = async () => {
    setLoading(true);
    try {
      const res = await Network.request({ url: '/api/knowledge-bases' });
      console.log('知识库列表:', res.data);
      if (res.data?.code === 0) {
        setKnowledgeBases(res.data.data || []);
      }
    } catch (err) {
      console.error('获取知识库失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const goToChat = () => {
    Taro.navigateTo({ url: '/pages/chat/index' });
  };

  const goToKnowledgeBase = (id: string) => {
    Taro.navigateTo({ url: `/pages/knowledge-base/index?id=${id}` });
  };

  const goToImport = () => {
    Taro.navigateTo({ url: '/pages/import/index' });
  };

  const goToAdmin = () => {
    Taro.navigateTo({ url: '/pages/admin/index' });
  };

  const isAdmin = user?.role === 'admin';
  const isMember = user?.role === 'admin' || user?.role === 'member';

  const officialBases = knowledgeBases.filter((kb) => kb.type === 'official');
  const memberBases = knowledgeBases.filter((kb) => kb.type === 'member');

  return (
    <View className="min-h-screen bg-gray-50 p-4">
      {/* 用户状态栏 */}
      <View className="mb-4">
        {userLoading ? (
          <Skeleton className="h-8 rounded-lg" />
        ) : (
          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-2">
              <Text className="text-sm text-gray-600">
                {user?.nickname || '游客'}
              </Text>
              {isAdmin && <Badge variant="default">管理员</Badge>}
              {isMember && !isAdmin && <Badge variant="secondary">成员</Badge>}
            </View>
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={goToAdmin}>
                <Settings size={16} color="#666" />
              </Button>
            )}
          </View>
        )}
      </View>

      {/* 快捷入口 */}
      <View className="mb-6">
        <View className="flex flex-row gap-3 mb-4">
          <View className="flex-1">
            <Button
              className="w-full h-20 flex flex-col items-center justify-center gap-1"
              onClick={goToChat}
            >
              <MessageCircle size={24} color="#fff" />
              <Text className="text-white text-sm">AI 对话</Text>
            </Button>
          </View>
          <View className="flex-1">
            <Button
              variant="outline"
              className="w-full h-20 flex flex-col items-center justify-center gap-1"
              onClick={goToImport}
            >
              <Plus size={24} color="#666" />
              <Text className="text-sm">导入文章</Text>
            </Button>
          </View>
        </View>
      </View>

      {/* 官方知识库 */}
      <View className="mb-6">
        <View className="flex flex-row items-center gap-2 mb-3">
          <Library size={20} color="#1890ff" />
          <Text className="text-lg font-semibold">官方知识库</Text>
          <Badge variant="secondary">{officialBases.length}</Badge>
        </View>

        {loading ? (
          <View className="space-y-2">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </View>
        ) : officialBases.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center">
              <Text className="text-gray-500">暂无官方知识库</Text>
            </CardContent>
          </Card>
        ) : (
          <View className="space-y-2">
            {officialBases.map((kb) => (
              <Card key={kb.id} onClick={() => goToKnowledgeBase(kb.id)}>
                <CardHeader className="pb-2">
                  <View className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{kb.name}</CardTitle>
                    <Badge>官方</Badge>
                  </View>
                </CardHeader>
                {kb.description && (
                  <CardContent className="pt-0 pb-3">
                    <Text className="text-sm text-gray-500 line-clamp-2">
                      {kb.description}
                    </Text>
                  </CardContent>
                )}
              </Card>
            ))}
          </View>
        )}
      </View>

      {/* 成员知识库 */}
      <View className="mb-6">
        <View className="flex flex-row items-center gap-2 mb-3">
          <BookOpen size={20} color="#52c41a" />
          <Text className="text-lg font-semibold">团队成员知识库</Text>
          <Badge variant="secondary">{memberBases.length}</Badge>
        </View>

        {loading ? (
          <View className="space-y-2">
            <Skeleton className="h-20 rounded-lg" />
          </View>
        ) : memberBases.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center">
              <Text className="text-gray-500">暂无成员知识库</Text>
            </CardContent>
          </Card>
        ) : (
          <View className="space-y-2">
            {memberBases.map((kb) => (
              <Card key={kb.id} onClick={() => goToKnowledgeBase(kb.id)}>
                <CardHeader className="pb-2">
                  <View className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{kb.name}</CardTitle>
                    <Badge variant="outline">成员</Badge>
                  </View>
                </CardHeader>
                {kb.description && (
                  <CardContent className="pt-0 pb-3">
                    <Text className="text-sm text-gray-500 line-clamp-2">
                      {kb.description}
                    </Text>
                  </CardContent>
                )}
              </Card>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

export default IndexPage;
