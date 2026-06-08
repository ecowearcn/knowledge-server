import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { Network } from '@/network';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Calendar, Tag, ExternalLink } from 'lucide-react-taro';

interface Article {
  id: string;
  title: string;
  summary: string | null;
  tags: string[] | null;
  source_url: string | null;
  published_at: string | null;
  created_at: string;
}

const KnowledgeBasePage = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [knowledgeBaseId, setKnowledgeBaseId] = useState<string>('');
  const [knowledgeBaseName, setKnowledgeBaseName] = useState<string>('');

  useDidShow(() => {
    const pages = Taro.getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const id = currentPage.options?.id;
    if (id) {
      setKnowledgeBaseId(id);
      fetchArticles(id);
    }
  });

  const fetchArticles = async (kbId: string) => {
    setLoading(true);
    try {
      // 获取知识库信息
      const kbRes = await Network.request({
        url: `/api/knowledge-bases/${kbId}`,
      });
      if (kbRes.data?.code === 0 && kbRes.data.data) {
        setKnowledgeBaseName(kbRes.data.data.name);
      }

      // 获取文章列表
      const res = await Network.request({
        url: `/api/articles/knowledge-base/${kbId}`,
      });
      console.log('文章列表:', res.data);
      if (res.data?.code === 0) {
        setArticles(res.data.data || []);
      }
    } catch (err) {
      console.error('获取文章失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !knowledgeBaseId) return;
    setLoading(true);
    try {
      const res = await Network.request({
        url: '/api/articles/search',
        method: 'POST',
        data: {
          query: searchQuery.trim(),
          knowledgeBaseId,
        },
      });
      console.log('搜索结果:', res.data);
      if (res.data?.code === 0) {
        setArticles(res.data.data || []);
      }
    } catch (err) {
      console.error('搜索失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const openArticle = (url: string) => {
    if (url) {
      Taro.setClipboardData({ data: url });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <View className="flex flex-col min-h-screen bg-gray-50">
      {/* 搜索栏 */}
      <View className="bg-white p-4 border-b border-gray-200">
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <View className="flex-1">
            <Input
              className="bg-gray-50"
              placeholder="搜索文章..."
              value={searchQuery}
              onInput={(e) => setSearchQuery(e.detail.value)}
              onConfirm={handleSearch}
            />
          </View>
          <Button size="sm" onClick={handleSearch}>
            <Text className="text-sm">搜索</Text>
          </Button>
        </View>
      </View>

      {/* 文章列表 */}
      <View className="flex-1 p-4">
        <View className="flex flex-row items-center justify-between mb-4">
          <Text className="text-lg font-semibold">{knowledgeBaseName}</Text>
          <Badge variant="secondary">{articles.length} 篇文章</Badge>
        </View>

        {loading ? (
          <View className="space-y-3">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </View>
        ) : articles.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Text className="text-gray-500">暂无文章</Text>
            </CardContent>
          </Card>
        ) : (
          <View className="space-y-3">
            {articles.map((article) => (
              <Card key={article.id}>
                <CardHeader className="pb-2">
                  <View className="flex flex-row items-start justify-between">
                    <CardTitle className="text-base flex-1 line-clamp-2">
                      {article.title}
                    </CardTitle>
                    {article.source_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openArticle(article.source_url!)}
                      >
                        <ExternalLink size={16} color="#666" />
                      </Button>
                    )}
                  </View>
                </CardHeader>
                <CardContent className="pt-0">
                  {article.summary && (
                    <Text className="text-sm text-gray-600 line-clamp-3 mb-3 block">
                      {article.summary}
                    </Text>
                  )}

                  {/* 标签 */}
                  {article.tags && article.tags.length > 0 && (
                    <View className="flex flex-row flex-wrap gap-1 mb-3">
                      {article.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          <Tag size={10} color="#666" />
                          <Text className="text-xs">{tag}</Text>
                        </Badge>
                      ))}
                    </View>
                  )}

                  {/* 日期 */}
                  <View className="flex flex-row items-center gap-1 text-gray-400">
                    <Calendar size={12} color="#999" />
                    <Text className="text-xs">
                      {article.published_at
                        ? formatDate(article.published_at)
                        : formatDate(article.created_at)}
                    </Text>
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

export default KnowledgeBasePage;
