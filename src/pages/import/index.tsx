import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { Network } from '@/network';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Upload, CircleCheck, CircleAlert } from 'lucide-react-taro';

interface KnowledgeBase {
  id: string;
  name: string;
  type: 'official' | 'member';
}

const ImportPage = () => {
  const [articleUrl, setArticleUrl] = useState('');
  const [selectedKbId, setSelectedKbId] = useState<string>('');
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    article?: {
      title: string;
      summary: string;
      tags: string[];
    };
  } | null>(null);

  Taro.useDidShow(() => {
    fetchKnowledgeBases();
  });

  const fetchKnowledgeBases = async () => {
    try {
      const res = await Network.request({ url: '/api/knowledge-bases' });
      if (res.data?.code === 0) {
        setKnowledgeBases(res.data.data || []);
        if (res.data.data?.length > 0) {
          // 默认选择第一个成员知识库
          const memberKb = res.data.data.find(
            (kb: KnowledgeBase) => kb.type === 'member'
          );
          setSelectedKbId(memberKb?.id || res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('获取知识库失败:', err);
    }
  };

  const handleImport = async () => {
    if (!articleUrl.trim()) {
      Taro.showToast({ title: '请输入文章链接', icon: 'none' });
      return;
    }
    if (!selectedKbId) {
      Taro.showToast({ title: '请选择知识库', icon: 'none' });
      return;
    }

    setLoading(true);
    setImportResult(null);

    try {
      const res = await Network.request({
        url: '/api/articles/import',
        method: 'POST',
        data: {
          url: articleUrl.trim(),
          knowledgeBaseId: selectedKbId,
        },
      });
      console.log('导入结果:', res.data);

      if (res.data?.code === 0) {
        setImportResult({
          success: true,
          message: '文章导入成功！',
          article: res.data.data,
        });
        setArticleUrl('');
      } else {
        throw new Error(res.data?.msg || '导入失败');
      }
    } catch (err) {
      console.error('导入失败:', err);
      setImportResult({
        success: false,
        message: err instanceof Error ? err.message : '导入失败，请重试',
      });
    } finally {
      setLoading(false);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const res = await Taro.getClipboardData();
      if (res.data) {
        setArticleUrl(res.data);
      }
    } catch (err) {
      console.error('粘贴失败:', err);
    }
  };

  return (
    <View className="min-h-screen bg-gray-50 p-4">
      {/* 标题 */}
      <View className="mb-6">
        <Text className="text-xl font-bold block mb-2">导入文章</Text>
        <Text className="text-sm text-gray-500 block">
          粘贴微信公众号文章链接，自动解析并入库
        </Text>
      </View>

      {/* 输入区域 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">文章链接</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="flex flex-row gap-2 items-end">
            <View className="flex-1">
              <Textarea
                className="bg-gray-50"
                placeholder="粘贴文章链接..."
                value={articleUrl}
                onInput={(e) => setArticleUrl(e.detail.value)}
              />
            </View>
            <Button variant="outline" size="sm" onClick={pasteFromClipboard}>
              <Text className="text-sm">粘贴</Text>
            </Button>
          </View>
        </CardContent>
      </Card>

      {/* 选择知识库 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">选择知识库</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="space-y-2">
            {knowledgeBases.map((kb) => (
              <View
                key={kb.id}
                className={`flex flex-row items-center justify-between p-3 rounded-lg border ${
                  selectedKbId === kb.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
                onClick={() => setSelectedKbId(kb.id)}
              >
                <View className="flex flex-row items-center gap-2">
                  <Text className="text-sm font-medium">{kb.name}</Text>
                  <Badge variant={kb.type === 'official' ? 'default' : 'outline'}>
                    {kb.type === 'official' ? '官方' : '成员'}
                  </Badge>
                </View>
                {selectedKbId === kb.id && (
                  <CircleCheck size={18} color="#1890ff" />
                )}
              </View>
            ))}
          </View>
        </CardContent>
      </Card>

      {/* 导入按钮 */}
      <Button
        className="w-full h-12 mb-4"
        disabled={!articleUrl.trim() || !selectedKbId || loading}
        onClick={handleImport}
      >
        <Upload size={18} color="#fff" />
        <Text className="text-white ml-2">
          {loading ? '导入中...' : '开始导入'}
        </Text>
      </Button>

      {/* 导入结果 */}
      {importResult && (
        <Card
          className={
            importResult.success
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }
        >
          <CardContent className="p-4">
            <View className="flex flex-row items-center gap-2 mb-2">
              {importResult.success ? (
                <CircleCheck size={20} color="#52c41a" />
              ) : (
                <CircleAlert size={20} color="#ff4d4f" />
              )}
              <Text
                className={`font-semibold ${importResult.success ? 'text-green-700' : 'text-red-700'}`}
              >
                {importResult.message}
              </Text>
            </View>

            {importResult.article && (
              <View className="mt-3 pt-3 border-t border-gray-200">
                <Text className="text-sm font-medium mb-1 block">
                  {importResult.article.title}
                </Text>
                {importResult.article.summary && (
                  <Text className="text-xs text-gray-600 line-clamp-3 block mb-2">
                    {importResult.article.summary}
                  </Text>
                )}
                {importResult.article.tags &&
                  importResult.article.tags.length > 0 && (
                    <View className="flex flex-row flex-wrap gap-1">
                      {importResult.article.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </View>
                  )}
              </View>
            )}
          </CardContent>
        </Card>
      )}
    </View>
  );
};

export default ImportPage;
