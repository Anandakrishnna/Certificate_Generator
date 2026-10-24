"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  Plus,
  LogOut,
  Calendar,
  Users,
  Send,
  Sparkles,
  Trash2,
  ArrowRight,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<{ name: string; email: string } | null>(null);
  const [events, setEvents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [creatingDemo, setCreatingDemo] = React.useState(false);

  const handleCreateDemoEvent = async () => {
    setCreatingDemo(true);
    try {
      const res = await fetch("/api/events/demo", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.eventId) {
        router.push(`/events/${data.eventId}`);
      }
    } finally {
      setCreatingDemo(false);
    }
  };

  const fetchDashboardData = React.useCallback(async () => {
    try {
      const [userRes, eventsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/events"),
      ]);

      if (!userRes.ok) throw new Error("Unauthorized");
      const userData = await userRes.json();
      setUser(userData.user);

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.events || []);
      }
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (!confirm(`Are you sure you want to delete "${eventName}"? All participant records and certificates will be removed.`)) {
      return;
    }

    setDeletingId(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const totalCertificates = events.reduce((sum, e) => sum + (e.certificateCount || 0), 0);
  const totalDeliveries = events.reduce((sum, e) => sum + (e.deliveryCount || 0), 0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Award className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">CertifyFlow</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-900">{user?.name}</div>
              <div className="text-xs text-slate-500">{user?.email}</div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5 text-slate-600">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Events & Certificates</h1>
            <p className="text-sm text-slate-500 mt-1">Manage events, upload participant sheets, and track delivery status.</p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={handleCreateDemoEvent}
              isLoading={creatingDemo}
              className="gap-1.5 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Load Demo Event</span>
            </Button>
            <Link href="/events/new">
              <Button className="shadow-sm shadow-indigo-200 gap-1.5">
                <Plus className="h-4 w-4" /> Create New Event
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-indigo-50/60 to-white shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-indigo-600">
                <CardDescription>Total Events</CardDescription>
                <Calendar className="h-4 w-4" />
              </div>
              <CardTitle className="text-3xl font-extrabold text-indigo-700">{events.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50/60 to-white shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-emerald-600">
                <CardDescription>Certificates Generated</CardDescription>
                <Sparkles className="h-4 w-4" />
              </div>
              <CardTitle className="text-3xl font-extrabold text-emerald-700">{totalCertificates}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50/60 to-white shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-amber-600">
                <CardDescription>Emails Delivered</CardDescription>
                <Send className="h-4 w-4" />
              </div>
              <CardTitle className="text-3xl font-extrabold text-amber-700">{totalDeliveries}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Events Section */}
        {events.length === 0 ? (
          <Card className="text-center py-16 px-6 border-dashed border-2 border-slate-200 bg-white">
            <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No events created yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6 leading-relaxed">
              Get started by creating your first event, uploading a participant list, and designing your certificate template.
            </p>
            <Link href="/events/new">
              <Button size="sm" className="gap-1.5 shadow-sm">
                <Plus className="h-4 w-4" /> Create First Event
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Active Events ({events.length})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((evt) => (
                <Card key={evt.id} className="hover:border-indigo-300 transition-all flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-snug">{evt.name}</h3>
                        <Badge variant="info" className="mt-1 text-[11px]">{evt.organizerName}</Badge>
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(evt.id, evt.name)}
                        disabled={deletingId === evt.id}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                        title="Delete Event"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {evt.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-2">{evt.description}</p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 border-t border-slate-100 pt-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(evt.eventDate).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {evt.participantCount} Participants
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Sparkles className="h-3.5 w-3.5 text-slate-400" />
                        {evt.certificateCount} Generated
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Created {new Date(evt.createdAt).toLocaleDateString()}
                    </span>
                    <Link href={`/events/${evt.id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                        Open Workspace <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
