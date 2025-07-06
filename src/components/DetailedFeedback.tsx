import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Download, Info, FileText } from 'lucide-react';
import { generatePDFReport, downloadEditableText } from '@/services/pdfService';

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

interface DetailedFeedbackProps {
  feedback: FeedbackItem[];
  assignmentName: string;
  fileName?: string;
  editableText?: string;
  originalText?: string;
  rubricCriteria?: string;
}

const DetailedFeedback = ({ feedback, assignmentName, fileName, editableText, originalText, rubricCriteria }: DetailedFeedbackProps) => {
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    setGeneratingPDF(true);
    try {
      await generatePDFReport({
        assignmentName,
        fileName: fileName || 'assignment',
        feedback,
        originalText,
        editableText,
        rubricCriteria,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleDownloadText = () => {
    if (fileName && editableText) {
      downloadEditableText(fileName, editableText);
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'strength': return 'bg-green-100 text-green-800 border border-green-200';
      case 'improvement': return 'bg-red-100 text-red-800 border border-red-200';
      case 'suggestion': return 'bg-blue-100 text-blue-800 border border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'strength': return '✓';
      case 'improvement': return '⚠';
      case 'suggestion': return '💡';
      default: return '•';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">
            <FileText className="h-5 w-5 mr-2" />
            Detailed AI Analysis
          </CardTitle>
          <div className="flex items-center space-x-2">
          <Button 
            onClick={handleDownloadPDF} 
            disabled={generatingPDF}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {generatingPDF ? 'Generating...' : 'Download PDF Report'}
          </Button>
            {editableText && fileName && (
              <Button onClick={handleDownloadText} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Edited Text
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strengths Section */}
        <div>
          <h3 className="text-lg font-semibold text-green-700 mb-3 flex items-center">
            <span className="mr-2">✓</span>
            Strengths
          </h3>
          <div className="space-y-2">
            {feedback.filter(item => item.type === 'strength').map((item, index) => (
              <HoverCard key={`strength-${index}`}>
                <HoverCardTrigger asChild>
                  <div className="flex items-start p-3 bg-green-50 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors">
                    <div className="h-2 w-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 font-medium">{item.description}</p>
                      {item.location && (
                        <p className="text-xs text-green-600 mt-1">📍 {item.location}</p>
                      )}
                    </div>
                    <Info className="h-4 w-4 text-green-600 ml-2 flex-shrink-0" />
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 p-4" side="top">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">Strength</Badge>
                      <h4 className="font-semibold text-green-700">{item.title}</h4>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.explanation}</p>
                    {item.rubric_criteria && (
                      <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                        <h5 className="text-xs font-semibold text-amber-800 mb-1">Rubric Criteria Met:</h5>
                        <p className="text-xs text-amber-700">{item.rubric_criteria}</p>
                      </div>
                    )}
                    {item.original_text && item.suggested_text && (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                        <h5 className="text-xs font-semibold text-blue-800 mb-1">Text Example:</h5>
                        <div className="space-y-1">
                          <div className="bg-red-100 p-1 rounded text-xs">
                            <span className="font-medium text-red-600">Original:</span> {item.original_text}
                          </div>
                          <div className="bg-green-100 p-1 rounded text-xs">
                            <span className="font-medium text-green-600">Good:</span> {item.suggested_text}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="mt-3 p-2 bg-green-50 rounded text-xs text-green-700">
                      💡 Keep building on this foundation in future work!
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>
        </div>

        {/* Improvements Section */}
        <div>
          <h3 className="text-lg font-semibold text-orange-700 mb-3 flex items-center">
            <span className="mr-2">⚠</span>
            Areas to Improve
          </h3>
          <div className="space-y-2">
            {feedback.filter(item => item.type === 'improvement').map((item, index) => (
              <HoverCard key={`improvement-${index}`}>
                <HoverCardTrigger asChild>
                  <div className="flex items-start p-3 bg-orange-50 rounded-lg border border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors">
                    <div className="h-2 w-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 font-medium">{item.description}</p>
                      {item.location && (
                        <p className="text-xs text-orange-600 mt-1">📍 {item.location}</p>
                      )}
                    </div>
                    <Info className="h-4 w-4 text-orange-600 ml-2 flex-shrink-0" />
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 p-4" side="top">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-orange-100 text-orange-800">Needs Improvement</Badge>
                      <h4 className="font-semibold text-orange-700">{item.title}</h4>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.explanation}</p>
                    {item.rubric_criteria && (
                      <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                        <h5 className="text-xs font-semibold text-amber-800 mb-1">Rubric Criteria to Address:</h5>
                        <p className="text-xs text-amber-700">{item.rubric_criteria}</p>
                      </div>
                    )}
                    {item.original_text && item.suggested_text && (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                        <h5 className="text-xs font-semibold text-blue-800 mb-1">Suggested Change:</h5>
                        <div className="space-y-1">
                          <div className="bg-red-100 p-1 rounded text-xs">
                            <span className="font-medium text-red-600">Current:</span> {item.original_text}
                          </div>
                          <div className="bg-green-100 p-1 rounded text-xs">
                            <span className="font-medium text-green-600">Improved:</span> {item.suggested_text}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="mt-3 p-2 bg-orange-50 rounded text-xs text-orange-700">
                      🎯 Focus on this area in your next revision for better results!
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>
        </div>

        {/* Suggestions Section */}
        {feedback.filter(item => item.type === 'suggestion').length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-blue-700 mb-3 flex items-center">
              <span className="mr-2">💡</span>
              Suggestions
            </h3>
            <div className="space-y-2">
              {feedback.filter(item => item.type === 'suggestion').map((item, index) => (
                <HoverCard key={`suggestion-${index}`}>
                  <HoverCardTrigger asChild>
                    <div className="flex items-start p-3 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
                      <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 font-medium">{item.description}</p>
                        {item.location && (
                          <p className="text-xs text-blue-600 mt-1">📍 {item.location}</p>
                        )}
                      </div>
                      <Info className="h-4 w-4 text-blue-600 ml-2 flex-shrink-0" />
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 p-4" side="top">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-800">Suggestion</Badge>
                        <h4 className="font-semibold text-blue-700">{item.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{item.explanation}</p>
                      {item.rubric_criteria && (
                        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                          <h5 className="text-xs font-semibold text-amber-800 mb-1">Rubric Enhancement Opportunity:</h5>
                          <p className="text-xs text-amber-700">{item.rubric_criteria}</p>
                        </div>
                      )}
                      {item.original_text && item.suggested_text && (
                        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                          <h5 className="text-xs font-semibold text-blue-800 mb-1">Enhancement Example:</h5>
                          <div className="space-y-1">
                            <div className="bg-gray-100 p-1 rounded text-xs">
                              <span className="font-medium text-gray-600">Current:</span> {item.original_text}
                            </div>
                            <div className="bg-green-100 p-1 rounded text-xs">
                              <span className="font-medium text-green-600">Enhanced:</span> {item.suggested_text}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                        ✨ Consider implementing this for enhanced quality!
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DetailedFeedback;
