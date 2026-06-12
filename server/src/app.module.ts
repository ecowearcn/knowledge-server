import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { ArticleModule } from './article/article.module';
import { AgentModule } from './agent/agent.module';
import { WechatCustomerModule } from './wechat-customer/wechat-customer.module';
import { ExternalContactModule } from './external-contact/external-contact.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    KnowledgeBaseModule,
    ArticleModule,
    AgentModule,
    WechatCustomerModule,
    ExternalContactModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
