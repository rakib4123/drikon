import { Module } from '@nestjs/common';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { AprioriService } from './apriori.service';

@Module({
  controllers: [RecommendationsController],
  providers: [RecommendationsService, AprioriService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
