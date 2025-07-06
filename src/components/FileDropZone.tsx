import { useState, useCallback } from 'react';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface FileDropZoneProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  accept: string;
  label: string;
  sublabel: string;
}

// Simple token estimation for UI feedback (actual counting happens in aiService)
const estimateTokens = (text: string) => {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const wordCount = cleanText.split(' ').length;
  const charCount = cleanText.length;
  const estimatedTokens = Math.ceil(wordCount * 0.75);
  const charBasedTokens = Math.ceil(charCount / 4);
  return Math.max(estimatedTokens, charBasedTokens);
};

const getTokenStatus = (tokens: number) => {
  if (tokens < 10000) return { color: 'green', icon: '🟢', msg: 'Perfect!' };
  if (tokens < 12000) return { color: 'yellow', icon: '🟡', msg: 'Large, will be optimized' };
  return { color: 'red', icon: '🔴', msg: 'Will be truncated for analysis' };
};

const FileDropZone = ({ onFileSelect, selectedFile, accept, label, sublabel }: FileDropZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{tokens: number, status: any} | null>(null);
  const { toast } = useToast();

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
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const fileType = file.type.toLowerCase();
      const fileName = file.name.toLowerCase();
      
      // Validate file type - only text files for now
      const isValidType = 
        fileType.includes('text') || fileName.endsWith('.txt') ||
        fileName.endsWith('.md');
        
      if (!isValidType) {
        toast({
          title: 'Unsupported File Type',
          description: 'Only text files (.txt, .md) are currently supported. PDF support is temporarily disabled due to technical issues and will be restored soon!',
          variant: 'destructive',
        });
        onFileSelect(null);
        return;
      }
      
      // Estimate tokens for text files (PDF parsing happens during analysis)
      if (fileType.includes('text') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          const tokens = estimateTokens(text);
          const status = getTokenStatus(tokens);
          setTokenInfo({ tokens, status });
          onFileSelect(file);
        };
        reader.readAsText(file);
      } else {
        // For PDFs, we can't estimate tokens until parsing, so just accept the file
        setTokenInfo(null);
        onFileSelect(file);
      }
    }
  };

  const removeFile = () => {
    onFileSelect(null);
  };

  return (
    <div className="w-full">
      {selectedFile ? (
        <>
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <File className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-800">{selectedFile.name}</span>
            <span className="text-xs text-green-600 ml-2">
              ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={removeFile}
            className="text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {/* Token indicator for text files */}
        {tokenInfo && (
          <div className="flex items-center mt-2 space-x-2">
            <span style={{ fontSize: '1.5rem' }}>{tokenInfo.status.icon}</span>
            <span className={`text-sm ${tokenInfo.status.color === 'green' ? 'text-green-600' : tokenInfo.status.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>{tokenInfo.status.msg}</span>
            <span className="ml-2 text-xs text-gray-500">{tokenInfo.tokens.toLocaleString()} tokens</span>
            <Progress value={Math.min((tokenInfo.tokens / 12000) * 100, 100)} className="w-1/2" />
          </div>
        )}
        {selectedFile && (!tokenInfo) && (
          <div className="mt-2 text-xs text-gray-500">Token estimation not available for this file type.</div>
        )}
        </>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
          <p className="text-xs text-gray-500 mb-4">{sublabel}</p>
          <input
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input">
            <Button variant="outline" className="cursor-pointer" asChild>
              <span>Choose File</span>
            </Button>
          </label>
        </div>
      )}
    </div>
  );
};

export default FileDropZone;
