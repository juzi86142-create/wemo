import type { DealerAddress, DealerApplication, DealerApplicationCreateInput, DealerApplicationListQuery, DealerApplicationReviewInput, DealerCompany, DealerCompanyUpdateInput, DealerMemberCreateInput, DealerMemberListQuery, DealerPublicListing, DealerPublicListingListQuery } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const DEALERS_REPOSITORY = Symbol("DEALERS_REPOSITORY");

export interface DealersRepository {
  listPublicListings(query: DealerPublicListingListQuery): Promise<{ items: DealerPublicListing[]; total: number; page: number; page_size: number }>;
  createApplication(input: DealerApplicationCreateInput & { applicant_user_id: number | null; request_id: string; payload: unknown }): Promise<DealerApplication>;
  listDealerApplications(query: DealerApplicationListQuery): Promise<{ items: DealerApplication[]; total: number; page: number; page_size: number }>;
  getDealerApplication(id: number): Promise<DealerApplication | null>;
  submitDealerApplication(id: number, requestId: string, userId: number | null, note?: string): Promise<DealerApplication>;
  reviewDealerApplication(id: number, input: DealerApplicationReviewInput, reviewerId: number, requestId: string): Promise<{ application: DealerApplication; company?: DealerCompany; member?: any }>;
  getDealerCompany(companyId: number): Promise<DealerCompany | null>;
  updateDealerCompany(companyId: number, input: DealerCompanyUpdateInput): Promise<DealerCompany>;
  listDealerCompanies(query: any): Promise<{ items: DealerCompany[]; total: number; page: number; page_size: number }>;
  createDealerMember(input: { company_id: number; user_id: number; role: string; permissions: string[] }): Promise<any>;
  listDealerMembers(query: DealerMemberListQuery): Promise<{ items: any[]; total: number; page: number; page_size: number }>;
  listDealerAddresses(companyId: number): Promise<DealerAddress[]>;
  createDealerAddress(input: { company_id: number; label: string; address: string; city: string; public_listing?: boolean }): Promise<DealerAddress>;
}
