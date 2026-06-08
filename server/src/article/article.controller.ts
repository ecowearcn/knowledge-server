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
} from '@nestjs/common';
import { ArticleService, CreateArticleDto } from './article.service';

@Controller('articles')
export class ArticleController {
  constructor(private readonly service: ArticleService) {}

  @Post('import')
  @HttpCode(HttpStatus.OK)
  async importFromUrl(@Body() dto: CreateArticleDto) {
    const result = await this.service.createFromUrl(dto);
    return { code: 0, msg: 'success', data: result };
  }

  @Get()
  async findAll(@Query('knowledge_base_id') knowledgeBaseId?: string) {
    const result = knowledgeBaseId
      ? await this.service.findByKnowledgeBase(knowledgeBaseId)
      : await this.service.findAll();
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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.service.findOne(id);
    return { code: 0, msg: 'success', data: result };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { code: 0, msg: 'success' };
  }
}
