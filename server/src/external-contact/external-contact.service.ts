import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class ExternalContactService {
  private readonly logger = new Logger(ExternalContactService.name);
  private readonly token: string;
  private readonly encodingAESKey: string;
  private readonly corpId: string;

  constructor() {
    this.token = process.env.WECHAT_EXTERNAL_TOKEN || 'external_token_123';
    this.encodingAESKey = process.env.WECHAT_EXTERNAL_ENCODING_AES_KEY || '';
    this.corpId = process.env.WECHAT_CORP_ID || '';

    this.logger.log('[外部联系人] 初始化完成');
    this.logger.log(`[外部联系人] Token: ${this.token}`);
    this.logger.log(`[外部联系人] CorpID: ${this.corpId}`);
  }

  /**
   * 验证回调 URL（GET 请求）
   */
  verifyCallback(
    msgSignature: string,
    timestamp: string,
    nonce: string,
    echostr: string,
  ): string {
    this.logger.log('[外部联系人] 收到验证请求');
    this.logger.log(`[外部联系人] 参数: msgSignature=${msgSignature}, timestamp=${timestamp}, nonce=${nonce}`);
    this.logger.log(`[外部联系人] echostr (前20字符): ${echostr.slice(0, 20)}...`);

    // 验证签名
    const signatureValid = this.verifySignature(msgSignature, timestamp, nonce, echostr);
    this.logger.log(`[外部联系人] 签名验证结果: ${signatureValid}`);

    if (!signatureValid) {
      this.logger.warn('[外部联系人] 签名验证失败，返回原始 echostr');
      return echostr;
    }

    // 解密 echostr
    const decrypted = this.decryptEchostr(echostr);
    this.logger.log(`[外部联系人] 解密成功，返回内容: ${decrypted}`);

    return decrypted;
  }

  /**
   * 验证签名
   */
  private verifySignature(
    msgSignature: string,
    timestamp: string,
    nonce: string,
    echostr: string,
  ): boolean {
    // 企业微信签名算法：将 token、timestamp、nonce、echostr 排序拼接后 SHA1
    const arr = [this.token, timestamp, nonce, echostr].sort();
    const str = arr.join('');
    const computedSignature = crypto.createHash('sha1').update(str).digest('hex');

    this.logger.log('[外部联系人] 签名对比:');
    this.logger.log(`[外部联系人]   computed: ${computedSignature}`);
    this.logger.log(`[外部联系人]   received: ${msgSignature}`);
    this.logger.log(`[外部联系人]   match: ${computedSignature === msgSignature}`);

    return computedSignature === msgSignature;
  }

  /**
   * 解密 echostr（验证 URL 时）
   */
  private decryptEchostr(encrypted: string): string {
    if (!this.encodingAESKey) {
      this.logger.warn('[外部联系人] EncodingAESKey 未配置，返回原始 echostr');
      return encrypted;
    }

    try {
      const key = Buffer.from(this.encodingAESKey + '=', 'base64');
      const iv = key.slice(0, 16);

      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      decipher.setAutoPadding(false);

      let decrypted = Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'base64')),
        decipher.final(),
      ]);

      // 去除 PKCS7 padding
      const padLen = decrypted[decrypted.length - 1];
      decrypted = decrypted.slice(0, decrypted.length - padLen);

      // 企业微信格式: 16字节随机串 + 4字节消息长度(大端) + 消息内容 + CorpID
      const msgLen = decrypted.readUInt32BE(16);
      const msgContent = decrypted.slice(20, 20 + msgLen);

      this.logger.log(`[外部联系人] 解密后总长度: ${decrypted.length}`);
      this.logger.log(`[外部联系人] 消息长度: ${msgLen}`);
      this.logger.log(`[外部联系人] 消息内容: ${msgContent.toString('utf8')}`);

      return msgContent.toString('utf8');
    } catch (error) {
      this.logger.error(`[外部联系人] 解密失败: ${error.message}`);
      return encrypted;
    }
  }

  /**
   * 处理消息回调（POST 请求）
   */
  async handleMessage(
    msgSignature: string,
    timestamp: string,
    nonce: string,
    encryptedXml: string,
  ): Promise<string> {
    this.logger.log('[外部联系人] 收到消息回调');

    // 解密消息
    const decryptedXml = this.decryptMessage(encryptedXml);
    this.logger.log(`[外部联系人] 解密后的 XML: ${decryptedXml}`);

    // 解析 XML
    const message = this.parseXml(decryptedXml);
    this.logger.log(`[外部联系人] 消息内容: ${JSON.stringify(message)}`);

    // 处理不同类型的消息
    if (message.MsgType === 'text') {
      return await this.handleTextMessage(message);
    } else if (message.MsgType === 'event') {
      return await this.handleEvent(message);
    }

    return 'success';
  }

  /**
   * 解密消息内容
   */
  private decryptMessage(encryptedXml: string): string {
    // 从 XML 中提取加密的消息内容（使用字符串方式避免正则转义问题）
    const start = '<Encrypt><![CDATA[';
    const end = ']]></Encrypt>';
    const startIdx = encryptedXml.indexOf(start);
    const endIdx = encryptedXml.indexOf(end, startIdx + start.length);

    if (startIdx === -1 || endIdx === -1) {
      this.logger.warn('[外部联系人] 无法从 XML 中提取加密内容');
      return encryptedXml;
    }

    const encrypted = encryptedXml.slice(startIdx + start.length, endIdx);

    try {
      const key = Buffer.from(this.encodingAESKey + '=', 'base64');
      const iv = key.slice(0, 16);

      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      decipher.setAutoPadding(false);

      let decrypted = Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'base64')),
        decipher.final(),
      ]);

      // 去除 PKCS7 padding
      const padLen = decrypted[decrypted.length - 1];
      decrypted = decrypted.slice(0, decrypted.length - padLen);

      // 企业微信格式: 16字节随机串 + 4字节消息长度(大端) + 消息内容 + CorpID
      const msgLen = decrypted.readUInt32BE(16);
      const msgContent = decrypted.slice(20, 20 + msgLen);

      return msgContent.toString('utf8');
    } catch (error) {
      this.logger.error(`[外部联系人] 消息解密失败: ${error.message}`);
      return encryptedXml;
    }
  }

  /**
   * 解析 XML 消息
   */
  private parseXml(xml: string): any {
    const result: any = {};

    // 简单的 XML 解析（使用字符串方式避免正则转义问题）
    const extractCData = (tagName: string): string | null => {
      const start = `<${tagName}><![CDATA[`;
      const end = `]]></${tagName}>`;
      const startIdx = xml.indexOf(start);
      if (startIdx === -1) return null;
      const contentStart = startIdx + start.length;
      const endIdx = xml.indexOf(end, contentStart);
      if (endIdx === -1) return null;
      return xml.slice(contentStart, endIdx);
    };

    const extractValue = (tagName: string): string | null => {
      const start = `<${tagName}>`;
      const end = `</${tagName}>`;
      const startIdx = xml.indexOf(start);
      if (startIdx === -1) return null;
      const contentStart = startIdx + start.length;
      const endIdx = xml.indexOf(end, contentStart);
      if (endIdx === -1) return null;
      return xml.slice(contentStart, endIdx);
    };

    // 解析各字段
    result.ToUserName = extractCData('ToUserName');
    result.FromUserName = extractCData('FromUserName');
    result.CreateTime = extractValue('CreateTime');
    result.MsgType = extractCData('MsgType');
    result.Content = extractCData('Content');
    result.MsgId = extractValue('MsgId');
    result.Event = extractCData('Event');

    return result;
  }

  /**
   * 处理文本消息
   */
  private async handleTextMessage(message: any): Promise<string> {
    const content = message.Content || '';
    const fromUser = message.FromUserName || '';

    this.logger.log(`[外部联系人] 收到文本消息: ${content}`);
    this.logger.log(`[外部联系人] 发送者: ${fromUser}`);

    // 检测是否是公众号文章链接
    if (content.includes('mp.weixin.qq.com') || content.includes('公众号文章')) {
      this.logger.log('[外部联系人] 检测到公众号文章链接，开始处理...');
      // TODO: 调用文章处理服务
      return 'success';
    }

    // 其他文本消息
    this.logger.log('[外部联系人] 普通文本消息，暂不处理');
    return 'success';
  }

  /**
   * 处理事件
   */
  private async handleEvent(message: any): Promise<string> {
    const event = message.Event || '';
    this.logger.log(`[外部联系人] 收到事件: ${event}`);

    switch (event) {
      case 'change_external_contact':
        // 外部联系人变更事件（添加/删除好友）
        this.logger.log('[外部联系人] 外部联系人变更事件');
        break;
      default:
        this.logger.log(`[外部联系人] 未知事件: ${event}`);
    }

    return 'success';
  }
}