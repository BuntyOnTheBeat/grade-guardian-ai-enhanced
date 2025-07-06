import { useState, useEffect } from 'react';
import { ArrowRight, BookOpen, Brain, CheckCircle, GraduationCap, Monitor, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Landing = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState('');

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Feedback",
      description: "Get instant, intelligent feedback using GPT-3.5 and OCR, with GPT-4 Vision available for Pro subscribers"
    },
    {
      icon: BookOpen,
      title: "Class Management",
      description: "Organize all your classes with custom backgrounds and teacher expectations"
    },
    {
      icon: CheckCircle,
      title: "Grade Tracking",
      description: "Track your current grades and see how new assignments will impact your overall score"
    },
    {
      icon: Monitor,
      title: "Easy File Upload",
      description: "Simply drag and drop your homework files (PDF, DOCX, TXT, images) for instant review"
    }
  ];

  const pricingPlans = [
    {
      name: "Student",
      type: "Monthly",
      price: "€6.99",
      period: "/month",
      rollover: "30-day rollover",
      paymentLink: "https://buy.stripe.com/fZueVd4NQakldJf6owebu03",
      features: [
        { text: "50 credits", included: true },
        { text: "AI feedback", included: true },
        { text: "Download", included: true }
      ],
      popular: false
    },
    {
      name: "Student",
      type: "Yearly",
      price: "€67.99",
      period: "/year",
      rollover: "365-day rollover",
      paymentLink: "https://buy.stripe.com/aFa4gzfsu5019sZ7sAebu02",
      features: [
        { text: "605 credits", included: true },
        { text: "AI feedback", included: true },
        { text: "Download", included: true }
      ],
      popular: false,
      savings: "Save 19%"
    },
    {
      name: "Pro",
      type: "Monthly",
      price: "€13.99",
      period: "/month",
      rollover: "90-day rollover",
      paymentLink: "https://buy.stripe.com/fZu6oH1BEeAB8oVbIQebu05",
      features: [
        { text: "150 credits", included: true },
        { text: "AI Feedback", included: true },
        { text: "Download", included: true },
        { text: "Reuploads", included: true }
      ],
      popular: false
    },
    {
      name: "Pro",
      type: "Yearly",
      price: "€134.99",
      period: "/year",
      rollover: "365-day rollover",
      paymentLink: "https://buy.stripe.com/fZu7sLdkmaklbB7dQYebu04",
      features: [
        { text: "605 credits", included: true },
        { text: "AI Feedback", included: true },
        { text: "Download", included: true },
        { text: "Reuploads", included: true }
      ],
      popular: false,
      savings: "Save 20%"
    }
  ];

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  }

  const handleGetStarted = () => {
    navigate('/auth');
  };

  // Check for saved plan selection when user returns from authentication
  useEffect(() => {
    if (user) {
      const savedPlan = localStorage.getItem('selectedPlan');
      if (savedPlan) {
        const planData = JSON.parse(savedPlan);
        localStorage.removeItem('selectedPlan'); // Clean up
        setLoading(planData.planName);
        // Small delay to show the loading state, then redirect
        setTimeout(() => {
          // Add user's email to prefill the Stripe checkout form
          const urlWithEmail = `${planData.paymentLink}?prefilled_email=${encodeURIComponent(user.email || '')}`;
          window.location.href = urlWithEmail;
        }, 500);
      }
    }
  }, [user]);

  const handleDirectCheckout = (paymentLink: string, planName: string) => {
    if (!user) {
      // Save the selected plan before redirecting to auth
      localStorage.setItem('selectedPlan', JSON.stringify({
        paymentLink,
        planName
      }));
      // If user is not logged in, redirect to auth with return URL
      navigate('/auth?redirect=/');
      return;
    }

    setLoading(planName);
    
    // Add user's email to prefill the Stripe checkout form
    const urlWithEmail = `${paymentLink}?prefilled_email=${encodeURIComponent(user.email || '')}`;
    
    // Redirect directly to Stripe payment link with prefilled email
    window.location.href = urlWithEmail;
  };

  const handleViewPlans = () => {
    document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Monitor className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">My HW Checker</span>
            </div>
            <div className="space-x-4">
              {user ? (
                <>
                  <Button onClick={handleGoToDashboard}>Go to Dashboard</Button>
                  <Button onClick={signOut} variant="secondary">Sign Out</Button>
                </>
              ) : (
                <>
                  <Button onClick={handleGetStarted}>Get Started</Button>
                  <Button onClick={handleViewPlans} variant="secondary">View Plans</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-6 bg-blue-100 text-blue-800 border-blue-200">
            AI-Powered Homework Assistant
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Perfect Your Homework
            <span className="text-blue-600 block">Before You Submit</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Get instant AI feedback, track your grades, and improve your academic performance. 
            My HW Checker helps students submit their best work every time.
          </p>
          <div className="flex justify-center items-center gap-4 mt-8">
            <button className="btn" onClick={() => navigate('/auth')}>
              <span>Start Checking Homework</span>
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Excel
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive tools designed to help students improve their homework quality and academic performance.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="text-center pb-4">
                  <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing-section" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that works best for your academic needs
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className="border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 relative"
              >
                {plan.savings && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500">
                    {plan.savings}
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  <div className="text-sm text-gray-500 mb-2">{plan.type}</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {plan.price}
                    <span className="text-lg font-normal text-gray-600">{plan.period}</span>
                  </div>
                    <div className="text-sm text-gray-500 mt-1">{plan.rollover}</div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        {feature.text}
                      </span>
                    </div>
                  ))}
                  <div className="pt-4">
                    <Button 
                      onClick={() => handleDirectCheckout(plan.paymentLink, `${plan.name}-${plan.type}`)}
                      className="w-full" 
                      disabled={loading === `${plan.name}-${plan.type}`}
                    >
                      {loading === `${plan.name}-${plan.type}` ? 'Redirecting...' : 'Continue'}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get better grades in three simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                1
              </div>
              <h3 className="text-2xl font-semibold mb-4">Upload Your Work</h3>
              <p className="text-gray-600">
                Simply drag and drop your homework files. Support for PDF, DOCX, TXT, and images.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                2
              </div>
              <h3 className="text-2xl font-semibold mb-4">Get AI Feedback</h3>
              <p className="text-gray-600">
                Our AI analyzes your work using GPT-3.5 and provides detailed feedback with explanations.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                3
              </div>
              <h3 className="text-2xl font-semibold mb-4">Improve & Submit</h3>
              <p className="text-gray-600">
                Make improvements based on detailed feedback and submit your best work with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <GraduationCap className="h-16 w-16 text-blue-200 mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Improve Your Grades?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join students who are already using AI to perfect their homework before submission.
          </p>
          {user ? (
          <Button 
            size="lg" 
              onClick={handleGoToDashboard}
            className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
          >
              Go to Dashboard
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          ) : (
            <button className="btn-white" onClick={handleGetStarted}>
              <span>Get Started for Free</span>
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Monitor className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold">My HW Checker</span>
          </div>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            Empowering students to submit their best work through AI-powered feedback and grade tracking.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
