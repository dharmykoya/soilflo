import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Site } from '../../sites/domain/site.entity';

/**
 * Tracks the last assigned ticket number for each site.
 *
 * One row per site. Updated atomically via an upsert inside a transaction,
 * replacing the O(n) MAX(ticket_number) scan with an O(1) point lookup.
 */
@Entity('site_ticket_counters')
export class SiteTicketCounter {
  @PrimaryColumn({ name: 'site_id' })
  siteId!: number;

  @Column({ name: 'last_ticket_number', type: 'bigint', default: 0 })
  lastTicketNumber!: number;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'site_id' })
  site!: Site;
}
