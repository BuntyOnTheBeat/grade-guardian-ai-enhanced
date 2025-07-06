import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, X, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface TextOrFileInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
  accept?: string;
}

const TextOrFileInput = ({ 
  id, 
  label, 
  value, 
  onChange, 
  placeholder, 
  rows = 6,
  accept = ".pdf,.doc,.docx,.txt"
}: TextOrFileInputProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const { toast } = useToast();

  // Extract text from file
  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve(text);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      // For text files, read as text
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        // For other files, we'll read as text and hope for the best
        // In a real app, you'd want to use libraries like pdf-parse for PDFs
        reader.readAsText(file);
      }
    });
  };

  // Token estimation utility
  const estimateTokens = (text: string) => Math.ceil(text.length / 4);

  const getTokenStatus = (tokens: number) => {
    if (tokens < 100000) return { color: 'green', icon: '🟢', msg: 'Perfect!' };
    if (tokens < 180000) return { color: 'yellow', icon: '🟡', msg: 'Large, may take time' };
    if (tokens <= 200000) return { color: 'red', icon: '🔴', msg: 'Too big to process' };
    return { color: 'red', icon: '🔴', msg: 'Too big to process' };
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setUploadedFileName(file.name);

    try {
      const extractedText = await extractTextFromFile(file);
      const tokens = estimateTokens(extractedText);
      if (tokens > 200000) {
        toast({
          title: 'File Too Large',
          description: 'Your file is too large to process right now. We recommend simplifying the text or splitting it into smaller parts (under ~150,000 characters) to ensure smooth analysis. The AI has a technical limit of about 200,000 tokens per request.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        setUploadedFileName(null);
        return;
      }
      onChange(extractedText);
      toast({
        title: "File Processed",
        description: `Text extracted from ${file.name}`,
      });
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "File Processing Error",
        description: "Could not extract text from file. Please try a .txt file or type the content manually.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    // Reset the input
    e.target.value = '';
  };

  const clearContent = () => {
    onChange('');
    setUploadedFileName(null);
  };

  // Calculate tokens for traffic light/progress
  const tokens = estimateTokens(value);
  const status = getTokenStatus(tokens);
  const progressValue = Math.min((tokens / 200000) * 100, 100);

  return (
    <div className="space-y-3">
      <Label htmlFor={id}>{label}</Label>
      
      {/* File Upload Area */}
      <Card 
        className={`border-2 border-dashed transition-colors ${
          isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-4">
          <div className="text-center">
            <div className="flex justify-center space-x-2 mb-3">
              <Upload className="h-8 w-8 text-gray-400" />
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Drag and drop a file here, or click to browse
            </p>
            <div className="flex justify-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(`${id}-file`)?.click()}
                disabled={isProcessing}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Browse Files
              </Button>
              {(value || uploadedFileName) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearContent}
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Supports: .txt, .pdf, .doc, .docx files
            </p>
            {isProcessing && (
              <div className="flex items-center justify-center mt-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm text-blue-600">Processing file...</span>
              </div>
            )}
            {uploadedFileName && !isProcessing && (
              <div className="flex items-center justify-center mt-3 text-sm text-green-600">
                <FileText className="h-4 w-4 mr-1" />
                <span>Loaded: {uploadedFileName}</span>
              </div>
            )}
          </div>
          <input
            id={`${id}-file`}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Text Area */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor={`${id}-text`} className="text-sm font-medium">
            Or type/paste content manually:
          </Label>
          {value && (
            <span className="text-xs text-gray-500">
              {value.length} characters
            </span>
          )}
        </div>
        <Textarea
          id={`${id}-text`}
          value={value}
          onChange={(e) => {
            const text = e.target.value;
            const tokens = estimateTokens(text);
            if (tokens > 200000) {
              toast({
                title: 'Text Too Large',
                description: 'Your text is too large to process right now. We recommend simplifying the text or splitting it into smaller parts (under ~150,000 characters) to ensure smooth analysis. The AI has a technical limit of about 200,000 tokens per request.',
                variant: 'destructive',
              });
              return;
            }
            onChange(text);
          }}
          placeholder={placeholder}
          rows={rows}
        />
        {/* Traffic light and progress bar */}
        <div className="flex items-center mt-2 space-x-2">
          <span style={{ fontSize: '1.5rem' }}>{status.icon}</span>
          <span className={`text-sm ${status.color === 'green' ? 'text-green-600' : status.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>{status.msg}</span>
          <span className="ml-2 text-xs text-gray-500">{tokens.toLocaleString()} tokens</span>
        </div>
        <Progress value={progressValue} className="mt-1" />
      </div>
    </div>
  );
};

export default TextOrFileInput; 