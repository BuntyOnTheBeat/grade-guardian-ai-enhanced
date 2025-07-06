// @ts-ignore - mammoth doesn't have official types
import mammoth from 'mammoth';
// @ts-ignore - using any for pdf.js types
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Supported file types for text extraction
 */
export const SUPPORTED_FILE_TYPES = {
  TEXT: ['text/plain', '.txt'],
  PDF: ['application/pdf', '.pdf'],
  DOCX: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.docx'
  ]
} as const;

/**
 * Get file type category from MIME type or file extension
 */
export const getFileTypeCategory = (mimeType: string, fileName: string): string | null => {
  const lowerMimeType = mimeType.toLowerCase();
  const lowerFileName = fileName.toLowerCase();

  // Check text files
  if (SUPPORTED_FILE_TYPES.TEXT.some(type => 
    lowerMimeType.includes(type) || lowerFileName.endsWith(type)
  )) {
    return 'text';
  }

  // Check PDF files
  if (SUPPORTED_FILE_TYPES.PDF.some(type => 
    lowerMimeType.includes(type) || lowerFileName.endsWith(type)
  )) {
    return 'pdf';
  }

  // Check DOCX files
  if (SUPPORTED_FILE_TYPES.DOCX.some(type => 
    lowerMimeType.includes(type) || lowerFileName.endsWith(type)
  )) {
    return 'docx';
  }

  return null;
};

/**
 * Extract text from .txt files
 */
const extractTextFromTxt = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        resolve(text);
      } else {
        reject(new Error('Failed to read text file content'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading text file'));
    };
    
    reader.readAsText(file, 'UTF-8');
  });
};

/**
 * Extract text from .pdf files using PDF.js
 */
const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine all text items from the page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF. The file may be corrupted, password-protected, or contain only images.');
  }
};

/**
 * Extract text from .docx files using mammoth
 */
const extractTextFromDocx = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Use mammoth to extract raw text (no formatting)
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (result.text) {
      return result.text;
    } else {
      throw new Error('No text content found in the document');
    }
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error('Failed to extract text from DOCX file. The file may be corrupted or in an unsupported format.');
  }
};

/**
 * Main function to extract text from supported file types
 * @param file - The file to extract text from
 * @returns Promise<string> - The extracted text content
 */
export const extractText = async (file: File): Promise<string> => {
  const fileType = getFileTypeCategory(file.type, file.name);
  
  if (!fileType) {
    throw new Error(
      `Unsupported file type: ${file.type || 'unknown'}. ` +
      `Supported formats: .txt, .pdf, .docx`
    );
  }

  console.log(`📄 Extracting text from ${fileType.toUpperCase()} file:`, {
    name: file.name,
    type: file.type,
    size: file.size,
    category: fileType
  });

  try {
    let extractedText: string;

    switch (fileType) {
      case 'text':
        extractedText = await extractTextFromTxt(file);
        break;
      case 'pdf':
        extractedText = await extractTextFromPdf(file);
        break;
      case 'docx':
        extractedText = await extractTextFromDocx(file);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Basic validation
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text content could be extracted from the file');
    }

    console.log(`✅ Successfully extracted ${extractedText.length} characters from ${file.name}`);
    return extractedText.trim();

  } catch (error) {
    console.error(`❌ Failed to extract text from ${file.name}:`, error);
    throw error;
  }
};

/**
 * Check if a file type is supported
 */
export const isFileTypeSupported = (mimeType: string, fileName: string): boolean => {
  return getFileTypeCategory(mimeType, fileName) !== null;
};

/**
 * Get list of supported file extensions for UI display
 */
export const getSupportedExtensions = (): string[] => {
  return [
    ...SUPPORTED_FILE_TYPES.TEXT.filter(type => type.startsWith('.')),
    ...SUPPORTED_FILE_TYPES.PDF.filter(type => type.startsWith('.')),
    ...SUPPORTED_FILE_TYPES.DOCX.filter(type => type.startsWith('.'))
  ];
};

/**
 * Get accept attribute value for file input
 */
export const getFileInputAccept = (): string => {
  return getSupportedExtensions().join(',');
}; 