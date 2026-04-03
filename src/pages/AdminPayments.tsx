import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Users, CreditCard, TrendingUp, RefreshCw, ArrowLeft, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  amount: number;
  currency: string;
  status: string;
  created: number;
  description: string | null;
}

interface Subscription {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  plan_amount: number;
  plan_interval: string;
  plan_currency: string;
  created: number;
}

interface Stats {
  total_revenue: number;
  paid_users: number;
  active_subscriptions: number;
  canceled_subscriptions: number;
  past_due_subscriptions: number;
  total_transactions: number;
}

export default function AdminPayments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subStatusFilter, setSubStatusFilter] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("admin-payments", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setPayments(data.payments || []);
      setSubscriptions(data.subscriptions || []);
      setStats(data.stats || null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load payment data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesSearch = !search || 
        (p.customer_email || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.customer_name || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [payments, search, statusFilter]);

  const filteredSubs = useMemo(() => {
    return subscriptions.filter(s => {
      const matchesSearch = !search ||
        (s.customer_email || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.customer_name || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = subStatusFilter === "all" || s.status === subStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, search, subStatusFilter]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "succeeded": return <Badge variant="success">Succeeded</Badge>;
      case "active": return <Badge variant="success">Active</Badge>;
      case "failed": return <Badge variant="destructive">Failed</Badge>;
      case "canceled": return <Badge variant="destructive">Canceled</Badge>;
      case "past_due": return <Badge className="bg-accent/10 text-accent border-transparent">Past Due</Badge>;
      case "pending": return <Badge variant="secondary">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (ts: number) => new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });

  const formatCurrency = (amount: number, currency = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Payment Dashboard</h1>
              <p className="text-sm text-muted-foreground">Track payments & subscriptions from Stripe</p>
            </div>
          </div>
          <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <DollarSign className="h-4 w-4" /> Total Revenue
                </div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.total_revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Users className="h-4 w-4" /> Paid Users
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.paid_users}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <CreditCard className="h-4 w-4" /> Active Subs
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.active_subscriptions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <TrendingUp className="h-4 w-4" /> Transactions
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.total_transactions}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {loading && !stats && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading payment data from Stripe...
          </div>
        )}

        {!loading && (
          <>
            {/* Search */}
            <div className="mb-4">
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <Tabs defaultValue="payments" className="space-y-4">
              <TabsList>
                <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
                <TabsTrigger value="subscriptions">Subscriptions ({subscriptions.length})</TabsTrigger>
              </TabsList>

              {/* Payments Tab */}
              <TabsContent value="payments" className="space-y-3">
                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="succeeded">Succeeded</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Card>
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                              No payments found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredPayments.map(p => (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium">{p.customer_name || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{p.customer_email || "—"}</TableCell>
                              <TableCell className="font-semibold">{formatCurrency(p.amount, p.currency)}</TableCell>
                              <TableCell>{statusBadge(p.status)}</TableCell>
                              <TableCell className="text-muted-foreground">{formatDate(p.created)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>

              {/* Subscriptions Tab */}
              <TabsContent value="subscriptions" className="space-y-3">
                <div className="flex items-center gap-2">
                  <Select value={subStatusFilter} onValueChange={setSubStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                      <SelectItem value="past_due">Past Due</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Card>
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Period End</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSubs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                              No subscriptions found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredSubs.map(s => (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">{s.customer_name || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{s.customer_email || "—"}</TableCell>
                              <TableCell>
                                {formatCurrency(s.plan_amount, s.plan_currency)}/{s.plan_interval}
                                {s.cancel_at_period_end && (
                                  <span className="ml-1 text-xs text-destructive">(canceling)</span>
                                )}
                              </TableCell>
                              <TableCell>{statusBadge(s.status)}</TableCell>
                              <TableCell className="text-muted-foreground">{formatDate(s.current_period_end)}</TableCell>
                              <TableCell className="text-muted-foreground">{formatDate(s.created)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </Layout>
  );
}
