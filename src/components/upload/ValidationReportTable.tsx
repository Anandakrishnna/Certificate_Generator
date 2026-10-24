"use client";

import * as React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Check,
  Filter,
  Columns,
  Table,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ValidatedParticipantRow,
  ValidationReport,
  RFC_EMAIL_REGEX,
} from "@/lib/parser/validator";

interface ValidationReportTableProps {
  report: ValidationReport;
  onRowsUpdated: (updatedRows: ValidatedParticipantRow[]) => void;
  onRemapColumns: (nameCol: string, emailCol: string) => void;
  onConfirm: () => void;
  isSaving?: boolean;
}

export function ValidationReportTable({
  report,
  onRowsUpdated,
  onRemapColumns,
  onConfirm,
  isSaving,
}: ValidationReportTableProps) {
  const [rows, setRows] = React.useState<ValidatedParticipantRow[]>(report.rows);
  const [filter, setFilter] = React.useState<"all" | "flagged" | "valid">("all");
  const [selectedNameCol, setSelectedNameCol] = React.useState<string>(
    report.detectedColumns.nameColumn
  );
  const [selectedEmailCol, setSelectedEmailCol] = React.useState<string>(
    report.detectedColumns.emailColumn
  );

  React.useEffect(() => {
    setRows(report.rows);
    setSelectedNameCol(report.detectedColumns.nameColumn);
    setSelectedEmailCol(report.detectedColumns.emailColumn);
  }, [report]);

  // Handle re-mapping columns
  const handleNameColChange = (col: string) => {
    setSelectedNameCol(col);
    onRemapColumns(col, selectedEmailCol);
  };

  const handleEmailColChange = (col: string) => {
    setSelectedEmailCol(col);
    onRemapColumns(selectedNameCol, col);
  };

  // Inline editing of cells
  const handleCellEdit = (id: string, field: "name" | "email", val: string) => {
    const updated = rows.map((r) => {
      if (r.id !== id) return r;
      const newRow = { ...r, [field]: val };

      const errorReasons: string[] = [];
      const trimmedName = newRow.name.trim();
      const trimmedEmail = newRow.email.trim();

      if (!trimmedName) errorReasons.push("Participant name cannot be empty");
      if (!trimmedEmail) {
        errorReasons.push("Email address cannot be empty");
      } else if (!RFC_EMAIL_REGEX.test(trimmedEmail)) {
        errorReasons.push("Invalid email format (RFC compliance error)");
      }

      const duplicateCount = rows.filter(
        (other) =>
          other.id !== id &&
          other.email.trim().toLowerCase() === trimmedEmail.toLowerCase()
      ).length;

      if (duplicateCount > 0) {
        errorReasons.push("Duplicate email address detected in spreadsheet");
      }

      let status: "valid" | "invalid" | "duplicate" = "valid";
      if (errorReasons.some((r) => r.includes("Duplicate"))) status = "duplicate";
      if (errorReasons.some((r) => !r.includes("Duplicate"))) status = "invalid";

      return {
        ...newRow,
        status,
        errorReasons,
        isExcluded: status !== "valid",
      };
    });

    setRows(updated);
    onRowsUpdated(updated);
  };

  const handleToggleExclude = (id: string) => {
    const updated = rows.map((r) =>
      r.id === id ? { ...r, isExcluded: !r.isExcluded } : r
    );
    setRows(updated);
    onRowsUpdated(updated);
  };

  const handleKeepFirstDuplicate = () => {
    const seen = new Set<string>();
    const updated = rows.map((r) => {
      const emailKey = r.email.trim().toLowerCase();
      if (!emailKey || r.status === "invalid") return r;

      if (!seen.has(emailKey)) {
        seen.add(emailKey);
        return {
          ...r,
          status: "valid" as const,
          errorReasons: r.errorReasons.filter((err) => !err.includes("Duplicate")),
          isExcluded: false,
        };
      } else {
        return {
          ...r,
          isExcluded: true,
        };
      }
    });

    setRows(updated);
    onRowsUpdated(updated);
  };

  const handleExcludeAllFlagged = () => {
    const updated = rows.map((r) => ({
      ...r,
      isExcluded: r.status !== "valid" ? true : r.isExcluded,
    }));
    setRows(updated);
    onRowsUpdated(updated);
  };

  // Filtered rows
  const filteredRows = rows.filter((r) => {
    if (filter === "flagged") return r.status !== "valid" || r.isExcluded;
    if (filter === "valid") return r.status === "valid" && !r.isExcluded;
    return true;
  });

  const validAndIncludedCount = rows.filter((r) => !r.isExcluded && r.status === "valid").length;
  const invalidCount = rows.filter((r) => r.status === "invalid").length;
  const duplicateCount = rows.filter((r) => r.status === "duplicate").length;

  const allColumns = report.detectedColumns.allColumns || [
    report.detectedColumns.nameColumn,
    report.detectedColumns.emailColumn,
    ...report.detectedColumns.extraColumns,
  ];

  return (
    <div className="space-y-6">
      {/* Column Mapping Selector (Accepts any arbitrary spreadsheet format!) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Columns className="h-4 w-4 text-indigo-400" />
            <h4 className="text-sm font-bold tracking-tight">Spreadsheet Column Mapping</h4>
          </div>
          <span className="text-xs text-indigo-200">
            Detected {allColumns.length} columns in file. You can change which column maps to Name or Email below.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-700/60">
          {/* Name Column Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>Map Participant Name to Column:</span>
              <Badge variant="info" className="text-[10px] bg-indigo-500/30 text-indigo-200 border-indigo-400">
                Primary
              </Badge>
            </label>
            <select
              value={selectedNameCol}
              onChange={(e) => handleNameColChange(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-700 bg-slate-800 text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {allColumns.map((col) => (
                <option key={col} value={col}>
                  {col} {col === report.detectedColumns.nameColumn ? "(Auto-Detected)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Email Column Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>Map Participant Email to Column:</span>
              <Badge variant="info" className="text-[10px] bg-indigo-500/30 text-indigo-200 border-indigo-400">
                Primary
              </Badge>
            </label>
            <select
              value={selectedEmailCol}
              onChange={(e) => handleEmailColChange(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-700 bg-slate-800 text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {allColumns.map((col) => (
                <option key={col} value={col}>
                  {col} {col === report.detectedColumns.emailColumn ? "(Auto-Detected)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Rows</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{rows.length}</div>
        </Card>
        <Card className="p-4 bg-emerald-50/50 border-emerald-200 shadow-xs">
          <div className="text-xs text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Ready to Save
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {validAndIncludedCount}
          </div>
        </Card>
        <Card className="p-4 bg-rose-50/50 border-rose-200 shadow-xs">
          <div className="text-xs text-rose-700 font-medium flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> Invalid Format
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{invalidCount}</div>
        </Card>
        <Card className="p-4 bg-amber-50/50 border-amber-200 shadow-xs">
          <div className="text-xs text-amber-700 font-medium flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Duplicates
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{duplicateCount}</div>
        </Card>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* Filters */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              filter === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({rows.length})
          </button>
          <button
            onClick={() => setFilter("flagged")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              filter === "flagged"
                ? "bg-white text-rose-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Needs Attention ({invalidCount + duplicateCount})
          </button>
          <button
            onClick={() => setFilter("valid")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              filter === "valid"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Valid Only ({validAndIncludedCount})
          </button>
        </div>

        {/* Quick Batch Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {duplicateCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleKeepFirstDuplicate}
              className="text-xs gap-1 border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              <Check className="h-3.5 w-3.5" /> Keep First of Duplicates
            </Button>
          )}
          {(invalidCount > 0 || duplicateCount > 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExcludeAllFlagged}
              className="text-xs gap-1 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Exclude All Flagged
            </Button>
          )}
          <Button
            size="sm"
            onClick={onConfirm}
            isLoading={isSaving}
            disabled={validAndIncludedCount === 0}
            className="gap-1.5 shadow-sm shadow-indigo-200"
          >
            Confirm & Save ({validAndIncludedCount} Participants) →
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Include</th>
                <th className="py-3 px-4 w-16">Row</th>
                <th className="py-3 px-4 min-w-[200px]">Name (Column: {selectedNameCol})</th>
                <th className="py-3 px-4 min-w-[240px]">Email (Column: {selectedEmailCol})</th>
                <th className="py-3 px-4 min-w-[140px]">Extra Data</th>
                <th className="py-3 px-4 w-32">Status</th>
                <th className="py-3 px-4 min-w-[200px]">Notes / Issues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((r) => {
                const isInvalid = r.status === "invalid";
                const isDuplicate = r.status === "duplicate";

                return (
                  <tr
                    key={r.id}
                    className={`transition-colors ${
                      r.isExcluded
                        ? "bg-slate-50/70 opacity-60"
                        : isInvalid
                        ? "bg-rose-50/30"
                        : isDuplicate
                        ? "bg-amber-50/30"
                        : "hover:bg-slate-50/60"
                    }`}
                  >
                    <td className="py-2.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={!r.isExcluded}
                        onChange={() => handleToggleExclude(r.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>

                    <td className="py-2.5 px-4 font-mono text-slate-400">
                      #{r.rowNumber}
                    </td>

                    <td className="py-2 px-4">
                      <input
                        type="text"
                        value={r.name}
                        onChange={(e) => handleCellEdit(r.id, "name", e.target.value)}
                        placeholder="Enter full name"
                        className={`w-full px-2.5 py-1 text-xs rounded border transition-colors ${
                          !r.name.trim()
                            ? "border-rose-400 bg-rose-50 focus:border-rose-600"
                            : "border-slate-200 focus:border-indigo-500 bg-transparent"
                        }`}
                      />
                    </td>

                    <td className="py-2 px-4">
                      <input
                        type="email"
                        value={r.email}
                        onChange={(e) => handleCellEdit(r.id, "email", e.target.value)}
                        placeholder="email@example.com"
                        className={`w-full px-2.5 py-1 text-xs rounded border transition-colors ${
                          !r.email.trim() || !RFC_EMAIL_REGEX.test(r.email.trim())
                            ? "border-rose-400 bg-rose-50 focus:border-rose-600"
                            : "border-slate-200 focus:border-indigo-500 bg-transparent"
                        }`}
                      />
                    </td>

                    <td className="py-2.5 px-4">
                      {Object.keys(r.extraFields).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(r.extraFields).map(([k, v]) => (
                            <span
                              key={k}
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600"
                              title={`${k}: ${v}`}
                            >
                              {k}: {String(v)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4">
                      {r.isExcluded ? (
                        <Badge variant="outline" className="text-[10px]">Excluded</Badge>
                      ) : isInvalid ? (
                        <Badge variant="danger" className="text-[10px]">Invalid</Badge>
                      ) : isDuplicate ? (
                        <Badge variant="warning" className="text-[10px]">Duplicate</Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px]">Valid</Badge>
                      )}
                    </td>

                    <td className="py-2.5 px-4">
                      {r.errorReasons.length > 0 ? (
                        <div className="space-y-0.5">
                          {r.errorReasons.map((reason, idx) => (
                            <p
                              key={idx}
                              className={`text-[11px] font-medium ${
                                reason.includes("Duplicate")
                                  ? "text-amber-700"
                                  : "text-rose-600"
                              }`}
                            >
                              • {reason}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <span className="text-emerald-600 font-medium text-[11px] flex items-center gap-1">
                          <Check className="h-3 w-3" /> Ready
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
