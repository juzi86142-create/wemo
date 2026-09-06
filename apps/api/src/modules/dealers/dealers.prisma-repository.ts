import { Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { DEALERS_REPOSITORY, type DealersRepository } from "./dealers.repository";
import type { DealerApplication, DealerCompany, DealerPublicListing } from "@wemo/contracts";

@Injectable()
export class DealersPrismaRepository implements DealersRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async listPublicListings(query: any): Promise<{ items: DealerPublicListing[]; total: number; page: number; page_size: number }> {
    const [companies, total] = await Promise.all([
      this.database.dealerCompany.findMany({
        where: { status: "active", publicListing: true },
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.database.dealerCompany.count({ where: { status: "active", publicListing: true } }),
    ]);

    return {
      items: companies.map(c => ({
        id: c.id,
        company_name: c.displayName,
        status: c.status,
      })),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async createApplication(input: any): Promise<DealerApplication> {
    const applicationNo = `APP-${Date.now()}`;
    const application = await this.database.dealerApplication.create({
      data: {
        applicationNo,
        applicantUserId: input.applicant_user_id,
        legalName: input.company_name,
        country: input.country || "US",
        contactEmail: input.contact_email,
        payload: input.payload ?? {},
        status: "draft",
      },
    });

    return this.mapApplication(application);
  }

  async listDealerApplications(query: any): Promise<{ items: DealerApplication[]; total: number; page: number; page_size: number }> {
    const where: any = {};
    if (query.applicant_user_id) where.applicantUserId = query.applicant_user_id;
    if (query.status) where.status = query.status;

    const [applications, total] = await Promise.all([
      this.database.dealerApplication.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.database.dealerApplication.count({ where }),
    ]);

    return {
      items: applications.map(this.mapApplication),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getDealerApplication(id: number): Promise<DealerApplication | null> {
    const application = await this.database.dealerApplication.findUnique({
      where: { id },
    });

    return application ? this.mapApplication(application) : null;
  }

  async submitDealerApplication(id: number, requestId: string, userId: number | null, note?: string): Promise<DealerApplication> {
    const application = await this.database.dealerApplication.update({
      where: { id },
      data: {
        status: "submitted",
        submittedAt: new Date(),
        payload: { note },
      },
    });

    return this.mapApplication(application);
  }

  async reviewDealerApplication(id: number, input: any, reviewerId: number, requestId: string): Promise<{ application: DealerApplication; company?: DealerCompany; member?: any }> {
    return this.database.$transaction(async (tx) => {
      const application = await tx.dealerApplication.update({
        where: { id },
        data: {
          status: input.decision,
          reviewedAt: new Date(),
          reviewNote: input.note,
        },
      });

      let company;
      let member;

      if (input.decision === "approved") {
        company = await tx.dealerCompany.create({
          data: {
            legalName: application.legalName,
            displayName: application.legalName,
            country: application.country,
            currency: "USD",
            status: "active",
          },
        });

        if (application.applicantUserId) {
          member = await tx.dealerMember.create({
            data: {
              companyId: company.id,
              userId: application.applicantUserId,
              role: "admin",
              permissions: ["dealer:read", "dealer:write"],
              status: "active",
            },
          });
        }
      }

      return {
        application: this.mapApplication(application),
        company: company ? this.mapCompany(company) : undefined,
        member,
      };
    });
  }

  async getDealerCompany(companyId: number): Promise<DealerCompany | null> {
    const company = await this.database.dealerCompany.findUnique({
      where: { id: companyId },
      include: {
        members: { include: { user: true } },
        addresses: true,
      },
    });

    return company ? this.mapCompany(company) : null;
  }

  async updateDealerCompany(companyId: number, input: any): Promise<DealerCompany> {
    const company = await this.database.dealerCompany.update({
      where: { id: companyId },
      data: {
        displayName: input.name,
        address: input.address,
      },
    });

    return this.mapCompany(company);
  }

  async listDealerCompanies(query: any): Promise<{ items: DealerCompany[]; total: number; page: number; page_size: number }> {
    const where: any = {};
    if (query.status) where.status = query.status;

    const [companies, total] = await Promise.all([
      this.database.dealerCompany.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.database.dealerCompany.count({ where }),
    ]);

    return {
      items: companies.map(this.mapCompany),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async createDealerMember(input: { company_id: number; user_id: number; role: string; permissions: string[] }): Promise<any> {
    const member = await this.database.dealerMember.create({
      data: {
        companyId: input.company_id,
        userId: input.user_id,
        role: input.role,
        permissions: input.permissions,
        status: "active",
      },
    });

    return {
      id: member.id,
      company_id: member.companyId,
      user_id: member.userId,
      role: member.role,
    };
  }

  async listDealerMembers(query: any): Promise<{ items: any[]; total: number; page: number; page_size: number }> {
    const [members, total] = await Promise.all([
      this.database.dealerMember.findMany({
        where: { companyId: query.company_id },
        include: { user: { select: { id: true, email: true, name: true } } },
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.database.dealerMember.count({ where: { companyId: query.company_id } }),
    ]);

    return {
      items: members.map(m => ({
        id: m.id,
        company_id: m.companyId,
        user_id: m.userId,
        role: m.role,
        user: m.user,
      })),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async listDealerAddresses(companyId: number): Promise<DealerAddress[]> {
    const addresses = await this.database.dealerAddress.findMany({
      where: { companyId },
    });

    return addresses.map(a => ({
      id: a.id,
      company_id: a.companyId,
      label: a.kind,
      address: a.payload,
      city: a.payload?.city,
      public_listing: a.publicListing,
    }));
  }

  async createDealerAddress(input: { company_id: number; label: string; address: string; city: string; public_listing?: boolean }): Promise<DealerAddress> {
    const address = await this.database.dealerAddress.create({
      data: {
        companyId: input.company_id,
        kind: input.label,
        payload: input,
        publicListing: input.public_listing ?? false,
      },
    });

    return {
      id: address.id,
      company_id: address.companyId,
      label: address.kind,
      address: address.payload,
      city: address.payload?.city,
      public_listing: address.publicListing,
    };
  }

  private mapApplication(application: any): DealerApplication {
    return {
      id: application.id,
      applicant_user_id: application.applicantUserId,
      company_name: application.legalName,
      status: application.status,
      submitted_at: application.submittedAt?.toISOString() || null,
      created_at: application.createdAt.toISOString(),
    };
  }

  private mapCompany(company: any): DealerCompany {
    return {
      id: company.id,
      legal_name: company.legalName,
      display_name: company.displayName,
      country: company.country,
      currency: company.currency,
      status: company.status,
      created_at: company.createdAt.toISOString(),
    };
  }
}
