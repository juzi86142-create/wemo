import { describe, expect, it } from "vitest";

import { adminRecords } from "./admin-fixtures";
import { getAdminEditorState } from "./admin-editor-state";

describe("admin editor state", () => {
  it("derives editable values from the selected record", () => {
    const firstRecord = adminRecords.products[0]!;
    const secondRecord = adminRecords.products[1]!;
    const first = getAdminEditorState(firstRecord);
    const second = getAdminEditorState(secondRecord);

    expect(first).toEqual({ title: firstRecord.title, summary: firstRecord.detail });
    expect(second).toEqual({ title: secondRecord.title, summary: secondRecord.detail });
    expect(second).not.toEqual(first);
  });
});
