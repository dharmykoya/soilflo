import { GetSitesQueryDto } from '../application/get-sites-query.dto';
import { Site } from './site.entity';

export abstract class SiteRepository {
  abstract findAll(query: GetSitesQueryDto): Promise<[Site[], number]>;
  abstract findById(id: number): Promise<Site | null>;
}
