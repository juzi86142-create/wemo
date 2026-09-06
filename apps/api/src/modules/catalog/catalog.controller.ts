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

import { CatalogService } from "./catalog.service";

@Controller()
export class CatalogController {
  constructor(
    @Inject(CatalogService)
    private readonly catalogService: CatalogService,
  ) {}

  @Get("catalog/categories")
  listCategories(@Query() query: unknown) {
    return this.catalogService.listCategories(query);
  }

  @Get("admin/catalog/categories")
  listAdminCategories(@Query() query: unknown) {
    return this.catalogService.listAdminCategories(query);
  }

  @Post("admin/catalog/categories")
  @HttpCode(200)
  createCategory(@Body() body: unknown) {
    return this.catalogService.createCategory(body);
  }

  @Patch("admin/catalog/categories/:id")
  @HttpCode(200)
  updateCategory(@Param("id") id: string, @Body() body: unknown) {
    return this.catalogService.updateCategory(id, body);
  }

  @Get("catalog/products")
  listProducts(@Query() query: unknown) {
    return this.catalogService.listProducts(query);
  }

  @Get("admin/catalog/products")
  listAdminProducts(@Query() query: unknown) {
    return this.catalogService.listAdminProducts(query);
  }

  @Get("catalog/products/:slug")
  getProduct(@Param("slug") slug: string) {
    return this.catalogService.getProduct(slug);
  }

  @Post("admin/catalog/products")
  @HttpCode(200)
  createProduct(@Body() body: unknown) {
    return this.catalogService.createProduct(body);
  }

  @Patch("admin/catalog/products/:id")
  @HttpCode(200)
  updateProduct(@Param("id") id: string, @Body() body: unknown) {
    return this.catalogService.updateProduct(id, body);
  }

  @Post("admin/catalog/products/:id/publish")
  @HttpCode(200)
  publishProduct(@Param("id") id: string) {
    return this.catalogService.publishProduct(id);
  }

  @Post("admin/catalog/products/:id/archive")
  @HttpCode(200)
  archiveProduct(@Param("id") id: string) {
    return this.catalogService.archiveProduct(id);
  }

  @Get("catalog/variants")
  listVariants() {
    return this.catalogService.listVariants();
  }
}
