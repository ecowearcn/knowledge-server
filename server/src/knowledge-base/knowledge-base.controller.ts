import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { KnowledgeBaseService, CreateKnowledgeBaseDto } from './knowledge-base.service';

@Controller('knowledge-bases')
export class KnowledgeBaseController {
  constructor(private readonly service: KnowledgeBaseService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async create(@Body() dto: CreateKnowledgeBaseDto) {
    const result = await this.service.create(dto);
    return { code: 0, msg: 'success', data: result };
  }

  @Get()
  async findAll(@Query('type') type?: 'official' | 'member') {
    const result = type
      ? await this.service.findByType(type)
      : await this.service.findAll();
    return { code: 0, msg: 'success', data: result };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.service.findOne(id);
    return { code: 0, msg: 'success', data: result };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateKnowledgeBaseDto>) {
    const result = await this.service.update(id, dto);
    return { code: 0, msg: 'success', data: result };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { code: 0, msg: 'success' };
  }
}
