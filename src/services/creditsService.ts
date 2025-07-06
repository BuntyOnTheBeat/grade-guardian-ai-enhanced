import { supabase } from '@/integrations/supabase/client';

export interface CreditBatch {
  id: string;
  credits: number;
  used_credits: number;
  expires_at: string;
  subscription_type: 'free' | 'student' | 'pro' | 'student_yearly' | 'pro_yearly';
  created_at: string;
}

export interface CreditUsage {
  id: string;
  credits_used: number;
  assignment_name: string;
  created_at: string;
}

/**
 * Initialize credits for new users
 */
export const initializeUserCredits = async (
  userId: string,
  credits: number = 1,
  subscriptionType: 'free' | 'student' | 'pro' | 'student_yearly' | 'pro_yearly' = 'free'
): Promise<void> => {
  try {
    // Check if user already has credits
    const { data: existingBatches } = await supabase
      .from('credit_batches')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (existingBatches && existingBatches.length > 0) {
      console.log('User already has credits, skipping initialization');
      return;
    }

    // Add initial credit for new user (expires in 30 days)
    await addCredits(userId, credits, subscriptionType, 30);
    console.log(`Initialized ${credits} credit for user ${userId} (expires in 30 days)`);
  } catch (error) {
    console.error('Error initializing user credits:', error);
  }
};

/**
 * Deduct credits for an assignment analysis
 */
export const deductCredits = async (
  userId: string,
  creditsToDeduct: number,
  assignmentName: string,
  assignmentId?: string
): Promise<boolean> => {
  try {
    // Call the database function to handle credit deduction
    const { data, error } = await supabase.rpc('deduct_credits', {
      p_user_id: userId,
      p_credits_to_deduct: creditsToDeduct,
      p_assignment_name: assignmentName,
      p_assignment_id: assignmentId
    });

    if (error) {
      console.error('Error deducting credits:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error deducting credits:', error);
    return false;
  }
};

/**
 * Add credits to user account (for purchases/subscriptions)
 */
export const addCredits = async (
  userId: string,
  credits: number,
  subscriptionType: 'free' | 'student' | 'pro' | 'student_yearly' | 'pro_yearly' = 'free',
  expiryDays?: number
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc('add_credits', {
      p_user_id: userId,
      p_credits: credits,
      p_subscription_type: subscriptionType,
      p_expiry_days: expiryDays
    });

    if (error) {
      console.error('Error adding credits:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error adding credits:', error);
    return null;
  }
};

/**
 * Get user's credit batches
 */
export const getCreditBatches = async (userId: string): Promise<CreditBatch[]> => {
  try {
    const { data, error } = await supabase
      .from('credit_batches')
      .select('*')
      .eq('user_id', userId)
      .order('expires_at', { ascending: true });

    if (error) {
      console.error('Error fetching credit batches:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching credit batches:', error);
    return [];
  }
};

/**
 * Get user's credit usage history
 */
export const getCreditUsage = async (userId: string, limit: number = 10): Promise<CreditUsage[]> => {
  try {
    const { data, error } = await supabase
      .from('credit_usage')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching credit usage:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching credit usage:', error);
    return [];
  }
};

/**
 * Get user's total remaining credits
 */
export const getRemainingCredits = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('credit_batches')
      .select('credits, used_credits')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error fetching remaining credits:', error);
      return 0;
    }

    if (!data) {
      return 0;
    }

    const remaining = data.reduce((total, batch) => {
      return total + (batch.credits - batch.used_credits);
    }, 0);

    return remaining;
  } catch (error) {
    console.error('Error calculating remaining credits:', error);
    return 0;
  }
};

/**
 * Check if user has enough credits for an operation
 */
export const hasEnoughCredits = async (userId: string, requiredCredits: number): Promise<boolean> => {
  const remainingCredits = await getRemainingCredits(userId);
  return remainingCredits >= requiredCredits;
};

/**
 * Add credits based on plan type (helper function)
 */
export const addPlanCredits = async (
  userId: string,
  planType: 'student_monthly' | 'student_yearly' | 'pro_monthly' | 'pro_yearly'
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc('add_plan_credits', {
      p_user_id: userId,
      p_plan_type: planType
    });

    if (error) {
      console.error('Error adding plan credits:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error adding plan credits:', error);
    return null;
  }
};

/**
 * Get credits required for different operations
 */
export const getCreditCost = (operation: 'text_analysis' | 'image_analysis' | 'image_ocr' | 'detailed_feedback'): number => {
  switch (operation) {
    case 'text_analysis':
      return 3; // Base cost for text analysis
    case 'image_analysis':
      return 3; // Cost for Pro image analysis with GPT-4 Vision
    case 'image_ocr':
      return 3; // Cost for basic OCR image analysis for Free/Student users
    case 'detailed_feedback':
      return 2; // Additional cost for detailed feedback
    default:
      return 1;
  }
}; 