import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobResponseDto {
  @ApiProperty({ example: '1', description: 'BullMQ job ID — use to poll for status' })
  jobId!: string;
}

export class JobStatusResponseDto {
  @ApiProperty({ example: '1' })
  jobId!: string;

  @ApiProperty({
    example: 'completed',
    description: 'BullMQ job state: waiting | active | completed | failed | delayed | paused',
  })
  status!: string;

  @ApiPropertyOptional({ description: 'Created tickets — present when status is "completed"' })
  result?: unknown;

  @ApiPropertyOptional({ description: 'Error message — present when status is "failed"' })
  failedReason?: string;
}
