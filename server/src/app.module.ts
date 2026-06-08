import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { ArticleModule } from './article/article.module';
import { AgentModule } from './agent/agent.module';

@Module({
  imports: [KnowledgeBaseModule, ArticleModule, AgentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
