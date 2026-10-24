"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Building,
  Upload,
  Palette,
  Layers,
  Sparkles,
  Send,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const steps = [
  { id: "overview", label: "Overview", icon: Layers, pathSuffix: "" },
  { id: "upload", label: "1. Upload Data", icon: Upload, pathSuffix: "/upload" },
  { id: "template", label: "2. Design Template", icon: Palette, pathSuffix: "/template" },
  { id: "mapping", label: "3. Map Fields", icon: Layers, pathSuffix: "/mapping" },
  { id: "generate", label: "4. Generate", icon: Sparkles, pathSuffix: "/generate" },
  { id: "delivery", label: "5. Deliver & Track", icon: Send, pathSuffix: "/delivery" },
];

export default function EventWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { eventId: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [event, setEvent] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`/api/events/${params.eventId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Event not found");
        return res.json();
      })
      .then((data) => {
        setEvent(data.event);
        setLoading(false);
      })
      .catch(() => {
        router.push("/dashboard");
      });
  }, [params.eventId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const basePath = `/events/${params.eventId}`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Event Header Banner */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">{event.name}</h1>
                <Badge variant="info">{event.organizerName}</Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(event.eventDate).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span>•</span>
                <span>{event.participantCount} Participants</span>
                <span>•</span>
                <span>{event.certificateCount} Generated</span>
                <span>•</span>
                <span>{event.deliveryCount} Sent</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Step Navigation Bar */}
        <div className="border-t border-slate-100 bg-slate-50/50">
          <div className="max-w-6xl mx-auto px-6 flex items-center space-x-2 overflow-x-auto py-2">
            {steps.map((step) => {
              const targetUrl = `${basePath}${step.pathSuffix}`;
              const isActive =
                step.id === "overview"
                  ? pathname === basePath
                  : pathname.startsWith(targetUrl);

              const Icon = step.icon;

              return (
                <Link key={step.id} href={targetUrl}>
                  <div
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-xs font-semibold"
                        : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{step.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Workspace Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
