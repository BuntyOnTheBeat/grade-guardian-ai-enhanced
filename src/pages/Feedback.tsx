
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, RefreshCw, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import FileDropZone from '@/components/FileDropZone';
import DetailedFeedback from '@/components/DetailedFeedback';

const Feedback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { classId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [newFile, setNewFile] = useState<File | null>(null);
  const [assignmentWeight, setAssignmentWeight] = useState<number | undefined>(
    location.state?.assignmentWeight
  );
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [isUpdatingGrade, setIsUpdatingGrade] = useState(false);

  // Simulated AI feedback data
  const feedback = {
    grade: 87,
    strengths: [
      "Clear thesis statement and well-structured arguments",
      "Good use of evidence from credible sources",
      "Proper citation format throughout"
    ],
    improvements: [
      "Some paragraphs could benefit from stronger topic sentences",
      "Consider adding more analysis of counter-arguments",
      "Conclusion could be more impactful"
    ],
    teacherHappiness: "Your teacher would likely be pleased with this work! It demonstrates good understanding of the topic and meets most assignment requirements.",
    detailedFeedback: "This is a solid piece of work that shows good research skills and clear writing. The argument is well-supported and the structure is logical. With some minor improvements in analysis depth and conclusion strength, this could be an excellent submission."
  };

  // Detailed feedback for hover functionality
  const detailedFeedbackItems = [
    ...feedback.strengths.map(strength => ({
      type: 'strength' as const,
      title: strength.split(' ').slice(0, 3).join(' '),
      description: strength,
      explanation: `This is a key strength in your work. ${strength.toLowerCase()}. This demonstrates good academic writing skills and shows you understand the requirements. Continue building on this foundation in future assignments.`,
      location: 'Throughout document'
    })),
    ...feedback.improvements.map(improvement => ({
      type: 'improvement' as const,
      title: improvement.split(' ').slice(0, 3).join(' '),
      description: improvement,
      explanation: `This area needs attention to strengthen your work. ${improvement.toLowerCase()}. Focus on this in your revision to improve the overall quality and effectiveness of your writing.`,
      location: 'Specific sections identified'
    }))
  ];

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (grade >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (grade >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const calculateNewGrade = (currentGrade: number, assignmentGrade: number, weight: number) => {
    // Simple weighted average calculation
    // New grade = current grade * (100 - weight)/100 + assignment grade * weight/100
    const weightDecimal = weight / 100;
    const newGrade = currentGrade * (1 - weightDecimal) + assignmentGrade * weightDecimal;
    return Math.round(newGrade * 10) / 10; // Round to 1 decimal place
  };

  const handleResubmit = async () => {
    if (!newFile) return;
    
    setIsResubmitting(true);
    // Simulate reprocessing
    setTimeout(() => {
      setIsResubmitting(false);
      setNewFile(null);
      toast({
        title: "Assignment Resubmitted",
        description: "Your revised assignment has been processed successfully.",
      });
    }, 2000);
  };

  const handleUpdateGrade = async () => {
    if (!assignmentWeight || !classId || !user) {
      toast({
        title: "Error",
        description: "Please enter the assignment weight to update your grade",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingGrade(true);

    try {
      // First, get the current class data
      const { data: classData, error: fetchError } = await supabase
        .from('classes')
        .select('current_grade')
        .eq('id', classId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const currentGrade = classData.current_grade || 0;
      const newGrade = calculateNewGrade(currentGrade, feedback.grade, assignmentWeight);

      // Update the class grade
      const { error: updateError } = await supabase
        .from('classes')
        .update({ current_grade: newGrade })
        .eq('id', classId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Create assignment record
      const { error: assignmentError } = await supabase
        .from('assignments')
        .insert({
          class_id: classId,
          user_id: user.id,
          name: 'Assignment Submission',
          grade: feedback.grade,
          weight: assignmentWeight,
          feedback: { 
            strengths: feedback.strengths, 
            improvements: feedback.improvements,
            summary: feedback.detailedFeedback 
          },
          detailed_feedback: JSON.stringify(detailedFeedbackItems)
        });

      if (assignmentError) throw assignmentError;

      toast({
        title: "Grade Updated Successfully",
        description: `Course grade updated from ${currentGrade}% to ${newGrade}%`,
      });

      // Navigate back to assignments list
      navigate(`/class/${classId}/assignments`);

    } catch (error) {
      console.error('Error updating grade:', error);
      toast({
        title: "Error",
        description: "Failed to update course grade. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingGrade(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/class/${classId}/assignments`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assignments
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">AI Feedback</h1>
          <p className="text-gray-600 mt-2">Review your assignment feedback and grade</p>
        </div>

        <div className="space-y-6">
          {/* Grade Card */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-center">Your Grade</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className={`inline-flex items-center px-6 py-3 rounded-full text-2xl font-bold border-2 ${getGradeColor(feedback.grade)}`}>
                {feedback.grade}%
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-sm text-blue-800">{feedback.teacherHappiness}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Feedback Component */}
          <DetailedFeedback 
            feedback={detailedFeedbackItems}
            assignmentName="Assignment Submission"
            fileName="uploaded_file"
            originalText="Sample original text content would go here..."
            rubricCriteria="Sample rubric criteria for demonstration"
          />

          {/* Grade Update Section */}
          <Card>
            <CardHeader>
              <CardTitle>Update Course Grade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="weight">Assignment Weight (% of total grade)</Label>
                <Input
                  id="weight"
                  type="number"
                  min="0"
                  max="100"
                  value={assignmentWeight || ''}
                  onChange={(e) => setAssignmentWeight(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g., 15"
                />
                {assignmentWeight && (
                  <p className="text-sm text-gray-600 mt-2">
                    This assignment will contribute {assignmentWeight}% to your overall course grade.
                  </p>
                )}
              </div>
              <Button 
                onClick={handleUpdateGrade}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={!assignmentWeight || isUpdatingGrade}
              >
                {isUpdatingGrade ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating Grade...
                  </div>
                ) : (
                  'Update Course Grade'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Resubmit Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCw className="h-5 w-5 mr-2" />
                Resubmit Improved Work
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Made improvements based on the feedback? Upload your revised assignment for a new grade.
              </p>
              
              <FileDropZone
                onFileSelect={setNewFile}
                selectedFile={newFile}
                accept=".txt,.md"
                label="Drop your revised assignment here"
                sublabel="Currently supports: .txt and .md files only"
              />

              <Button
                onClick={handleResubmit}
                disabled={!newFile || isResubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isResubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Re-evaluating...
                  </div>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Resubmit for New Grade
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
