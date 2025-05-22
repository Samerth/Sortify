import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/components/OrganizationProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Package, Mail, CheckCircle, Clock, Bell, Calendar } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface HistoryItem {
  id: string;
  type: string;
  status: string;
  trackingNumber?: string;
  sender?: string;
  arrivedAt: string;
  deliveredAt?: string;
  notifiedAt?: string;
  recipient?: {
    firstName: string;
    lastName: string;
    unit?: string;
  };
}

export default function History() {
  const { currentOrganization } = useOrganization();
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    dateRange: "7", // Last 7 days
    search: "",
  });

  const getDateRange = () => {
    const today = new Date();
    const days = parseInt(filters.dateRange);
    if (days === 0) return {}; // All time
    
    return {
      dateFrom: startOfDay(subDays(today, days)),
      dateTo: endOfDay(today),
    };
  };

  const { data: historyItems = [], isLoading } = useQuery<HistoryItem[]>({
    queryKey: ["/api/mail-items", currentOrganization?.id, "history", filters],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.type) params.append("type", filters.type);
      if (filters.status) params.append("status", filters.status);
      
      const dateRange = getDateRange();
      if (dateRange.dateFrom) {
        params.append("dateFrom", dateRange.dateFrom.toISOString());
      }
      if (dateRange.dateTo) {
        params.append("dateTo", dateRange.dateTo.toISOString());
      }
      
      const response = await fetch(`/api/mail-items?${params}`, {
        headers: {
          "X-Organization-Id": currentOrganization!.id,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch history");
      return response.json();
    },
  });

  const handleExportReport = () => {
    // Create CSV content
    const headers = ["Date", "Type", "Recipient", "Sender", "Tracking", "Status", "Delivered"];
    const csvContent = [
      headers.join(","),
      ...filteredHistoryItems.map(item => [
        format(new Date(item.arrivedAt), "yyyy-MM-dd HH:mm"),
        item.type,
        item.recipient ? `${item.recipient.firstName} ${item.recipient.lastName}` : "Unknown",
        item.sender || "",
        item.trackingNumber || "",
        item.status,
        item.deliveredAt ? format(new Date(item.deliveredAt), "yyyy-MM-dd HH:mm") : "",
      ].join(","))
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mailroom-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredHistoryItems = historyItems.filter(item => {
    const searchLower = filters.search.toLowerCase();
    const recipientName = item.recipient 
      ? `${item.recipient.firstName} ${item.recipient.lastName}`.toLowerCase()
      : "";
    const sender = item.sender?.toLowerCase() || "";
    const tracking = item.trackingNumber?.toLowerCase() || "";
    
    return recipientName.includes(searchLower) || 
           sender.includes(searchLower) || 
           tracking.includes(searchLower);
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "notified":
        return <Bell className="w-4 h-4 text-blue-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "notified":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!currentOrganization) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Please select an organization to continue.</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">History</h1>
            <p className="text-gray-600">View complete audit trail of mailroom activities</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={handleExportReport} className="bg-primary hover:bg-primary-dark">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <label className="text-sm font-medium text-gray-900">Date Range:</label>
                <Select 
                  value={filters.dateRange} 
                  onValueChange={(value) => setFilters({...filters, dateRange: value})}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Today</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="0">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-900">Type:</label>
                <Select 
                  value={filters.type} 
                  onValueChange={(value) => setFilters({...filters, type: value})}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="package">Package</SelectItem>
                    <SelectItem value="letter">Letter</SelectItem>
                    <SelectItem value="certified_mail">Certified Mail</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-900">Status:</label>
                <Select 
                  value={filters.status} 
                  onValueChange={(value) => setFilters({...filters, status: value})}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="notified">Notified</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Input
                  placeholder="Search recipient, sender, or tracking number..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {filteredHistoryItems.length}
                  </p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Delivered</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {filteredHistoryItems.filter(item => item.status === "delivered").length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-1">
                    {filteredHistoryItems.filter(item => item.status === "pending").length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Delivery Rate</p>
                  <p className="text-3xl font-bold text-primary mt-1">
                    {filteredHistoryItems.length > 0 
                      ? Math.round((filteredHistoryItems.filter(item => item.status === "delivered").length / filteredHistoryItems.length) * 100)
                      : 0
                    }%
                  </p>
                </div>
                <Bell className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>Arrived</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Delivered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(10)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      </TableRow>
                    ))
                  ) : filteredHistoryItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No history found for the selected criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistoryItems
                      .sort((a, b) => new Date(b.arrivedAt).getTime() - new Date(a.arrivedAt).getTime())
                      .map((item) => (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                {item.type === "package" ? (
                                  <Package className="w-5 h-5 text-primary" />
                                ) : (
                                  <Mail className="w-5 h-5 text-primary" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {item.type === "package" ? "Package" : item.type === "letter" ? "Letter" : "Certified Mail"}
                                </p>
                                {item.trackingNumber && (
                                  <p className="text-sm text-gray-600">
                                    {item.trackingNumber}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.recipient ? (
                              <div>
                                <p className="font-medium text-gray-900">
                                  {item.recipient.firstName} {item.recipient.lastName}
                                </p>
                                {item.recipient.unit && (
                                  <p className="text-sm text-gray-600">{item.recipient.unit}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">Unknown</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="text-gray-900">{item.sender || "Unknown"}</p>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-gray-900">
                                {format(new Date(item.arrivedAt), "MMM dd, yyyy")}
                              </p>
                              <p className="text-sm text-gray-600">
                                {format(new Date(item.arrivedAt), "hh:mm a")}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(item.status)}
                              <Badge 
                                variant="secondary"
                                className={getStatusColor(item.status)}
                              >
                                {item.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.deliveredAt ? (
                              <div>
                                <p className="text-gray-900">
                                  {format(new Date(item.deliveredAt), "MMM dd, yyyy")}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {format(new Date(item.deliveredAt), "hh:mm a")}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
