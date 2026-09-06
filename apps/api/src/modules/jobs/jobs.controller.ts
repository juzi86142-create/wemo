import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
} from "@nestjs/common";

import { JobsService } from "./jobs.service";

@Controller("admin/jobs")
export class JobsController {
  constructor(
    @Inject(JobsService)
    private readonly jobsService: JobsService,
  ) {}

  @Get()
  listJobs(@Query() query: unknown) {
    return this.jobsService.listJobs(query);
  }

  @Get("outbox")
  listOutbox(@Query() query: unknown) {
    return this.jobsService.listOutbox(query);
  }

  @Get(":id")
  getJob(@Param("id") id: string) {
    return this.jobsService.getJob(id);
  }

  @Post()
  @HttpCode(200)
  createJob(@Body() body: unknown) {
    return this.jobsService.createJob(body);
  }

  @Post(":id/retry")
  @HttpCode(200)
  retryJob(@Param("id") id: string, @Body() body: unknown) {
    return this.jobsService.retryJob(id, body);
  }

  @Post(":id/complete")
  @HttpCode(200)
  completeJob(@Param("id") id: string, @Body() body: unknown) {
    return this.jobsService.completeJob(id, body);
  }

  @Post(":id/fail")
  @HttpCode(200)
  failJob(@Param("id") id: string, @Body() body: unknown) {
    return this.jobsService.failJob(id, body);
  }
}
