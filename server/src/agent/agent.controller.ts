import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AgentService, ChatRequest, CritiqueRequest } from './agent.service';

@Controller('agent')
export class AgentController {
  constructor(private readonly service: AgentService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() request: ChatRequest) {
    const result = await this.service.chat(request);
    return { code: 0, msg: 'success', data: result };
  }

  @Post('critique')
  @HttpCode(HttpStatus.OK)
  async critique(@Body() request: CritiqueRequest) {
    const result = await this.service.critique(request);
    return { code: 0, msg: 'success', data: result };
  }
}
