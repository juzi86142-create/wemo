import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import { DealersService } from "./dealers.service";

@Controller()
export class DealersController {
  constructor(
    @Inject(DealersService)
    private readonly dealersService: DealersService,
  ) {}

  @Get("dealer/public-listings")
  listPublicListings(@Query() query: unknown) {
    return this.dealersService.listPublicListings(query);
  }

  @Post("dealer/applications")
  @HttpCode(200)
  createApplication(@Body() body: unknown) {
    return this.dealersService.createApplication(body);
  }

  @Get("dealer/applications")
  listApplications(@Query() query: unknown) {
    return this.dealersService.listApplications(query);
  }

  @Get("dealer/applications/:id")
  getApplication(@Param("id") id: string) {
    return this.dealersService.getApplication(id);
  }

  @Post("dealer/applications/:id/submit")
  @HttpCode(200)
  submitApplication(@Param("id") id: string, @Body() body: unknown) {
    return this.dealersService.submitApplication(id, body);
  }

  @Get("dealer/company")
  getCompany() {
    return this.dealersService.getCompany();
  }

  @Patch("dealer/company")
  updateCompany(@Body() body: unknown) {
    return this.dealersService.updateCompany(body);
  }

  @Get("dealer/addresses")
  listAddresses() {
    return this.dealersService.listAddresses();
  }

  @Post("dealer/addresses")
  @HttpCode(200)
  createAddress(@Body() body: unknown) {
    return this.dealersService.createAddress(body);
  }

  @Get("dealer/members")
  listMembers(@Query() query: unknown) {
    return this.dealersService.listMembers(query);
  }

  @Post("dealer/members")
  @HttpCode(200)
  inviteMember(@Body() body: unknown) {
    return this.dealersService.inviteMember(body);
  }

  @Get("admin/dealer-applications")
  listAdminApplications(@Query() query: unknown) {
    return this.dealersService.listAdminApplications(query);
  }

  @Post("admin/dealer-applications/:id/review")
  @HttpCode(200)
  reviewApplication(@Param("id") id: string, @Body() body: unknown) {
    return this.dealersService.reviewApplication(id, body);
  }

  @Get("admin/dealers/companies")
  listCompanies(@Query() query: unknown) {
    return this.dealersService.listCompanies(query);
  }

  @Patch("admin/dealers/companies/:id")
  updateCompanyById(@Param("id") id: string, @Body() body: unknown) {
    return this.dealersService.updateCompanyById(id, body);
  }

  @Get("admin/dealers/members")
  listAdminMembers(@Query() query: unknown) {
    return this.dealersService.listAdminMembers(query);
  }
}
