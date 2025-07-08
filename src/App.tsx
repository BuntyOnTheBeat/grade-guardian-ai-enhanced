import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import SubmitWork from "./pages/SubmitWork";
import Feedback from "./pages/Feedback";
import AssignmentList from "./pages/AssignmentList";
import AssignmentFeedback from "./pages/AssignmentFeedback";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PaymentSuccess from "./pages/PaymentSuccess";
import AllAssignments from "./pages/AllAssignments";
import Checkout from "./pages/Checkout";
import { SpeedInsights } from "@vercel/speed-insights/react";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SpeedInsights />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/assignments" element={<ProtectedRoute><AllAssignments /></ProtectedRoute>} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/payment-success" element={
              <ProtectedRoute>
                <PaymentSuccess />
              </ProtectedRoute>
            } />
            <Route path="/class/:classId/submit" element={
              <ProtectedRoute>
                <SubmitWork />
              </ProtectedRoute>
            } />
            <Route path="/class/:classId/assignments" element={<ProtectedRoute><AssignmentList /></ProtectedRoute>} />
            <Route path="/class/:classId/assignment/:assignmentId/feedback" element={
              <ProtectedRoute>
                <AssignmentFeedback />
              </ProtectedRoute>
            } />
            <Route path="/class/:classId/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
