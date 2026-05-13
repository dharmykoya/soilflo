import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API health check' })
  @ApiOkResponse({ description: 'Welcome message' })
  root(): Record<string, unknown> {
    return {
      message: 'Welcome to SoilFLO API',
      version: '1.0',
      docs: '/api/docs',
      status: 'ok',
    };
  }
}
