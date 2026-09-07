import type {
  DealerAddress,
  DealerAddressCreateInput,
  DealerApplication,
  DealerApplicationCreateInput,
  DealerApplicationReviewInput,
  DealerApplicationStatus,
  DealerCompany,
  DealerCompanyStatus,
  DealerCompanyUpdateInput,
  DealerMember,
  DealerMemberCreateInput,
  DealerMemberStatus,
  DealerPublicListing,
  DealerTier,
  DealerTierUpsertInput,
} from "@wemo/contracts";

export const DEALERS_REPOSITORY = Symbol("DEALERS_REPOSITORY");

export type ListResult<Item> = {
  items: Item[];
  total: number;
  page: number;
  page_size: number;
};

type PaginationQuery = {
  page: number;
  page_size: number;
};

export type DealerApplicationListQuery = PaginationQuery & {
  status?: DealerApplicationStatus | undefined;
  country?: string | undefined;
  applicant_user_id?: number | undefined;
};

export type DealerCompanyListQuery = PaginationQuery & {
  status?: DealerCompanyStatus | undefined;
  country?: string | undefined;
};

export type DealerMemberListQuery = PaginationQuery & {
  company_id?: number | undefined;
  status?: DealerMemberStatus | undefined;
};

export type DealerPublicListingListQuery = PaginationQuery & {
  country?: string | undefined;
};

export interface DealersRepository {
  listPublicListings(query: DealerPublicListingListQuery): Promise<ListResult<DealerPublicListing>>;

  createApplication(
    input: DealerApplicationCreateInput & {
      applicant_user_id: number | null;
      request_id: string;
    },
  ): Promise<DealerApplication>;

  listDealerApplications(query: DealerApplicationListQuery): Promise<ListResult<DealerApplication>>;
  getDealerApplication(id: number): Promise<DealerApplication | null>;

  submitDealerApplication(
    id: number,
    requestId: string,
    userId: number | null,
    note?: string,
  ): Promise<DealerApplication>;

  reviewDealerApplication(
    id: number,
    input: DealerApplicationReviewInput,
    reviewerId: number,
    requestId: string,
  ): Promise<{
    application: DealerApplication;
    company: DealerCompany | null;
    member: DealerMember | null;
  }>;

  getDealerCompany(companyId: number): Promise<DealerCompany | null>;
  updateDealerCompany(companyId: number, input: DealerCompanyUpdateInput): Promise<DealerCompany>;
  listDealerCompanies(query: DealerCompanyListQuery): Promise<ListResult<DealerCompany>>;

  createDealerMember(
    input: DealerMemberCreateInput & { company_id: number },
  ): Promise<DealerMember>;
  listDealerMembers(query: DealerMemberListQuery): Promise<ListResult<DealerMember>>;

  listDealerAddresses(companyId: number): Promise<DealerAddress[]>;
  createDealerAddress(companyId: number, input: DealerAddressCreateInput): Promise<DealerAddress>;
  listTiers(): Promise<DealerTier[]>;
  upsertTier(input: DealerTierUpsertInput & { id?: number }): Promise<DealerTier>;
}
