import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { Network } from '@/network';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, BookOpen, Plus, Library } from 'lucide-react-taro';

interface KnowledgeBase {
  id: string;
  name: string;
  type: 'official' | 'member';
  owner_id: string | null;
  description: string | null;
  created_at: string;
}

const IndexPage = () => {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);

  useDidShow(() => {
    fetchKnowledgeBases();
  });

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

  const officialBases = knowledgeBases.filter((kb) => kb.type === 'official');
  const memberBases = knowledgeBases.filter((kb) => kb.type === 'member');

  return (
    <View className="min-h-screen bg-gray-50 p-4">
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
