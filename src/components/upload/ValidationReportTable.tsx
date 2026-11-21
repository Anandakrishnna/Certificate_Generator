"use client";

import * as React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Check,
  Columns,
  Crown,
  User,
  Users,
  Mail,
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
  onRemapColumns: (
    nameCol: string,
    emailCol: string,
    isTeamMode?: boolean
  ) => void;
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
  const isTeamMode = Boolean(report.isTeamMode);

  React.useEffect(() => {
    setRows(report.rows);
    setSelectedNameCol(report.detectedColumns.nameColumn);
    setSelectedEmailCol(report.detectedColumns.emailColumn);
  }, [report]);

  // Handle re-mapping columns
  const handleNameColChange = (col: string) => {
    setSelectedNameCol(col);
    onRemapColumns(col, selectedEmailCol, isTeamMode);
  };

  const handleEmailColChange = (col: string) => {
    setSelectedEmailCol(col);
    onRemapColumns(selectedNameCol, col, isTeamMode);
  };

  const handleToggleMode = (teamModeTarget: boolean) => {
    if (teamModeTarget === isTeamMode) return;
    onRemapColumns(selectedNameCol, selectedEmailCol, teamModeTarget);
  };

  // Inline editing of cells
  const handleCellEdit = (id: string, field: "name" | "email", val: string) => {
    const updated = rows.map((r) => {
      if (r.id !== id) return r;
      const newRow = { ...r, [field]: val };

      const errorReasons: string[] = [];
      const trimmedName = newRow.name.trim();
      const trimmedEmail = newRow.email.trim();
      const isMember = r.isLeader === false;
      const leaderEmail = (r.leaderEmail || "").trim();
      const leaderEmailValid = Boolean(leaderEmail && RFC_EMAIL_REGEX.test(leaderEmail));

      if (!trimmedName) errorReasons.push("Participant name cannot be empty");

      let deliveredToLeader = r.deliveredToLeader || false;
      let recipientEmail = trimmedEmail;

      if (!trimmedEmail) {
        if (isMember && leaderEmailValid) {
          deliveredToLeader = true;
          recipientEmail = leaderEmail;
        } else {
          errorReasons.push("Email address cannot be empty");
        }
      } else if (!RFC_EMAIL_REGEX.test(trimmedEmail)) {
        if (isMember && leaderEmailValid) {
          deliveredToLeader = true;
          recipientEmail = leaderEmail;
          errorReasons.push("Invalid member email format; will route to team leader");
        } else {
          errorReasons.push("Invalid email format (RFC compliance error)");
        }
      } else {
        deliveredToLeader = false;
        recipientEmail = trimmedEmail;
      }

      // Duplicate check (only for individual emails, excluding blank member fallbacks)
      if (trimmedEmail && !deliveredToLeader) {
        const duplicateCount = rows.filter(
          (other) =>
            other.id !== id &&
            !other.deliveredToLeader &&
            other.email.trim().toLowerCase() === trimmedEmail.toLowerCase()
        ).length;

        if (duplicateCount > 0) {
          errorReasons.push("Duplicate email address detected in spreadsheet");
        }
      }

      let status: "valid" | "invalid" | "duplicate" = "valid";
      if (errorReasons.some((err) => err.includes("Duplicate"))) status = "duplicate";
      const fatalErrors = errorReasons.filter(
        (err) => !err.includes("Duplicate") && !err.includes("route to team leader")
      );
      if (fatalErrors.length > 0) status = "invalid";

      return {
        ...newRow,
        status,
        errorReasons,
        isExcluded: status !== "valid",
        deliveredToLeader,
        recipientEmail,
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
      if (!emailKey || r.status === "invalid" || r.deliveredToLeader) return r;

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
  const teamMemberCount = rows.filter((r) => r.deliveredToLeader).length;

  const allColumns = report.detectedColumns.allColumns || [
    report.detectedColumns.nameColumn,
    report.detectedColumns.emailColumn,
    ...report.detectedColumns.extraColumns,
  ];

  return (
    <div className="space-y-6">
      {/* Column Mapping & Mode Selector */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Columns className="h-4 w-4 text-indigo-400" />
            <h4 className="text-sm font-bold tracking-tight">Spreadsheet Parser & Mapping</h4>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
            <button
              type="button"
              onClick={() => handleToggleMode(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                !isTeamMode
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Standard Mode (1 per Row)
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isTeamMode
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Crown className="h-3.5 w-3.5 text-amber-300" />
              Team Mode - Option C (Leader Routing)
            </button>
          </div>
        </div>

        {/* Option C Banner */}
        {isTeamMode && (
          <div className="rounded-xl border border-indigo-400/30 bg-indigo-950/60 p-3.5 flex items-start gap-3 text-indigo-200">
            <Crown className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-white flex items-center gap-2">
                <span>Option C: Team Mode Active</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 font-medium">
                  Group Leader Email Fallback
                </span>
              </p>
              <p className="mt-1 text-indigo-200/90 leading-relaxed">
                Each team row in your spreadsheet was expanded into individual certificates for the <strong>Leader</strong> and <strong>Members</strong>.
                If any team member does not have their own email provided, their certificate will automatically be dispatched to the <strong>Team Leader's email</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Column Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-700/60">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>{isTeamMode ? "Leader Name Column:" : "Participant Name Column:"}</span>
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

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>{isTeamMode ? "Leader Email Column (Fallback):" : "Participant Email Column:"}</span>
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-4 bg-white shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Participants</div>
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
        {isTeamMode && (
          <Card className="p-4 bg-amber-50/50 border-amber-200 shadow-xs">
            <div className="text-xs text-amber-800 font-medium flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-amber-600" /> Routes to Leader
            </div>
            <div className="text-2xl font-bold text-amber-800 mt-1">
              {teamMemberCount}
            </div>
          </Card>
        )}
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
              filter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({rows.length})
          </button>
          <button
            onClick={() => setFilter("valid")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              filter === "valid" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Ready ({validAndIncludedCount})
          </button>
          <button
            onClick={() => setFilter("flagged")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              filter === "flagged" ? "bg-white text-rose-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Flagged ({invalidCount + duplicateCount})
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {duplicateCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleKeepFirstDuplicate}
              className="text-xs gap-1 border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              Keep 1st Duplicate
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
                <th className="py-3 px-4 min-w-[200px]">Participant Name</th>
                <th className="py-3 px-4 min-w-[260px]">Delivery Email Address</th>
                <th className="py-3 px-4 min-w-[140px]">Team & Metadata</th>
                <th className="py-3 px-4 w-32">Status</th>
                <th className="py-3 px-4 min-w-[200px]">Routing & Notes</th>
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
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {r.teamName && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium border border-indigo-200">
                            👥 {r.teamName}
                          </span>
                        )}
                        {r.isLeader && (
                          <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-semibold border border-amber-200">
                            👑 Team Leader
                          </span>
                        )}
                        {r.isLeader === false && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-200">
                            👤 Team Member
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2 px-4">
                      {r.deliveredToLeader ? (
                        <div className="space-y-1">
                          <div className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span>
                              Routes to Leader: <strong>{r.recipientEmail || r.leaderEmail}</strong>
                            </span>
                          </div>
                          <input
                            type="email"
                            value={r.email}
                            onChange={(e) => handleCellEdit(r.id, "email", e.target.value)}
                            placeholder="Optional: enter direct email"
                            className="w-full px-2.5 py-0.5 text-[11px] rounded border border-dashed border-slate-300 bg-white/80 focus:border-indigo-500 text-slate-600"
                          />
                        </div>
                      ) : (
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
                      )}
                    </td>

                    <td className="py-2.5 px-4">
                      {Object.keys(r.extraFields).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(r.extraFields)
                            .filter(([k]) => !["teamName", "leaderName", "leaderEmail", "role", "recipientEmail", "memberEmail"].includes(k))
                            .map(([k, v]) => (
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
                      ) : r.deliveredToLeader ? (
                        <span className="text-amber-700 font-medium text-[11px] flex items-center gap-1">
                          <Check className="h-3 w-3 text-emerald-600" /> Will deliver to Leader ({r.recipientEmail || r.leaderEmail})
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium text-[11px] flex items-center gap-1">
                          <Check className="h-3 w-3" /> Ready for direct send
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
