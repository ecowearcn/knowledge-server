import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ArticleService, CreateArticleDto } from './article.service';

@Controller('articles')
export class ArticleController {
  constructor(private readonly service: ArticleService) {}

  @Post('import')
  @HttpCode(HttpStatus.OK)
  async importFromUrl(
    @Body()
    body: {
      url?: string;
      content?: string; // 手动粘贴的内容
      title?: string; // 手动输入的标题
      knowledgeBaseId: string;
    },
    @Req() req: Request,
  ) {
    const headers = req.headers as Record<string, string>;
    const dto: CreateArticleDto = {
      source_url: body.url || '',
      knowledge_base_id: body.knowledgeBaseId,
    };
    const result = await this.service.createFromUrl(dto, headers, body.content, body.title);
    return { code: 0, msg: 'success', data: result };
  }

  @Get()
  async findAll(@Query('knowledge_base_id') knowledgeBaseId?: string) {
    const result = knowledgeBaseId
      ? await this.service.findByKnowledgeBase(knowledgeBaseId)
      : await this.service.findAll();
    return { code: 0, msg: 'success', data: result };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.service.findOne(id);
    return { code: 0, msg: 'success', data: result };
  }

  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('knowledge_base_ids') knowledgeBaseIds?: string,
  ) {
    const ids = knowledgeBaseIds
      ? knowledgeBaseIds.split(',').filter(Boolean)
      : undefined;
    const result = await this.service.search(query, ids);
    return { code: 0, msg: 'success', data: result };
  }

  /**
   * 测试 URL 抓取（不入库，只返回内容）
   */
  @Post('fetch')
  @HttpCode(HttpStatus.OK)
  async fetchUrl(
    @Body() body: { url: string },
    @Req() req: Request,
  ) {
    const headers = req.headers as Record<string, string>;
    const result = await this.service.fetchUrlContent(body.url, headers);
    return { code: 0, msg: 'success', data: result };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { code: 0, msg: 'success' };
  }
}
