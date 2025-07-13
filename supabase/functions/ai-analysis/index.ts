import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from "zod";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalysisRequest {
  content?: string;
  base64Image?: string;
  fileType?: string;
  rubric?: string;
  assignmentWeight?: number;
  useGPT4Vision?: boolean;
  isImageFile?: boolean;
  userId?: string;
  assignmentName?: string;
}

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

// Token counting function (same as frontend)
const countTokens = (text: string): number => {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const wordCount = cleanText.split(' ').length;
  const charCount = cleanText.length;
  
  const estimatedTokens = Math.ceil(wordCount * 0.75);
  const charBasedTokens = Math.ceil(charCount / 4);
  
  return Math.max(estimatedTokens, charBasedTokens);
};

// Smart text truncation function (same as frontend)
const truncateTextForAnalysis = (content: string, maxTokens: number = 12000): string => {
  const actualTokens = countTokens(content);
  
  if (actualTokens <= maxTokens) {
    return content;
  }
  
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
  
  return truncatedContent;
};

// Define your Zod schema for the request body
const RequestSchema = z.object({
  content: z.string().optional(),
  base64Image: z.string().optional(),
  fileType: z.string(),
  rubric: z.string().optional(),
  assignmentWeight: z.number().optional(),
  useGPT4Vision: z.boolean().optional(),
  isImageFile: z.boolean().optional(),
  userId: z.string().optional(),
  assignmentName: z.string().optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json();
    console.log("Received body:", JSON.stringify(body, null, 2));

    // Validate with Zod
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      console.error("Zod validation error:", parsed.error);
      return new Response(
        JSON.stringify({ error: "Invalid request body", details: parsed.error.errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user's JWT token
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      throw new Error('Invalid authorization token');
    }

    // Parse request body
    const requestData: AnalysisRequest = parsed.data;
    const {
      content,
      base64Image,
      fileType,
      rubric = '',
      assignmentWeight = 0,
      useGPT4Vision = false,
      isImageFile = false,
      userId,
      assignmentName
    } = requestData;

    // Validate required data
    if (!content && !base64Image) {
      throw new Error('Either content or base64Image must be provided');
    }

    // Check user credits before analysis
    if (userId) {
      let operation: 'text_analysis' | 'image_analysis' | 'image_ocr' = 'text_analysis';
      
      if (isImageFile) {
        operation = useGPT4Vision ? 'image_analysis' : 'image_ocr';
      }
      
      const requiredCredits = operation === 'text_analysis' ? 3 : 3; // All operations cost 3 credits
      
      // Check credits
      const { data: creditData } = await supabase
        .from('credit_batches')
        .select('credits, used_credits')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString());

      const remainingCredits = creditData?.reduce((total, batch) => {
        return total + (batch.credits - batch.used_credits);
      }, 0) || 0;

      if (remainingCredits < requiredCredits) {
        throw new Error(`Insufficient credits. This analysis requires ${requiredCredits} credits.`);
      }
    }

    // Handle OCR for images when not using GPT-4 Vision
    let processedContent = content;
    if (isImageFile && !useGPT4Vision && base64Image) {
      // First extract text using OCR, then analyze the text
      const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Please extract all visible text from this image. Return only the text content, preserving the original formatting as much as possible."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${fileType};base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0,
        }),
      });

      if (!ocrResponse.ok) {
        throw new Error(`OCR failed: ${ocrResponse.statusText}`);
      }

      const ocrData = await ocrResponse.json();
      processedContent = ocrData.choices[0].message.content || 'No text could be extracted from the image.';
    }

    // Prepare OpenAI API request
    let messages: any[];
    let modelToUse: string;

    if (isImageFile && useGPT4Vision && base64Image) {
      // Handle image files with GPT-4o Vision
      const prompt = `Please analyze this assignment submission image and provide detailed feedback. ${rubric ? `Use this rubric for evaluation: ${rubric}` : ''} ${assignmentWeight > 0 ? `This assignment is worth ${assignmentWeight}% of the total grade.` : ''}

Please provide feedback in the following JSON format:
{
  "overallScore": [number from 0-100],
  "summary": "[overall summary of the work]",
  "feedback": [
    {
      "type": "strength|improvement|suggestion",
      "title": "[brief title]",
      "description": "[detailed description]",
      "explanation": "[why this matters and how to improve]",
      "location": "[where in the document this applies - be specific, e.g., 'Paragraph 2, sentence 3']",
      "rubric_criteria": "[specific rubric criteria this addresses]",
      "original_text": "[exact text from the original if suggesting a change]",
      "suggested_text": "[suggested replacement text if applicable]"
    }
  ],
  "editable_text": "[Return the full original text, but with suggested edits enclosed in <<<original text>>> followed by +++suggested replacement+++. For example: 'This is an <<<inportant>>>+++important+++ point.' Be very specific about exact text to change.]"
}`;

      messages = [
        {
          role: "system",
          content: "You are an experienced teacher providing detailed feedback on student assignments. Analyze the work thoroughly and provide constructive feedback with specific examples and actionable suggestions. Return your response as valid JSON only."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${fileType};base64,${base64Image}`
              }
            }
          ]
        }
      ];
      modelToUse = "gpt-4o";
    } else {
      // Handle text content
      if (!processedContent) {
        throw new Error('Content is required for text analysis');
      }

      // Apply intelligent truncation
      const truncatedContent = truncateTextForAnalysis(processedContent);
      const wasTruncated = processedContent !== truncatedContent;
      
      const isOcrText = isImageFile && !useGPT4Vision;
      const prompt = `Please analyze this assignment submission and provide detailed feedback. ${isOcrText ? '(This assignment was extracted from an image using OCR, so be mindful of potential errors.)' : ''} ${wasTruncated ? '(Note: This document was truncated for analysis due to length, but the full content is preserved for grading.)' : ''} ${rubric ? `Use this rubric for evaluation: ${rubric}` : ''} ${assignmentWeight > 0 ? `This assignment is worth ${assignmentWeight}% of the total grade.` : ''}

IMPORTANT: For each feedback item, if you're suggesting a specific change to the text, include the exact original text and your suggested replacement. Be very specific about locations (e.g., "Paragraph 2, sentence 3" or "Introduction, line 5").

Assignment content:
${truncatedContent}

Please provide feedback in the following JSON format:
{
  "overallScore": [number from 0-100],
  "summary": "[overall summary of the work]",
  "feedback": [
    {
      "type": "strength|improvement|suggestion",
      "title": "[brief title]",
      "description": "[detailed description]",
      "explanation": "[why this matters and how to improve]",
      "location": "[where in the document this applies - be specific, e.g., 'Paragraph 2, sentence 3']",
      "rubric_criteria": "[specific rubric criteria this addresses]",
      "original_text": "[exact text from the original if suggesting a change]",
      "suggested_text": "[suggested replacement text if applicable]"
    }
  ],
  "editable_text": "[Return the full original text, but with suggested edits enclosed in <<<original text>>> followed by +++suggested replacement+++. For example: 'This is an <<<inportant>>>+++important+++ point.' Be very specific about exact text to change.]"
}`;

      messages = [
        {
          role: "system",
          content: "You are an experienced teacher providing detailed feedback on student assignments. Analyze the work thoroughly and provide constructive feedback with specific examples and actionable suggestions. Return your response as valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ];
      modelToUse = "gpt-3.5-turbo";
    }

    // Make OpenAI API call
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelToUse,
        messages,
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText} - ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0].message.content;

    // Parse AI response
    let result: AnalysisResult;

    try {
      const parsedResponse = JSON.parse(aiResponse);
      
      let ocrNote = '';
      if (isImageFile && !useGPT4Vision) {
        ocrNote = ' (Note: Text was extracted from image using OCR)';
      }
      
      const fallbackEditableText = isImageFile ? 
        'Editable text could not be generated for the image.' : 
        content || '';
        
      result = {
        feedback: (parsedResponse.feedback || []).map((item: FeedbackItem) => ({
          ...item,
          explanation: `${item.explanation}${ocrNote}`
        })),
        overallScore: parsedResponse.overallScore || 85,
        summary: `${ocrNote ? '[OCR Analysis] ' : ''}${parsedResponse.summary || 'Analysis completed'}`,
        editable_text: parsedResponse.editable_text || fallbackEditableText
      };
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback if JSON parsing fails
      const analysisType = isImageFile && !useGPT4Vision 
        ? 'OCR Analysis' 
        : (isImageFile ? 'AI Vision Analysis' : 'AI Feedback');

      result = {
        feedback: [
          {
            type: 'improvement' as const,
            title: analysisType,
            description: aiResponse,
            explanation: `Detailed feedback from AI analysis. The AI response was not in the expected format.`,
            location: 'Overall document'
          }
        ],
        overallScore: 85,
        summary: `${aiResponse.substring(0, 200)}...`,
        editable_text: isImageFile ? 'Could not generate editable text for image.' : content || ''
      };
    }

    // Deduct credits after successful analysis
    if (userId && assignmentName) {
      let operation: 'text_analysis' | 'image_analysis' | 'image_ocr' = 'text_analysis';
      
      if (isImageFile) {
        operation = useGPT4Vision ? 'image_analysis' : 'image_ocr';
      }
      
      const requiredCredits = 3; // All operations cost 3 credits
      
      // Call the deduct_credits function
      const { error: deductError } = await supabase.rpc('deduct_credits', {
        p_user_id: userId,
        p_credits_to_deduct: requiredCredits,
        p_assignment_name: assignmentName
      });

      if (deductError) {
        console.warn('Failed to deduct credits after analysis:', deductError);
      }
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in ai-analysis function:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
}) 