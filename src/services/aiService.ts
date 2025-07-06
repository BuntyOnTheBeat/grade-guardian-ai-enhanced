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

// Extract text from file for analysis
const extractTextFromFile = async (file: File): Promise<string> => {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  console.log('📄 Extracting text from file:', { 
    name: file.name, 
    type: fileType, 
    size: file.size 
  });

  // Handle text files only for now (PDF support coming soon)
  if (fileType.includes('text') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
      reader.onerror = () => reject(new Error('Failed to read text file'));
    reader.readAsText(file);
  });
  }

  // Handle PDF files - temporarily unsupported
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    throw new Error('PDF files are temporarily not supported due to technical limitations. Please convert your PDF to a .txt file and upload that instead. We\'re working on restoring PDF support soon!');
  }

  // Handle Word documents (.docx)
  if (fileType.includes('word') || fileType.includes('document') || fileName.endsWith('.docx')) {
    throw new Error('DOCX files are not yet supported. Please convert to TXT format.');
  }

  throw new Error(`Unsupported file type: ${fileType}. Please use TXT files only for now.`);
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

// Basic OCR using GPT-4o for text extraction from images
const extractTextFromImage = async (file: File, apiKey: string): Promise<string> => {
  try {
    const base64Image = await fileToBase64(file);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o", // Use GPT-4o which has vision capabilities for OCR
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
                  url: `data:${file.type};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`OCR failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content || 'No text could be extracted from the image.';
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw new Error('Failed to extract text from image. Please try uploading a clearer image or a text file.');
  }
};

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
  console.log('🚀 analyzeHomework function called - CACHE BUSTER v2.0:', {
    timestamp: new Date().toISOString(),
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    useGPT4Vision,
    hasRubric: !!rubric,
    assignmentWeight
  });
  
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please add VITE_OPENAI_API_KEY to your .env file and restart the development server.');
  }

  if (!apiKey.startsWith('sk-')) {
    throw new Error('Invalid OpenAI API key format. Make sure your API key starts with "sk-".');
  }

  // Import credits service functions
  const { hasEnoughCredits, getCreditCost, deductCredits } = await import('./creditsService');

  // Check if user has enough credits before analysis
  if (userId) {
    const isImageFile = file.type.startsWith('image/');
    let operation: 'text_analysis' | 'image_analysis' | 'image_ocr' = 'text_analysis';
    
    if (isImageFile) {
      operation = useGPT4Vision ? 'image_analysis' : 'image_ocr';
    }
    
    const requiredCredits = getCreditCost(operation);

    const hasCredits = await hasEnoughCredits(userId, requiredCredits);
    if (!hasCredits) {
      throw new Error(`Insufficient credits. This analysis requires ${requiredCredits} credits.`);
    }
  }

  const isImageFile = file.type.startsWith('image/');
  
  try {
    let content: string;
    let messages: any[];
    let wasTruncated = false; // Track if content was truncated

    if (isImageFile && useGPT4Vision) {
      // Handle image files with GPT-4o Vision
      const base64Image = await fileToBase64(file);
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
                url: `data:${file.type};base64,${base64Image}`
              }
            }
          ]
        }
      ];
    } else {
      // Handle text files (and free-tier images after OCR)
      const isOcrText = isImageFile && !useGPT4Vision;
      if (isOcrText) {
        content = await extractTextFromImage(file, apiKey);
      } else {
      content = await extractTextFromFile(file);
      }
      
      // Apply intelligent truncation to prevent token limit errors
      const truncatedContent = truncateTextForAnalysis(content);
      wasTruncated = content !== truncatedContent;
      
      console.log('Content analysis:', {
        originalChars: content.length,
        originalTokens: countTokens(content),
        finalChars: truncatedContent.length,
        finalTokens: countTokens(truncatedContent),
        wasTruncated
      });
      
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
    }

    // Determine model based on user type and content
    const modelToUse = (useGPT4Vision && isImageFile) ? "gpt-4o" : "gpt-3.5-turbo";
    
    console.log('Making OpenAI API call:', {
      model: modelToUse,
      messageCount: messages.length,
      hasRubric: !!rubric,
      isImageFile,
      useGPT4Vision,
      isOCR: isImageFile && !useGPT4Vision,
      assignmentWeight
    });



    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelToUse,
        messages,
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    console.log('OpenAI API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // Log token usage information
    console.log('OpenAI API response data:', {
      usage: data.usage,
      model: data.model,
      responseLength: data.choices[0]?.message?.content?.length || 0
    });
    
    const aiResponse = data.choices[0].message.content;

    let result: AnalysisResult;

    try {
      const parsedResponse = JSON.parse(aiResponse);
      
      let ocrNote = '';
      if (isImageFile && !useGPT4Vision) {
        ocrNote = ' (Note: Text was extracted from image using OCR)';
      }
      
      const fallbackEditableText = isImageFile ? 
        'Editable text could not be generated for the image.' : 
        content; // Use original content, not truncated
        
      result = {
        feedback: (parsedResponse.feedback || []).map((item: FeedbackItem) => ({
          ...item,
          explanation: `${item.explanation}${ocrNote}`
        })),
        overallScore: parsedResponse.overallScore || 85,
        summary: `${ocrNote ? '[OCR Analysis] ' : ''}${wasTruncated ? '[Large Document - Truncated for Analysis] ' : ''}${parsedResponse.summary || 'Analysis completed'}`,
        editable_text: parsedResponse.editable_text || fallbackEditableText
      };
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', { parseError, aiResponse });
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
        summary: `${wasTruncated ? '[Large Document - Truncated for Analysis] ' : ''}${aiResponse.substring(0, 200)}...`,
        editable_text: isImageFile ? 'Could not generate editable text for image.' : content // Use original content
      };
    }

    // Deduct credits after successful analysis
    if (userId && assignmentName) {
      let operation: 'text_analysis' | 'image_analysis' | 'image_ocr' = 'text_analysis';
      
      if (isImageFile) {
        operation = useGPT4Vision ? 'image_analysis' : 'image_ocr';
      }
      
      const requiredCredits = getCreditCost(operation);
      
      const deductionSuccess = await deductCredits(userId, requiredCredits, assignmentName);
      if (!deductionSuccess) {
        console.warn('Failed to deduct credits after analysis');
      }
    }

    return result;

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    
    // Log detailed error information for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    
    // Re-throw the error instead of using fallback data
    // This ensures users know when the API call failed
    if (error instanceof Error) {
      throw new Error(`AI analysis failed: ${error.message}. Please check your API key and try again.`);
    } else {
      throw new Error('AI analysis failed. Please check your API key and try again.');
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
