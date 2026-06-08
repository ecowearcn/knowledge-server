import { View, Text, ScrollView } from '@tarojs/components';
import { useReady } from '@tarojs/taro';
import { useState, useRef } from 'react';
import { Network } from '@/network';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, CircleAlert, BookOpen, Link } from 'lucide-react-taro';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'critique';
  critique?: {
    credibility: 'high' | 'medium' | 'low';
    analysis: string;
    relatedArticles: Array<{ title: string; id: string }>;
  };
}

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'chat' | 'critique'>('chat');
  const scrollViewRef = useRef<string>('scroll-view');

  useReady(() => {
    // 添加欢迎消息
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content:
          '您好！我是知识库助手。您可以：\n\n1. 向我提问，我会基于知识库回答\n2. 发送文章链接，我来帮您"锐评"可信度\n\n请问有什么可以帮您的？',
      },
    ]);
  });

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // 判断是否是 URL（锐评模式）
      const isUrl =
        input.trim().startsWith('http://') ||
        input.trim().startsWith('https://');

      if (isUrl || mode === 'critique') {
        // 锐评模式
        const res = await Network.request({
          url: '/api/agent/critique',
          method: 'POST',
          data: isUrl
            ? { url: input.trim() }
            : { content: input.trim(), title: '用户提交的文章' },
        });
        console.log('锐评结果:', res.data);

        if (res.data?.code === 0) {
          const critiqueData = res.data.data;
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            type: 'critique',
            content: '',
            critique: critiqueData,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          throw new Error(res.data?.msg || '锐评失败');
        }
      } else {
        // 普通对话模式
        const res = await Network.request({
          url: '/api/agent/chat',
          method: 'POST',
          data: { message: input.trim() },
        });
        console.log('对话结果:', res.data);

        if (res.data?.code === 0) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: res.data.data || '抱歉，我暂时无法回答这个问题。',
          };
          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          throw new Error(res.data?.msg || '对话失败');
        }
      }
    } catch (err) {
      console.error('请求失败:', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `抱歉，处理您的请求时出错了。请稍后重试。\n\n错误信息：${err instanceof Error ? err.message : '未知错误'}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderCritiqueMessage = (msg: Message) => {
    const { critique } = msg;
    if (!critique) return null;

    const credibilityText =
      critique.credibility === 'high'
        ? '可信度高'
        : critique.credibility === 'medium'
          ? '可信度中等'
          : '可信度低';

    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          {/* 可信度评估 */}
          <View className="flex flex-row items-center gap-2 mb-3">
            <CircleAlert size={20} color="#1890ff" />
            <Text className="text-base font-semibold">可信度评估</Text>
          </View>
          <View className="mb-4">
            <Badge
              variant={
                critique.credibility === 'high'
                  ? 'default'
                  : critique.credibility === 'medium'
                    ? 'secondary'
                    : 'destructive'
              }
            >
              {credibilityText}
            </Badge>
          </View>

          {/* 分析理由 */}
          <View className="mb-4">
            <Text className="text-sm font-medium mb-2 block">分析理由：</Text>
            <Text className="text-sm text-gray-700 leading-relaxed block">
              {critique.analysis}
            </Text>
          </View>

          {/* 相关文章 */}
          {critique.relatedArticles && critique.relatedArticles.length > 0 && (
            <View>
              <View className="flex flex-row items-center gap-2 mb-2">
                <BookOpen size={16} color="#666" />
                <Text className="text-sm font-medium">相关知识库文章：</Text>
              </View>
              <View className="space-y-1">
                {critique.relatedArticles.map((article, idx) => (
                  <View
                    key={idx}
                    className="flex flex-row items-center gap-1 text-blue-600"
                  >
                    <Link size={14} color="#1890ff" />
                    <Text className="text-sm">{article.title}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <View className="flex flex-col h-screen bg-gray-50">
      {/* 顶部模式切换 */}
      <View className="bg-white border-b border-gray-200 p-3">
        <View className="flex flex-row gap-2">
          <Button
            variant={mode === 'chat' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('chat')}
          >
            <Text className="text-sm">对话模式</Text>
          </Button>
          <Button
            variant={mode === 'critique' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('critique')}
          >
            <Sparkles size={16} color="#fff" />
            <Text className="text-sm">锐评模式</Text>
          </Button>
        </View>
        {mode === 'critique' && (
          <Text className="text-xs text-gray-500 mt-2 block">
            发送文章链接，我会基于知识库评估可信度
          </Text>
        )}
      </View>

      {/* 消息列表 */}
      <ScrollView
        scrollY
        className="flex-1 p-4"
        scrollIntoView={scrollViewRef.current}
      >
        <View className="space-y-4">
          {messages.map((msg) => (
            <View
              key={msg.id}
              className={
                msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'
              }
            >
              {msg.role === 'user' ? (
                <Card className="max-w-[80%] bg-blue-500 border-blue-500">
                  <CardContent className="p-3">
                    <Text className="text-white text-sm">{msg.content}</Text>
                  </CardContent>
                </Card>
              ) : msg.type === 'critique' ? (
                <View className="max-w-[95%]">{renderCritiqueMessage(msg)}</View>
              ) : (
                <Card className="max-w-[85%]">
                  <CardContent className="p-3">
                    <Text className="text-sm text-gray-800 whitespace-pre-wrap">
                      {msg.content}
                    </Text>
                  </CardContent>
                </Card>
              )}
            </View>
          ))}
          {loading && (
            <View className="flex justify-start">
              <Card className="max-w-[85%]">
                <CardContent className="p-3">
                  <Text className="text-sm text-gray-500">思考中...</Text>
                </CardContent>
              </Card>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 输入区域 */}
      <View className="bg-white border-t border-gray-200 p-3">
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '8px',
            alignItems: 'flex-end',
          }}
        >
          <View className="flex-1">
            <Input
              className="rounded-full bg-gray-100 border-gray-200"
              placeholder={
                mode === 'critique'
                  ? '粘贴文章链接进行锐评...'
                  : '输入问题或粘贴文章链接...'
              }
              value={input}
              onInput={(e) => setInput(e.detail.value)}
              onConfirm={handleSend}
            />
          </View>
          <Button
            size="icon"
            disabled={!input.trim() || loading}
            onClick={handleSend}
          >
            <Send size={18} color="#fff" />
          </Button>
        </View>
      </View>
    </View>
  );
};

export default ChatPage;
