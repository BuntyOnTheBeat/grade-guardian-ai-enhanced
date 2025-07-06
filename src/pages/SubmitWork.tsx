import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Upload, FileText, BookOpen, AlertCircle, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { analyzeHomework } from '@/services/aiService';
import { addCredits } from '@/services/creditsService';
import FileDropZone from '@/components/FileDropZone';
import TextOrFileInput from '@/components/TextOrFileInput';
import { Progress } from '@/components/ui/progress';

const SubmitWork = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const { toast } = useToast();
  const [assignmentName, setAssignmentName] = useState('');
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [assignmentText, setAssignmentText] = useState('');
  const [rubricFile, setRubricFile] = useState<File | null>(null);
  const [rubricText, setRubricText] = useState('');
  const [assignmentBackground, setAssignmentBackground] = useState('');
  const [assignmentWeight, setAssignmentWeight] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingCredits, setIsAddingCredits] = useState(false);
  const [allowResubmissions, setAllowResubmissions] = useState(true);

  const handleSubmit = async () => {
    if (!assignmentFile && !assignmentText.trim()) {
      toast({
        title: "Missing Assignment",
        description: "Please upload your assignment file or paste your text",
        variant: "destructive"
      });
      return;
    }

    if (!assignmentName.trim()) {
      toast({
        title: "Missing Assignment Name",
        description: "Please enter a name for your assignment",
        variant: "destructive"
      });
      return;
    }

    // Check if either rubric text or assignment background is provided
    if (!rubricText.trim()) {
      toast({
        title: "Missing Grading Rubric",
        description: "Please provide a rubric to help the AI analyze your work accurately",
        variant: "destructive"
      });
      // Scroll to the submit button area
      document.getElementById('submit-section')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Combine rubric and instructions
      const combinedRubric = rubricText;
      
      // Create a file object if user pasted text instead of uploading
      let fileToAnalyze = assignmentFile;
      let originalText = '';
      
      if (!assignmentFile && assignmentText.trim()) {
        // Create a virtual file from the pasted text
        const blob = new Blob([assignmentText], { type: 'text/plain' });
        fileToAnalyze = new File([blob], `${assignmentName.replace(/[^a-z0-9]/gi, '_')}.txt`, { type: 'text/plain' });
        originalText = assignmentText;
      } else if (assignmentFile) {
        originalText = await assignmentFile.text();
      }
      
      // Call the actual AI service
      const aiResult = await analyzeHomework(
        fileToAnalyze!,
        combinedRubric,
        assignmentWeight || 0,
        settings?.use_gpt4_vision || false,
        user?.id,
        assignmentName
      );
      
      // Save to database
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .insert({
          class_id: classId,
          user_id: user?.id,
          name: assignmentName,
          grade: aiResult.overallScore,
          weight: assignmentWeight,
          feedback: {
            strengths: aiResult.feedback.filter(f => f.type === 'strength').map(f => f.description),
            improvements: aiResult.feedback.filter(f => f.type === 'improvement').map(f => f.description),
            suggestions: aiResult.feedback.filter(f => f.type === 'suggestion').map(f => f.description),
            summary: aiResult.summary
          },
          detailed_feedback: JSON.stringify(aiResult.feedback),
          file_name: fileToAnalyze!.name,
          original_rubric: rubricText,
          original_instructions: assignmentBackground,
          revision_count: 0,
          original_text: originalText,
          editable_text: aiResult.editable_text
        })
        .select()
        .single();

      if (assignmentError) throw assignmentError;

      toast({
        title: "Assignment Analyzed!",
        description: `Your assignment has been graded: ${aiResult.overallScore}%`,
      });

      // Navigate to the individual assignment feedback page
      navigate(`/class/${classId}/assignment/${assignmentData.id}/feedback`);

    } catch (error: any) {
      console.error('Error analyzing assignment:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze your assignment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCredits = async () => {
    if (!user?.id) return;
    
    setIsAddingCredits(true);
    try {
      const batchId = await addCredits(user.id, 10, 'student'); // Add 10 student credits for testing
      if (batchId) {
        toast({
          title: "Credits Added!",
          description: "Added 10 Student credits to your account for testing",
        });
      } else {
        throw new Error('Failed to add credits');
      }
    } catch (error) {
      console.error('Error adding credits:', error);
      toast({
        title: "Error",
        description: "Failed to add credits. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAddingCredits(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isSubmitting && (
          <div className="mb-4">
            <Progress />
            <div className="text-center text-sm text-gray-500 mt-1">Analyzing your assignment, please wait...</div>
          </div>
        )}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Classes
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Submit Assignment</h1>
              <p className="text-gray-600 mt-2">Upload a file or paste your text for AI review and feedback</p>
            </div>
            <Button
              onClick={handleAddCredits}
              disabled={isAddingCredits}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {isAddingCredits ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>Add 10 Credits (Testing)</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="assignmentName">Assignment Name *</Label>
                <Input
                  id="assignmentName"
                  value={assignmentName}
                  onChange={(e) => setAssignmentName(e.target.value)}
                  placeholder="e.g., Research Essay on Climate Change"
                  required
                />
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="space-y-1">
                  <Label htmlFor="allow-resubmissions">Allow Resubmissions</Label>
                  <p className="text-sm text-gray-500">
                    Enable the option to resubmit improved versions of this assignment
                  </p>
                </div>
                <Switch
                  id="allow-resubmissions"
                  checked={allowResubmissions}
                  onCheckedChange={setAllowResubmissions}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800">
                <FileText className="h-5 w-5 mr-2" />
                Assignment Submission *
              </CardTitle>
              <p className="text-sm text-blue-700 mt-2">
                Upload a file or paste your assignment text directly
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="assignmentText">Assignment Content</Label>
                  <Textarea
                    id="assignmentText"
                    value={assignmentText}
                    onChange={(e) => {
                      setAssignmentText(e.target.value);
                      // Clear file when text is entered
                      if (e.target.value.trim() && assignmentFile) {
                        setAssignmentFile(null);
                      }
                    }}
                    placeholder="Paste your assignment text here...

Example:
My essay on climate change explores the various factors contributing to global warming. The introduction presents a clear thesis statement that outlines the main arguments...

Or upload a file using the file upload section below."
                    rows={8}
                    className="mt-2"
                  />
                  {assignmentText.trim() && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Text content ready for analysis ({assignmentText.length} characters)
                    </p>
                  )}
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-blue-50 px-2 text-gray-500">OR</span>
                  </div>
                </div>
                
                <div>
                  <Label>Upload Assignment File</Label>
                  <div className="mt-2">
                    <FileDropZone
                      onFileSelect={(file) => {
                        setAssignmentFile(file);
                        // Clear text when file is uploaded
                        if (file) setAssignmentText('');
                      }}
                      selectedFile={assignmentFile}
                      accept=".txt,.md"
                      label="Drop your assignment file here or click to browse"
                      sublabel="Currently supports: .txt and .md files only"
                    />
                  </div>
                  {assignmentFile && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ File selected: {assignmentFile.name}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-200 bg-amber-50/30">
            <CardHeader>
              <CardTitle className="flex items-center text-amber-800">
                <BookOpen className="h-5 w-5 mr-2" />
                Grading Criteria (Required)
              </CardTitle>
              <p className="text-sm text-amber-700 mt-2">
                Provide a rubric to help AI analyze your work accurately
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <TextOrFileInput
                id="rubricText"
                label="Rubric/Grading Criteria"
                value={rubricText}
                onChange={setRubricText}
                placeholder="Paste your rubric here, including point values, criteria, and expectations...
Example:
- Content & Ideas (40 points): Clear thesis, well-developed arguments
- Organization (20 points): Logical structure with transitions
- Grammar & Style (20 points): Proper mechanics and word choice
- Citations (20 points): Proper MLA format"
                rows={6}
                accept=".pdf,.doc,.docx,.txt"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="weight">Assignment Weight (% of total grade) - Optional</Label>
                <Input
                  id="weight"
                  type="number"
                  min="0"
                  max="100"
                  value={assignmentWeight || ''}
                  onChange={(e) => setAssignmentWeight(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g., 15"
                />
                <p className="text-sm text-gray-600 mt-1">
                  What percentage of your total course grade does this assignment represent?
                </p>
              </div>
            </CardContent>
          </Card>

          <div id="submit-section" className="space-y-4">
            {!rubricText.trim() && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
                  <p className="text-red-800 text-sm">
                    <strong>Required:</strong> Please provide a rubric above to help the AI analyze your work accurately.
                  </p>
                </div>
              </div>
            )}
            
            <Button
              onClick={handleSubmit}
              disabled={(!assignmentFile && !assignmentText.trim()) || !assignmentName.trim() || !rubricText.trim() || isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 disabled:bg-gray-400"
              size="lg"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  AI is analyzing your work...
                </div>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Submit for AI Analysis
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitWork;
