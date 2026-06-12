import { Module } from '@nestjs/common';
import { ExternalContactController } from './external-contact.controller';
import { ExternalContactService } from './external-contact.service';

@Module({
  controllers: [ExternalContactController],
  providers: [ExternalContactService],
})
export class ExternalContactModule {}