"use client";

import * as React from "react";
import Link from "next/link";
import {
  Upload,
  Palette,
  Layers,
  Sparkles,
  Send,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function EventOverviewPage({
  params,
}: {
  params: { eventId: string };
}) {
  const [event, setEvent] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`/api/events/${params.eventId}`)
      .then((res) => res.json())
      .then((data) => {
        setEvent(data.event);
        setLoading(false);
      });
  }, [params.eventId]);

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const basePath = `/events/${params.eventId}`;

  const pipelineSteps = [
    {
      title: "1. Upload Participants",
      description: "Import CSV or Excel list. Verify names, emails, and custom columns.",
      status: event.participantCount > 0 ? "completed" : "pending",
      badgeText: event.participantCount > 0 ? `${event.participantCount} Participants` : "Not uploaded",
      actionUrl: `${basePath}/upload`,
      actionLabel: event.participantCount > 0 ? "Manage List" : "Upload File",
      icon: Upload,
    },
    {
      title: "2. Design Certificate Template",
      description: "Upload background image or pick a preset. Drag-and-drop placeholder tags.",
      status: event.activeTemplate ? "completed" : "pending",
      badgeText: event.activeTemplate ? "Template Configured" : "No template yet",
      actionUrl: `${basePath}/template`,
      actionLabel: event.activeTemplate ? "Edit Template" : "Open Studio",
      icon: Palette,
    },
    {
      title: "3. Map Columns & Preview",
      description: "Review spreadsheet column mapping against template tags with sample preview.",
      status: event.participantCount > 0 && event.activeTemplate ? "ready" : "pending",
      badgeText: "Sample Preview",
      actionUrl: `${basePath}/mapping`,
      actionLabel: "Review Mapping",
      icon: Layers,
    },
    {
      title: "4. Bulk Generate Certificates",
      description: "Generate high-resolution PDFs and PNGs for all validated attendees.",
      status: event.certificateCount > 0 ? "completed" : "pending",
      badgeText: event.certificateCount > 0 ? `${event.certificateCount} Generated` : "0 Generated",
      actionUrl: `${basePath}/generate`,
      actionLabel: event.certificateCount > 0 ? "View Certificates" : "Start Generation",
      icon: Sparkles,
    },
    {
      title: "5. Deliver & Track",
      description: "Email personalized PDF certificates with exponential backoff and live status.",
      status: event.deliveryCount > 0 ? "completed" : "pending",
      badgeText: event.deliveryCount > 0 ? `${event.deliveryCount} Sent` : "0 Sent",
      actionUrl: `${basePath}/delivery`,
      actionLabel: "Delivery Console",
      icon: Send,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 p-8 text-white shadow-md">
        <div className="max-w-3xl">
          <Badge className="bg-white/20 text-white border-none mb-3">Event Workflow Pipeline</Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Generate and dispatch certificates in minutes
          </h2>
          <p className="mt-2 text-indigo-100 text-sm leading-relaxed">
            Follow the 5 simple steps below to upload participant details, position template tags, review sample previews, and automate personalized email delivery.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href={`${basePath}/upload`}>
              <Button size="sm" className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold gap-1.5 shadow-sm">
                Get Started with Step 1 <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">Workflow Checklist</h3>
        <div className="grid grid-cols-1 gap-4">
          {pipelineSteps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = step.status === "completed";

            return (
              <Card key={idx} className="hover:border-slate-300 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900 text-sm">{step.title}</h4>
                        <Badge
                          variant={
                            isCompleted
                              ? "success"
                              : step.status === "ready"
                              ? "info"
                              : "default"
                          }
                          className="text-[11px]"
                        >
                          {step.badgeText}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{step.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center self-end sm:self-center">
                    <Link href={step.actionUrl}>
                      <Button
                        variant={isCompleted ? "outline" : "primary"}
                        size="sm"
                        className="gap-1.5 whitespace-nowrap"
                      >
                        {step.actionLabel} <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
