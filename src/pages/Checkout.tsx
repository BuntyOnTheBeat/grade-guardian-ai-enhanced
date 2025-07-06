import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle } from 'lucide-react';

const pricingPlans = [
  {
    name: 'Student',
    type: 'Monthly',
    price: '€6.99',
    period: '/month',
    paymentLink: 'https://buy.stripe.com/fZueVd4NQakldJf6owebu03',
    features: ['50 credits', '30-day rollover', 'AI feedback', 'Download'],
    popular: false,
  },
  {
    name: 'Student',
    type: 'Yearly',
    price: '€67.99',
    period: '/year',
    paymentLink: 'https://buy.stripe.com/aFa4gzfsu5019sZ7sAebu02',
    features: ['605 credits', '365-day rollover', 'AI feedback', 'Download'],
    popular: false,
    savings: 'Save 19%',
  },
  {
    name: 'Pro',
    type: 'Monthly',
    price: '€13.99',
    period: '/month',
    paymentLink: 'https://buy.stripe.com/fZu6oH1BEeAB8oVbIQebu05',
    features: ['150 credits', '90-day rollover', 'GPT-4 Vision', 'Re-uploads'],
    popular: false,
  },
  {
    name: 'Pro',
    type: 'Yearly',
    price: '€134.99',
    period: '/year',
    paymentLink: 'https://buy.stripe.com/fZu7sLdkmaklbB7dQYebu04',
    features: ['605 credits', '365-day rollover', 'GPT-4 Vision', 'Re-uploads'],
    popular: false,
    savings: 'Save 20%',
  },
];

const Checkout = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState('');

  const handleCheckout = (paymentLink: string, planName: string) => {
    if (!user) {
      // Redirect to auth page if not logged in
      window.location.href = '/auth';
      return;
    }

    setLoading(planName);
    
    // Add user's email to prefill the Stripe checkout form
    const urlWithEmail = `${paymentLink}?prefilled_email=${encodeURIComponent(user.email || '')}`;
    
    // Redirect directly to Stripe payment link with prefilled email
    window.location.href = urlWithEmail;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600">Select the plan that works best for your academic needs</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricingPlans.map((plan) => (
            <Card 
              key={`${plan.name}-${plan.type}`} 
              className="shadow-lg relative"
            >
              {plan.savings && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500">
                  {plan.savings}
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="text-sm text-gray-500 mb-2">{plan.type}</div>
                <div className="text-3xl font-bold">
                  {plan.price}
                  <span className="text-lg font-normal text-gray-600">{plan.period}</span>
                </div>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  onClick={() => handleCheckout(plan.paymentLink, `${plan.name}-${plan.type}`)}
                  className="w-full"
                  disabled={loading === `${plan.name}-${plan.type}`}
                >
                  {loading === `${plan.name}-${plan.type}` ? 'Redirecting...' : `Choose ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>All plans include AI-powered feedback and secure payment processing.</p>
          <p>Cancel anytime. No hidden fees.</p>
        </div>
      </div>
    </div>
  );
};

export default Checkout; 