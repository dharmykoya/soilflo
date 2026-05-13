import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Site } from './domain/site.entity';
import { SiteRepository } from './domain/site.repository.interface';
import { TypeOrmSiteRepository } from './infrastructure/typeorm-site.repository';
import { SitesService } from './application/sites.service';
import { SitesController } from './presentation/sites.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Site])],
  controllers: [SitesController],
  providers: [
    SitesService,
    // Bind the abstract port to the TypeORM adapter
    {
      provide: SiteRepository,
      useClass: TypeOrmSiteRepository,
    },
  ],
  // Export SitesService so other modules (e.g. tickets) can resolve sites
  exports: [SitesService],
})
export class SitesModule {}
