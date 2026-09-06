import { Inject, Injectable } from "@nestjs/common";
import {
  ReportExportResponseSchema,
  ReportKindSchema,
  ReportQuerySchema,
  ReportSnapshotSchema,
} from "@wemo/contracts/platform";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { parseInput } from "../../runtime/validation";
import { PlatformStateStore } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";

const ReportKindParamSchema = z.object({
  kind: ReportKindSchema,
});

@Injectable()
export class ReportsService {
  constructor(
    @Inject(PlatformStateStore)
    private readonly stateStore: PlatformStateStore,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  getSnapshot(kind: unknown, query: unknown) {
    this.authorization.requireStaffPermission("reports:read");
    const parsedKind = parseInput(ReportKindParamSchema, { kind });
    const queryObject =
      query && typeof query === "object" && !Array.isArray(query)
        ? (query as Record<string, unknown>)
        : {};
    const parsedQuery = parseInput(ReportQuerySchema, {
      kind: parsedKind.kind,
      ...queryObject,
    });
    const snapshot = this.stateStore.buildReportSnapshot(
      parsedKind.kind,
      this.requestContext.requireContext().request_id,
      {
        from: parsedQuery.from,
        to: parsedQuery.to,
      },
    );

    return ReportSnapshotSchema.parse(snapshot);
  }

  exportSnapshot(kind: unknown, query: unknown) {
    const snapshot = this.getSnapshot(kind, query);
    const csv = this.toCsv(snapshot.kind, snapshot.metrics);
    return ReportExportResponseSchema.parse({
      request_id: snapshot.request_id,
      kind: snapshot.kind,
      generated_at: snapshot.generated_at,
      filename: `report-${snapshot.kind}-${snapshot.generated_at.slice(0, 10)}.csv`,
      content_type: "text/csv",
      csv,
    });
  }

  private toCsv(
    kind: z.infer<typeof ReportKindSchema>,
    metrics: z.infer<typeof ReportSnapshotSchema>["metrics"],
  ): string {
    const header = "kind,key,label,value,unit";
    const rows = metrics.map((metric) =>
      [
        kind,
        this.escapeCsv(metric.key),
        this.escapeCsv(metric.label),
        String(metric.value),
        this.escapeCsv(metric.unit ?? ""),
      ].join(","),
    );
    return [header, ...rows].join("\n");
  }

  private escapeCsv(value: string): string {
    if (/[,"\n]/.test(value)) {
      return `"${value.replaceAll('"', '""')}"`;
    }
    return value;
  }
}
