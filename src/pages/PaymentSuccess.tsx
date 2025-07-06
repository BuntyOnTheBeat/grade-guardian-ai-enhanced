import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple success page - Stripe webhooks will handle credit allocation
    // For now, just show success message
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white shadow-lg rounded-lg max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-3xl font-bold mb-2">Processing Your Payment</h1>
          <p className="text-gray-600">Please wait while we confirm your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white shadow-lg rounded-lg max-w-md">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-gray-600 mb-2">Thank you for your subscription!</p>
        <p className="text-sm text-gray-500 mb-6">
          Your credits will be available shortly. You can start using Grade Guardian right away.
        </p>
        
        <div className="space-y-3">
          <Button onClick={() => navigate('/dashboard')} className="w-full">
            Go to Dashboard
          </Button>
          <Button 
            onClick={() => navigate('/submit-work')} 
            variant="outline" 
            className="w-full"
          >
            Submit Your First Assignment
          </Button>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          If you don't see your credits within 5 minutes, please contact support.
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess; 