import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { Network } from '@/network';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, User, Tag, BookOpen } from 'lucide-react-taro';

interface Article {
  id: string;
  knowledge_base_id: string;
  name: string;
  content: string;
  summary: string;
  key_paragraphs: string[];
  tags: string[];
  source_url: string;
  author: string | null;
  published_at: string | null;
  doc_id: string;
  status: string;
  created_at: string;
}

const ArticleDetailPage = () => {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useDidShow(() => {
    const params = Taro.getCurrentInstance().router?.params;
    const id = params?.id;
    if (id) {
      fetchArticle(id);
    }
  });

  const fetchArticle = async (id: string) => {
    setLoading(true);
    try {
      const res = await Network.request({
        url: `/api/articles/${id}`,
        method: 'GET',
      });
      console.log('文章详情响应:', res.data);
      if (res.data?.code === 0 && res.data?.data) {
        setArticle(res.data.data);
      }
    } catch (error) {
      console.error('获取文章详情失败:', error);
      Taro.showToast({ title: '获取文章失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '未知';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View className="min-h-screen bg-gray-50 p-4">
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/2 mb-6" />
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </View>
    );
  }

  if (!article) {
    return (
      <View className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Text className="text-gray-500">文章不存在</Text>
      </View>
    );
  }

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 文章头部 */}
      <View className="bg-white p-4">
        <Text className="block text-xl font-bold text-gray-900 mb-3">{article.name}</Text>
        
        {/* 标签 */}
        {article.tags && article.tags.length > 0 && (
          <View className="flex flex-row flex-wrap gap-2 mb-4">
            {article.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </View>
        )}

        {/* 元信息 */}
        <View className="flex flex-row items-center gap-4 text-sm text-gray-500">
          <View className="flex flex-row items-center gap-1">
            <Calendar size={14} color="#6b7280" />
            <Text className="text-gray-500">{formatDate(article.created_at)}</Text>
          </View>
          {article.author && (
            <View className="flex flex-row items-center gap-1">
              <User size={14} color="#6b7280" />
              <Text className="text-gray-500">{article.author}</Text>
            </View>
          )}
        </View>
      </View>

      {/* 概要 */}
      <Card className="mx-4 mt-4">
        <CardHeader className="pb-2">
          <View className="flex flex-row items-center gap-2">
            <BookOpen size={18} color="#1890ff" />
            <CardTitle className="text-base">内容概要</CardTitle>
          </View>
        </CardHeader>
        <CardContent>
          <Text className="block text-sm text-gray-700 leading-relaxed">{article.summary}</Text>
        </CardContent>
      </Card>

      {/* 关键段落 */}
      {article.key_paragraphs && article.key_paragraphs.length > 0 && (
        <Card className="mx-4 mt-4">
          <CardHeader className="pb-2">
            <View className="flex flex-row items-center gap-2">
              <Tag size={18} color="#52c41a" />
              <CardTitle className="text-base">关键段落</CardTitle>
            </View>
          </CardHeader>
          <CardContent>
            {article.key_paragraphs.map((para, index) => (
              <View key={index} className="mb-3 last:mb-0">
                <View className="flex flex-row gap-2">
                  <View className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Text className="text-xs text-blue-600 font-medium">{index + 1}</Text>
                  </View>
                  <Text className="block text-sm text-gray-700 leading-relaxed flex-1">{para}</Text>
                </View>
              </View>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 全文内容 */}
      <Card className="mx-4 mt-4 mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">全文内容</CardTitle>
        </CardHeader>
        <CardContent>
          <Text className="block text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{article.content}</Text>
        </CardContent>
      </Card>

      {/* 原文链接 */}
      {article.source_url && (
        <View className="mx-4 mb-6">
          <View
            className="bg-blue-50 p-3 rounded-lg"
            onClick={() => {
              Taro.setClipboardData({
                data: article.source_url,
                success: () => {
                  Taro.showToast({ title: '链接已复制', icon: 'success' });
                },
              });
            }}
          >
            <Text className="block text-sm text-blue-600">点击复制原文链接</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default ArticleDetailPage;
