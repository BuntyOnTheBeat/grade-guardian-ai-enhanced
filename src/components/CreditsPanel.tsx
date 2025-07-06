import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, Zap, Plus } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartConfig } from "@/components/ui/chart"
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import {
  getCreditBatches,
  getCreditUsage,
} from "@/services/creditsService";
import type { CreditUsage } from "@/services/creditsService";

interface CreditBatch {
  id: string;
  credits: number;
  used_credits: number;
  expires_at: string;
  subscription_type: 'free' | 'student' | 'pro' | 'student_yearly' | 'pro_yearly';
  created_at: string;
}

const CreditsPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [creditBatches, setCreditBatches] = useState<CreditBatch[]>([]);
  const [creditUsage, setCreditUsage] = useState<CreditUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const processUsageDataForChart = (usageData: CreditUsage[]) => {
    const usageByDay: { [key: string]: number } = {};
    usageData.forEach(usage => {
      const date = new Date(usage.created_at).toISOString().split('T')[0];
      if (!usageByDay[date]) {
        usageByDay[date] = 0;
      }
      usageByDay[date] += usage.credits_used;
    });

    const chartData = Object.entries(usageByDay).map(([date, credits]) => ({
      date,
      credits
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return chartData;
  }

  useEffect(() => {
    if (user) {
      fetchCreditsData();
    }
  }, [user]);

  const fetchCreditsData = async () => {
    if (!user) return;
    try {
      const [batches, usage] = await Promise.all([
        getCreditBatches(user.id),
        getCreditUsage(user.id, 100)
      ]);
      setCreditBatches(batches);
        setCreditUsage(usage || []);
    } catch (error) {
      console.error('Error fetching credits data:', error);
      toast({
        title: "Error",
        description: "Failed to load credits information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const activeBatches = creditBatches.filter(b => new Date(b.expires_at) > now);

  const getTotalCredits = () => {
    return activeBatches.reduce((total, batch) => total + batch.credits, 0);
  };

  const getTotalUsedCredits = () => {
    return activeBatches.reduce((total, batch) => total + batch.used_credits, 0);
  };

  const getRemainingCredits = () => {
    return activeBatches.reduce((total, batch) => total + (batch.credits - batch.used_credits), 0);
  };

  const getSubscriptionColor = (type: string) => {
    switch (type) {
      case 'pro': 
      case 'pro_yearly': 
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'student': 
      case 'student_yearly': 
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default: 
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getSubscriptionLabel = (type: string) => {
    switch (type) {
      case 'pro': return 'Pro Monthly';
      case 'pro_yearly': return 'Pro Yearly';
      case 'student': return 'Student Monthly';
      case 'student_yearly': return 'Student Yearly';
      default: return 'Free';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0); // Don't show negative days
  };

  const getExpiryColor = (days: number) => {
    if (days <= 7) return 'text-red-600';
    if (days <= 30) return 'text-orange-600';
    return 'text-green-600';
  };

  const chartData = processUsageDataForChart(creditUsage);
  const chartConfig = {
    credits: { label: "Credits", color: "#2563eb" },
  } satisfies ChartConfig;

  const totalCredits = getTotalCredits();
  const totalUsedCredits = getTotalUsedCredits();
  const remainingCredits = getRemainingCredits();

  const nextToExpire = activeBatches
    .filter(b => (b.credits - b.used_credits) > 0)
    .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime())[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Usage Graph */}
      <Card>
        <CardHeader>
          <CardTitle>Usage History</CardTitle>
          <CardDescription>
            Credits used in the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="credits" fill="var(--color-credits)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Credit History (Billing Periods) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Credit History
            <Button size="sm" variant="outline" onClick={() => navigate('/checkout')}>
              <Plus className="h-4 w-4 mr-2" />
              Buy More Credits
            </Button>
          </CardTitle>
          <CardDescription>
            Overview of your purchased and granted credit packages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeBatches.length > 0 ? (
            <div className="space-y-4">
              {activeBatches.map((batch) => {
                const daysUntilExpiry = getDaysUntilExpiry(batch.expires_at);
                const remainingInBatch = batch.credits - batch.used_credits;
                
                return (
                  <div key={batch.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant="outline" 
                          className={getSubscriptionColor(batch.subscription_type)}
                        >
                          {getSubscriptionLabel(batch.subscription_type)}
                        </Badge>
                        <span className="font-medium">{batch.credits} Credits</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {remainingInBatch} remaining
                        </p>
                        <p className="text-xs text-gray-500">
                          {batch.used_credits} used
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Usage</span>
                        <span>{((batch.used_credits / batch.credits) * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={(batch.used_credits / batch.credits) * 100} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          Purchased: {formatDate(batch.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className={`font-medium ${getExpiryColor(daysUntilExpiry)}`}>
                          {daysUntilExpiry > 0 
                            ? `Expires in ${daysUntilExpiry} days`
                            : 'Expired'
                          }
                        </span>
                      </div>
                    </div>

                    {daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded p-3">
                        <p className="text-sm text-orange-800">
                          ⚠️ These credits expire soon! Use them before {formatDate(batch.expires_at)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Credits Found</h3>
              <p className="text-gray-600 mb-4">You don't have any active credit packages.</p>
              <Button onClick={() => navigate('/checkout')}>
                <Plus className="h-4 w-4 mr-2" />
                Purchase Credits
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Credit Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between font-medium">
              <span>Remaining Credits</span>
              <span className="text-green-600">{remainingCredits} / {totalCredits}</span>
            </div>
            <Progress value={totalCredits > 0 ? (remainingCredits / totalCredits) * 100 : 0} className="h-3" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
                  <div>
                <p className="font-medium text-gray-600">Total</p>
                <p className="font-bold">{totalCredits}</p>
                  </div>
              <Separator orientation="vertical" className="h-8" />
              <div>
                <p className="font-medium text-gray-600">Used</p>
                <p className="font-bold">{totalUsedCredits}</p>
                </div>
            </div>
            {nextToExpire && (
              <div className="text-right">
                <p className="font-medium text-orange-600">Next Expiration</p>
                <p className="text-gray-600">
                  {nextToExpire.credits - nextToExpire.used_credits} credits expire in {getDaysUntilExpiry(nextToExpire.expires_at)} days
                </p>
            </div>
          )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditsPanel; 