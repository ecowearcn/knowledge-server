import { Module, forwardRef } from '@nestjs/common';
import { WechatCustomerController } from './wechat-customer.controller';
import { WechatCustomerService } from './wechat-customer.service';
import { ArticleModule } from '../article/article.module';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [
    forwardRef(() => ArticleModule),
    forwardRef(() => AgentModule),
  ],
  controllers: [WechatCustomerController],
  providers: [WechatCustomerService],
  exports: [WechatCustomerService],
})
export class WechatCustomerModule {}
