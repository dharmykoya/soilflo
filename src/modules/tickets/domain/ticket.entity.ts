import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Site } from '../../sites/domain/site.entity';
import { Truck } from '../../trucks/domain/truck.entity';
import { Material } from './material.enum';
import { TicketStatus } from './ticket-status.enum';

@Entity('tickets')
@Index('uq_tickets_truck_dispatched', ['truckId', 'dispatchedAt'], { unique: true })
@Index('uq_tickets_site_ticket_number', ['siteId', 'ticketNumber'], { unique: true })
export class Ticket {
  /** UUID v7 — app-generated (time-ordered, no sequential volume leakage) */
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Index('idx_tickets_site_id')
  @Column({ type: 'integer', name: 'site_id' })
  siteId!: number;

  @Column({ type: 'integer', name: 'truck_id' })
  truckId!: number;

  /** Sequential per-site counter; assigned inside advisory-locked transaction */
  @Column({ type: 'integer', name: 'ticket_number' })
  ticketNumber!: number;

  @Column({ type: 'varchar', length: 20 })
  material!: Material;

  @Column({ type: 'varchar', length: 20, default: TicketStatus.Active })
  status!: TicketStatus;

  @Index('idx_tickets_dispatched_at')
  @Column({ type: 'timestamptz', name: 'dispatched_at' })
  dispatchedAt!: Date;

  @ManyToOne(() => Site, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'site_id' })
  site?: Site;

  @ManyToOne(() => Truck, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'truck_id' })
  truck?: Truck;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
