interface FeedbackItem {
  type: 'strength' | 'improvement' | 'suggestion';
  title: string;
  description: string;
  explanation: string;
  location?: string;
  rubric_criteria?: string;
  original_text?: string;
  suggested_text?: string;
}

interface AnalysisResult {
  feedback: FeedbackItem[];
  overallScore: number;
  summary: string;
  editable_text: string;
}

// Accurate token counting using OpenAI's approximation method
const countTokens = (text: string): number => {
  // OpenAI's recommended approximation: 1 token ≈ 4 characters for English
  // This is more accurate than our previous 1:4 ratio
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const wordCount = cleanText.split(' ').length;
  const charCount = cleanText.length;
  
  // Use a more sophisticated calculation:
  // - Average English word is ~4.7 characters + space = ~5.7 characters
  // - OpenAI tokens are roughly 0.75 words on average
  const estimatedTokens = Math.ceil(wordCount * 0.75);
  const charBasedTokens = Math.ceil(charCount / 4);
  
  // Use the higher estimate for safety
  return Math.max(estimatedTokens, charBasedTokens);
};

// Import the new file text extraction service
import { extractText } from './fileTextExtraction';

// Extract text from file for analysis - now supports .txt, .pdf, and .docx
const extractTextFromFile = async (file: File): Promise<string> => {
  return await extractText(file);
};

// Convert file to base64 for image analysis
const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]); // Remove data:image/...;base64, prefix
    };
    reader.onerror = () => reject(new Error('Failed to convert file to base64'));
    reader.readAsDataURL(file);
  });
};

// Note: OCR functionality moved to secure server-side Edge Function

// Smart text truncation to fit within GPT-3.5-turbo limits
const truncateTextForAnalysis = (content: string, maxTokens: number = 12000): string => {
  const actualTokens = countTokens(content);
  
  console.log('🔍 Token Analysis:', { 
    contentLength: content.length, 
    actualTokens, 
    maxTokens,
    needsTruncation: actualTokens > maxTokens 
  });
  
  if (actualTokens <= maxTokens) {
    console.log('✅ Content within token limits, no truncation needed');
    return content;
  }
  
  console.log('⚠️ Content exceeds token limit, applying smart truncation...');
  
  // Binary search to find the right truncation point
  let truncatedContent = content;
  let low = 0;
  let high = content.length;
  
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const firstPortion = Math.floor(mid * 0.7);
    const lastPortion = Math.floor(mid * 0.3);
    
    const beginning = content.substring(0, firstPortion);
    const ending = content.substring(content.length - lastPortion);
    const truncationNotice = `\n\n[TRUNCATED: Document was ${content.length} characters (${actualTokens} tokens). Showing first and last portions for analysis.]\n\n`;
    
    const testContent = beginning + truncationNotice + ending;
    const testTokens = countTokens(testContent);
    
    if (testTokens <= maxTokens) {
      truncatedContent = testContent;
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  
  const finalTokens = countTokens(truncatedContent);
  
  console.log('✂️ Smart truncation complete:', {
    originalChars: content.length,
    originalTokens: actualTokens,
    finalChars: truncatedContent.length,
    finalTokens,
    reduction: Math.round((1 - finalTokens/actualTokens) * 100) + '%'
  });
  
  return truncatedContent;
};

export const analyzeHomework = async (
  file: File, 
  rubric: string = '', 
  assignmentWeight: number = 0,
  useGPT4Vision: boolean = false,
  userId?: string,
  assignmentName?: string
): Promise<AnalysisResult> => {
  console.log('🚀 analyzeHomework function called - SECURE SERVER-SIDE v3.0:', {
    timestamp: new Date().toISOString(),
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    useGPT4Vision,
    hasRubric: !!rubric,
    assignmentWeight
  });
  
  // Import Supabase client for authentication
  const { supabase } = await import('@/integrations/supabase/client');

  // Get current user session for authentication
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Authentication required. Please log in to use AI analysis.');
  }

  const isImageFile = file.type.startsWith('image/');
  
  try {
    let content: string | undefined;
    let base64Image: string | undefined;

    if (isImageFile && useGPT4Vision) {
      // Handle image files with GPT-4o Vision
      base64Image = await fileToBase64(file);
    } else if (isImageFile && !useGPT4Vision) {
      // Handle images with OCR - we'll need to extract text using a basic OCR function
      // For now, we'll send the image to the server and let it handle OCR
      base64Image = await fileToBase64(file);
    } else {
      // Handle text files
      content = await extractTextFromFile(file);
    }

    console.log('Calling secure AI analysis Edge Function:', {
      hasContent: !!content,
      hasBase64Image: !!base64Image,
      isImageFile,
      useGPT4Vision,
      hasRubric: !!rubric,
      assignmentWeight
    });

    // Call the secure Edge Function
    const { data, error } = await supabase.functions.invoke('ai-analysis', {
      body: {
        content,
        base64Image,
        fileType: file.type,
        rubric,
        assignmentWeight,
        useGPT4Vision,
        isImageFile,
        userId,
        assignmentName
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Edge Function error:', error);
      throw new Error(`AI analysis failed: ${error.message || 'Unknown server error'}`);
    }

    if (!data) {
      throw new Error('No response from AI analysis service');
    }

    console.log('✅ AI analysis completed successfully');
    return data as AnalysisResult;

  } catch (error) {
    console.error('Error in AI analysis:', error);
    
    // Log detailed error information for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    
    // Re-throw the error with a user-friendly message
    if (error instanceof Error) {
      throw new Error(`AI analysis failed: ${error.message}`);
    } else {
      throw new Error('AI analysis failed. Please try again.');
    }
  }
};

export const generateDetailedFeedback = (basicFeedback: string) => {
  // Convert basic feedback to detailed format
  return [
    {
      type: 'improvement' as const,
      title: 'Grammar and Mechanics',
      description: basicFeedback,
      explanation: 'Proper grammar and mechanics ensure your ideas are communicated clearly and professionally.',
      location: 'Various locations'
    }
  ];
};

