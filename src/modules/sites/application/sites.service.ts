import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResultDto } from '../../../shared/pagination/paginated-result.dto';
import { SiteRepository } from '../domain/site.repository.interface';
import { Site } from '../domain/site.entity';
import { GetSitesQueryDto } from './get-sites-query.dto';

@Injectable()
export class SitesService {
  constructor(private readonly siteRepository: SiteRepository) {}

  async findAll(query: GetSitesQueryDto): Promise<PaginatedResultDto<Site>> {
    const [sites, total] = await this.siteRepository.findAll(query);
    return new PaginatedResultDto(sites, total, query.page, query.limit);
  }

  async findById(id: number): Promise<Site> {
    const site = await this.siteRepository.findById(id);
    if (!site) {
      throw new NotFoundException(`Site with id ${id} not found`);
    }
    return site;
  }
}
