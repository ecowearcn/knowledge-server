import { Controller, Get, Post, Query, Body, Req, Res, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { WechatCustomerService } from './wechat-customer.service';

@Controller('wechat-customer')
export class WechatCustomerController {
  constructor(private readonly wechatCustomerService: WechatCustomerService) {}

  /**
   * 企业微信回调验证（GET 请求）
   * 用于验证回调 URL 有效性
   * 
   * 企业微信客服回调参数：
   * - msg_signature: 消息签名
   * - timestamp: 时间戳
   * - nonce: 随机数
   * - echostr: 加密的随机字符串
   * 
   * 也支持普通签名验证（signature 参数）
   */
  @Get('message')
  async verifyCallback(
    @Query('msg_signature') msgSignature: string,
    @Query('signature') signature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
    @Query('echostr') echostr: string,
    @Res() res: Response,
  ) {
    console.log('[企业微信客服] 收到验证请求:', { 
      msgSignature, 
      signature,
      timestamp, 
      nonce, 
      echostr,
      echostrLength: echostr?.length,
    });
    
    try {
      const decrypted = await this.wechatCustomerService.verifyCallback(
        msgSignature || signature,
        timestamp,
        nonce,
        echostr,
      );
      console.log('[企业微信客服] 验证成功，返回 echostr');
      return res.status(HttpStatus.OK).send(decrypted);
    } catch (error) {
      console.error('[企业微信客服] 验证失败:', error);
      // 返回 echostr 的原值作为降级方案（明文模式）
      if (echostr) {
        console.log('[企业微信客服] 降级：返回原始 echostr');
        return res.status(HttpStatus.OK).send(echostr);
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('error');
    }
  }

  /**
   * 接收企业微信客服消息（POST 请求）
   */
  @Post('message')
  async receiveMessage(
    @Query('msg_signature') msgSignature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
    @Body() body: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    console.log('[企业微信客服] 收到消息:', { msgSignature, timestamp, nonce, body });
    
    try {
      // 获取原始 XML body
      const xmlBody = req.body;
      const result = await this.wechatCustomerService.handleMessage(
        msgSignature,
        timestamp,
        nonce,
        xmlBody,
      );
      console.log('[企业微信客服] 处理结果:', result);
      return res.status(HttpStatus.OK).send('success');
    } catch (error) {
      console.error('[企业微信客服] 处理消息失败:', error);
      return res.status(HttpStatus.OK).send('success'); // 仍然返回 success，避免重试
    }
  }

  /**
   * 获取客服链接（用于用户扫码添加）
   */
  @Get('contact-link')
  async getContactLink() {
    const link = await this.wechatCustomerService.getContactLink();
    return {
      code: 0,
      msg: 'success',
      data: link,
    };
  }
}
