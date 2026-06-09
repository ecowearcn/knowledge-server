import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { Network } from '@/network';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Upload, CircleCheck, CircleAlert, Link, FileText } from 'lucide-react-taro';

interface KnowledgeBase {
  id: string;
  name: string;
  type: 'official' | 'member';
}

const ImportPage = () => {
  const [importType, setImportType] = useState<'url' | 'manual'>('url');
  const [articleUrl, setArticleUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
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
    if (importType === 'url' && !articleUrl.trim()) {
      Taro.showToast({ title: '请输入文章链接', icon: 'none' });
      return;
    }
    
    // 检测公众号链接
    if (importType === 'url' && articleUrl.includes('mp.weixin.qq.com')) {
      Taro.showModal({
        title: '提示',
        content: '微信公众号禁止直接抓取，请切换到「手动粘贴」模式：\n1. 复制公众号文章正文\n2. 点击「手动粘贴」\n3. 粘贴内容并导入',
        confirmText: '切换模式',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            setImportType('manual');
          }
        }
      });
      return;
    }
    
    if (importType === 'manual' && !manualContent.trim()) {
      Taro.showToast({ title: '请输入文章内容', icon: 'none' });
      return;
    }
    if (!selectedKbId) {
      Taro.showToast({ title: '请选择知识库', icon: 'none' });
      return;
    }

    setLoading(true);
    setImportResult(null);

    try {
      const data: Record<string, string> = {
        knowledgeBaseId: selectedKbId,
      };

      if (importType === 'url') {
        data.url = articleUrl.trim();
      } else {
        data.content = manualContent.trim();
        if (manualTitle.trim()) {
          data.title = manualTitle.trim();
        }
      }

      const res = await Network.request({
        url: '/api/articles/import',
        method: 'POST',
        data,
      });
      console.log('导入结果:', res.data);

      if (res.data?.code === 0) {
        setImportResult({
          success: true,
          message: '文章导入成功！',
          article: res.data.data,
        });
        setArticleUrl('');
        setManualTitle('');
        setManualContent('');
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
      const { data } = await Taro.getClipboardData();
      if (data) {
        if (importType === 'url') {
          setArticleUrl(data);
        } else {
          setManualContent(data);
        }
        Taro.showToast({ title: '已粘贴', icon: 'success' });
      }
    } catch (err) {
      console.error('粘贴失败:', err);
    }
  };

  return (
    <View className="min-h-screen bg-gray-50 p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>导入文章到知识库</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 导入方式选择 */}
          <View className="mb-4">
            <View className="flex gap-2">
              <Button
                variant={importType === 'url' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setImportType('url')}
              >
                <Link size={16} color={importType === 'url' ? '#fff' : '#666'} />
                <Text className="ml-1">链接导入</Text>
              </Button>
              <Button
                variant={importType === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setImportType('manual')}
              >
                <FileText size={16} color={importType === 'manual' ? '#fff' : '#666'} />
                <Text className="ml-1">手动粘贴</Text>
              </Button>
            </View>
          </View>

          {/* URL 导入 */}
          {importType === 'url' && (
            <View className="mb-4">
              <Text className="block text-sm text-gray-500 mb-2">文章链接</Text>
              <View className="flex gap-2">
                <View className="flex-1 bg-gray-100 rounded-lg px-3 py-2">
                  <Input
                    style={{ width: '100%' }}
                    placeholder="粘贴公众号文章链接"
                    value={articleUrl}
                    onInput={(e) => setArticleUrl(e.detail.value)}
                  />
                </View>
                <Button size="sm" variant="outline" onClick={pasteFromClipboard}>
                  粘贴
                </Button>
              </View>
              <Text className="block text-xs text-gray-400 mt-1">
                提示：公众号文章因平台限制，可能需要使用「手动粘贴」方式
              </Text>
            </View>
          )}

          {/* 手动粘贴 */}
          {importType === 'manual' && (
            <View className="mb-4">
              <Text className="block text-sm text-gray-500 mb-2">文章标题（可选）</Text>
              <View className="bg-gray-100 rounded-lg px-3 py-2 mb-3">
                <Input
                  style={{ width: '100%' }}
                  placeholder="输入文章标题"
                  value={manualTitle}
                  onInput={(e) => setManualTitle(e.detail.value)}
                />
              </View>
              <Text className="block text-sm text-gray-500 mb-2">文章内容</Text>
              <View className="bg-gray-100 rounded-lg p-3">
                <Textarea
                  style={{ width: '100%', minHeight: '200px', backgroundColor: 'transparent' }}
                  placeholder="粘贴文章正文内容..."
                  value={manualContent}
                  onInput={(e) => setManualContent(e.detail.value)}
                />
              </View>
              <View className="mt-2">
                <Button size="sm" variant="outline" onClick={pasteFromClipboard}>
                  从剪贴板粘贴
                </Button>
              </View>
            </View>
          )}

          {/* 知识库选择 */}
          <View className="mb-4">
            <Text className="block text-sm text-gray-500 mb-2">选择知识库</Text>
            <View className="flex flex-wrap gap-2">
              {knowledgeBases.map((kb) => (
                <Badge
                  key={kb.id}
                  variant={selectedKbId === kb.id ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedKbId(kb.id)}
                >
                  {kb.name}
                  {kb.type === 'official' && ' (官方)'}
                </Badge>
              ))}
            </View>
          </View>

          {/* 导入按钮 */}
          <Button
            className="w-full"
            onClick={handleImport}
            disabled={loading}
          >
            <Upload size={18} color="#fff" />
            <Text className="ml-2">{loading ? '导入中...' : '开始导入'}</Text>
          </Button>
        </CardContent>
      </Card>

      {/* 导入结果 */}
      {importResult && (
        <Card>
          <CardContent className="p-4">
            <View className="flex items-center gap-2 mb-3">
              {importResult.success ? (
                <CircleCheck size={20} color="#22c55e" />
              ) : (
                <CircleAlert size={20} color="#ef4444" />
              )}
              <Text
                className={`text-lg font-medium ${importResult.success ? 'text-green-600' : 'text-red-600'}`}
              >
                {importResult.message}
              </Text>
            </View>

            {importResult.article && (
              <View className="bg-gray-50 rounded-lg p-3">
                <Text className="block font-medium text-gray-800 mb-2">
                  {importResult.article.title}
                </Text>
                <Text className="block text-sm text-gray-600 mb-3">
                  {importResult.article.summary}
                </Text>
                <View className="flex flex-wrap gap-1">
                  {importResult.article.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </View>
              </View>
            )}
          </CardContent>
        </Card>
      )}
    </View>
  );
};

export default ImportPage;
