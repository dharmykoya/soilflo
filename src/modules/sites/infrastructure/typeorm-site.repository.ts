import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { GetSitesQueryDto } from '../application/get-sites-query.dto';
import { SiteRepository } from '../domain/site.repository.interface';
import { Site } from '../domain/site.entity';

@Injectable()
export class TypeOrmSiteRepository implements SiteRepository {
  constructor(
    @InjectRepository(Site)
    private readonly repo: Repository<Site>,
  ) {}

  findAll({ page, limit, search }: GetSitesQueryDto): Promise<[Site[], number]> {
    const where: FindOptionsWhere<Site>[] | FindOptionsWhere<Site> = search
      ? [
          { name: ILike(`%${search}%`) },
          { address: ILike(`%${search}%`) },
        ]
      : {};

    return this.repo.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findById(id: number): Promise<Site | null> {
    return this.repo.findOneBy({ id });
  }
}
