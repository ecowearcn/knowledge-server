import { Controller, Get, Post, Query, Body, Logger } from '@nestjs/common';
import { ExternalContactService } from './external-contact.service';

@Controller('external-contact')
export class ExternalContactController {
  private readonly logger = new Logger(ExternalContactController.name);

  constructor(private readonly externalContactService: ExternalContactService) {}

  /**
   * 回调 URL 验证（GET 请求）
   * 企业微信在配置回调 URL 时会发送 GET 请求进行验证
   */
  @Get('callback')
  async verifyCallback(
    @Query('msg_signature') msgSignature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
    @Query('echostr') echostr: string,
  ): Promise<string> {
    this.logger.log('[外部联系人回调] 收到 GET 验证请求');
    this.logger.log(`[外部联系人回调] msg_signature: ${msgSignature}`);
    this.logger.log(`[外部联系人回调] timestamp: ${timestamp}`);
    this.logger.log(`[外部联系人回调] nonce: ${nonce}`);
    this.logger.log(`[外部联系人回调] echostr: ${echostr?.slice(0, 20)}...`);

    if (!echostr) {
      // 没有验证参数，返回测试响应
      return 'external-contact callback is ready';
    }

    return this.externalContactService.verifyCallback(
      msgSignature,
      timestamp,
      nonce,
      echostr,
    );
  }

  /**
   * 接收消息回调（POST 请求）
   * 微信好友发给员工账号的消息会通过 POST 请求推送
   */
  @Post('callback')
  async handleMessage(
    @Query('msg_signature') msgSignature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
    @Body() body: any,
  ): Promise<string> {
    this.logger.log('[外部联系人回调] 收到 POST 消息回调');
    this.logger.log(`[外部联系人回调] msg_signature: ${msgSignature}`);
    this.logger.log(`[外部联系人回调] timestamp: ${timestamp}`);
    this.logger.log(`[外部联系人回调] nonce: ${nonce}`);
    this.logger.log(`[外部联系人回调] body type: ${typeof body}`);

    // 获取加密的 XML 内容
    let encryptedXml: string;
    if (typeof body === 'string') {
      encryptedXml = body;
    } else if (body?.Encrypt) {
      encryptedXml = `<Encrypt><![CDATA[${body.Encrypt}]]></Encrypt>`;
    } else {
      encryptedXml = JSON.stringify(body);
    }

    this.logger.log(`[外部联系人回调] encrypted XML: ${encryptedXml?.slice(0, 100)}...`);

    return this.externalContactService.handleMessage(
      msgSignature,
      timestamp,
      nonce,
      encryptedXml,
    );
  }

  /**
   * 测试接口
   */
  @Get('test')
  async test(): Promise<string> {
    return 'external-contact module is working!';
  }
}