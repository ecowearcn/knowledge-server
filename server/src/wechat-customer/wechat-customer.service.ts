import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { createHash, createDecipheriv } from 'crypto';
import * as xml2js from 'xml2js';
import { ArticleService } from '../article/article.service';
import { AgentService } from '../agent/agent.service';

interface WechatConfig {
  corpId: string;
  secret: string;
  token: string;
  encodingAESKey: string;
}

interface CustomerMessage {
  FromUserName: string;  // 用户 ID
  ToUserName: string;    // 客服 ID
  CreateTime: number;
  MsgType: string;
  Content?: string;      // 文本内容
  MsgId?: string;
  PicUrl?: string;       // 图片 URL
  MediaId?: string;
}

@Injectable()
export class WechatCustomerService implements OnModuleInit {
  private config: WechatConfig;
  private parser: xml2js.Parser;
  private builder: xml2js.Builder;

  constructor(
    @Inject(forwardRef(() => ArticleService)) private articleService: ArticleService,
    @Inject(forwardRef(() => AgentService)) private agentService: AgentService,
  ) {}

  onModuleInit() {
    // 从环境变量读取配置
    this.config = {
      corpId: process.env.WECHAT_CORP_ID || '',
      secret: process.env.WECHAT_CUSTOMER_SECRET || '',
      token: process.env.WECHAT_TOKEN || 'mytoken123',
      encodingAESKey: process.env.WECHAT_ENCODING_AES_KEY || '',
    };
    
    this.parser = new xml2js.Parser({ explicitArray: false });
    this.builder = new xml2js.Builder();
    
    console.log('[企业微信客服] 初始化完成:', {
      corpId: this.config.corpId ? '已配置' : '未配置',
      secret: this.config.secret ? '已配置' : '未配置',
      token: this.config.token,
    });
  }

  /**
   * 验证回调 URL
   * 
   * 企业微信客服回调签名算法（msg_signature）：
   * 将 token、timestamp、nonce、echostr 四个参数排序拼接，进行 SHA1 加密
   */
  async verifyCallback(
    msgSignature: string,
    timestamp: string,
    nonce: string,
    echostr: string,
  ): Promise<string> {
    console.log('[企业微信客服] 开始验证签名...');
    
    // 企业微信客服回调签名算法：包含 echostr
    const signature = this.generateSignatureWithEchostr(
      this.config.token, 
      timestamp, 
      nonce, 
      echostr
    );
    
    console.log('[企业微信客服] 签名对比:', {
      computed: signature,
      received: msgSignature,
      match: signature === msgSignature,
    });
    
    if (signature !== msgSignature) {
      throw new Error('签名验证失败');
    }

    // 解密 echostr
    if (this.config.encodingAESKey) {
      console.log('[企业微信客服] 开始解密 echostr...');
      return this.decrypt(echostr);
    }
    return echostr;
  }

  /**
   * 处理收到的消息
   */
  async handleMessage(
    msgSignature: string,
    timestamp: string,
    nonce: string,
    xmlBody: any,
  ): Promise<string> {
    // 解析 XML
    const xmlStr = typeof xmlBody === 'string' ? xmlBody : JSON.stringify(xmlBody);
    const parsed = await this.parser.parseStringPromise(xmlStr);
    const message: CustomerMessage = parsed.xml;

    console.log('[企业微信客服] 解析后的消息:', message);

    // 根据消息类型处理
    const { MsgType, Content, FromUserName } = message;

    let reply = '';

    if (MsgType === 'text' && Content) {
      // 判断用户发送的内容类型
      if (this.isWechatArticleUrl(Content)) {
        // 公众号文章链接 → 入库
        reply = await this.handleArticleImport(Content, FromUserName);
      } else if (Content.includes('锐评') || Content.includes('点评')) {
        // 锐评模式
        reply = await this.handleCritique(Content, FromUserName);
      } else if (Content.length > 200) {
        // 长文本 → 可能是文章内容，尝试入库
        reply = await this.handleArticleImport(Content, FromUserName);
      } else {
        // 普通对话
        reply = await this.handleChat(Content, FromUserName);
      }
    } else {
      reply = '收到消息，暂不支持此类型内容的处理。';
    }

    // 发送回复
    await this.sendReply(FromUserName, reply);
    
    return reply;
  }

  /**
   * 判断是否是公众号文章链接
   */
  private isWechatArticleUrl(content: string): boolean {
    return content.includes('mp.weixin.qq.com');
  }

  /**
   * 处理文章入库
   */
  private async handleArticleImport(content: string, userId: string): Promise<string> {
    console.log('[企业微信客服] 文章入库:', { content: content.slice(0, 100), userId });
    
    // 判断是 URL 还是内容
    if (this.isWechatArticleUrl(content)) {
      // 是公众号链接，提示用户复制内容
      return `收到文章链接！由于微信公众号的限制，请复制文章内容发送给我。

操作方式：
1. 打开文章 → 长按正文 → 全选 → 复制
2. 把复制的内容发给我
3. 我会自动解析并入库`;
    }
    
    // 是文章内容，尝试解析并入库
    try {
      // 获取默认知识库（环境激素知识库）
      const knowledgeBaseId = '3f7cdcfa-5799-4904-982a-adb02e25671c';
      
      // 调用 articleService 入库（使用手动内容模式）
      const result = await this.articleService.createFromUrl(
        { source_url: '', knowledge_base_id: knowledgeBaseId }, // URL 为空，使用手动内容
        { 'x-request-id': `wechat-${userId}-${Date.now()}` },
        content, // manualContent
        '用户分享文章', // manualTitle
      );
      
      return `✅ 文章已入库！

【标题】${result.name}
【概要】${result.summary?.slice(0, 100)}...
【标签】${result.tags?.join('、') || '无'}

已存入知识库，可以用"锐评 + 文章内容"来评估可信度。`;
    } catch (error) {
      console.error('[企业微信客服] 入库失败:', error);
      return `入库失败：${error.message}

请检查文章内容是否完整，或者联系管理员处理。`;
    }
  }

  /**
   * 处理锐评
   */
  private async handleCritique(content: string, userId: string): Promise<string> {
    console.log('[企业微信客服] 锐评:', { content: content.slice(0, 100), userId });
    
    // 提取要锐评的内容（去掉"锐评"等关键词）
    const articleContent = content.replace(/锐评|点评/g, '').trim();
    
    if (!articleContent) {
      return '请发送要锐评的文章内容。格式：锐评 + 文章内容';
    }

    try {
      // 调用 agentService 的 critique 方法
      const result = await this.agentService.critique({
        content: articleContent,
      });
      
      const credibilityEmoji = {
        high: '✅',
        medium: '⚠️',
        low: '❌',
      }[result.credibility] || '❓';
      
      return `${credibilityEmoji} 【可信度评估】${result.credibility === 'high' ? '高' : result.credibility === 'medium' ? '中等' : '低'}

${result.analysis}

${result.relatedArticles?.length > 0 
  ? `📚 【相关文章】\n${result.relatedArticles.map((a, i) => `${i + 1}. ${a}`).join('\n')}` 
  : ''}`;
    } catch (error) {
      console.error('[企业微信客服] 锐评失败:', error);
      return `锐评失败：${error.message}`;
    }
  }

  /**
   * 处理普通对话
   */
  private async handleChat(question: string, userId: string): Promise<string> {
    console.log('[企业微信客服] 对话:', { question, userId });
    
    try {
      // 调用 agentService 的 chat 方法
      const answer = await this.agentService.chat({ message: question });
      
      return answer;
    } catch (error) {
      console.error('[企业微信客服] 对话失败:', error);
      return `对话失败：${error.message}`;
    }
  }

  /**
   * 发送回复消息给用户
   */
  private async sendReply(userId: string, content: string): Promise<void> {
    console.log('[企业微信客服] 发送回复:', { userId, content: content.slice(0, 50) + '...' });
    
    // TODO: 调用企业微信发送消息 API
    // POST https://qyapi.weixin.qq.com/cgi-bin/kf/send_msg?access_token=ACCESS_TOKEN
    
    // 暂时只是日志，后续实现完整的 API 调用
  }

  /**
   * 获取客服联系链接
   */
  async getContactLink(): Promise<any> {
    // TODO: 调用企业微信 API 获取联系链接
    // 这个链接可以生成二维码，用户扫码添加客服
    
    return {
      url: 'https://work.weixin.qq.com/kf/xxx',
      qrCode: 'https://work.weixin.qq.com/kf/xxx?qrcode=1',
    };
  }

  /**
   * 生成签名（普通模式，不包含 echostr）
   */
  private generateSignature(token: string, timestamp: string, nonce: string): string {
    const arr = [token, timestamp, nonce].sort();
    const str = arr.join('');
    return createHash('sha1').update(str).digest('hex');
  }

  /**
   * 生成签名（企业微信客服回调模式，包含 echostr）
   * msg_signature = SHA1(sort(token、timestamp、nonce、echostr))
   */
  private generateSignatureWithEchostr(
    token: string, 
    timestamp: string, 
    nonce: string, 
    echostr: string
  ): string {
    const arr = [token, timestamp, nonce, echostr].sort();
    const str = arr.join('');
    console.log('[企业微信客服] 签名计算:', {
      sortedArr: arr,
      joinedStr: str.slice(0, 50) + '...',
    });
    return createHash('sha1').update(str).digest('hex');
  }

  /**
   * AES 解密
   * 
   * 企业微信加密格式：
   * Random(16字节) + MsgLen(4字节,网络字节序) + MsgContent + CorpID + Padding
   * 
   * 返回：消息内容部分（纯文本）
   */
  private decrypt(encrypted: string): string {
    if (!this.config.encodingAESKey) {
      return encrypted;
    }
    
    try {
      const key = Buffer.from(this.config.encodingAESKey + '=', 'base64');
      const decipher = createDecipheriv('aes-256-cbc', key, key.slice(0, 16));
      decipher.setAutoPadding(false);
      
      // 解密得到 Buffer
      const decryptedBuffer = Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'base64')),
        decipher.final()
      ]);
      
      console.log('[企业微信客服] 解密结果:', {
        totalLength: decryptedBuffer.length,
        hexPreview: decryptedBuffer.slice(0, 32).toString('hex'),
      });
      
      // 企业微信格式：16字节随机串 + 4字节消息长度 + 消息内容 + CorpID + Padding
      // 1. 去除 PKCS7 padding
      const padLen = decryptedBuffer[decryptedBuffer.length - 1];
      const unpadded = decryptedBuffer.slice(0, decryptedBuffer.length - padLen);
      
      // 2. 跳过前 16 字节随机串
      // 3. 读取 4 字节消息长度（大端）
      const msgLen = unpadded.readUInt32BE(16);
      
      console.log('[企业微信客服] 消息解析:', {
        padLen,
        unpaddedLength: unpadded.length,
        msgLen,
      });
      
      // 4. 提取消息内容（从第 20 字节开始，长度为 msgLen）
      const msgContent = unpadded.slice(20, 20 + msgLen).toString('utf8');
      
      // 5. CorpID（可选验证）
      const corpId = unpadded.slice(20 + msgLen).toString('utf8');
      
      console.log('[企业微信客服] 验证成功，返回 echostr:', {
        msgContent,
        corpId,
        expectedCorpId: this.config.corpId,
      });
      
      // 返回消息内容给企业微信
      return msgContent;
    } catch (error) {
      console.error('[企业微信客服] 解密失败:', error);
      // 降级：返回原始 echostr（明文模式）
      return encrypted;
    }
  }
}
