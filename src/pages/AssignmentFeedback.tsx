import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, RefreshCw, Upload, CheckCircle, AlertCircle, FileText, Calendar, GitBranch } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useToast } from '@/hooks/use-toast';
import { analyzeHomework } from '@/services/aiService';
import FileDropZone from '@/components/FileDropZone';
import DetailedFeedback from '@/components/DetailedFeedback';
import { getFileInputAccept } from '@/services/fileTextExtraction';

interface Assignment {
  id: string;
  name: string;
  grade: number | null;
  weight: number | null;
  submitted_at: string;
  feedback: any;
  detailed_feedback: string | null;
  file_name: string | null;
  class_id: string;
  revision_count: number | null;
  latest_revision_id: string | null;
  original_rubric: string | null;
  original_instructions: string | null;
  editable_text: string | null;
  original_text: string | null;
}

interface AssignmentRevision {
  id: string;
  assignment_id: string;
  revision_number: number;
  file_name: string | null;
  grade: number | null;
  feedback: any;
  detailed_feedback: string | null;
  submitted_at: string;
  editable_text: string | null;
  original_text: string | null;
}

interface Class {
  id: string;
  name: string;
  teacher: string;
  current_grade: number;
}

const AssignmentFeedback = () => {
  const { classId, assignmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const { toast } = useToast();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [classData, setClassData] = useState<Class | null>(null);
  const [revisions, setRevisions] = useState<AssignmentRevision[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<AssignmentRevision | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [assignmentWeight, setAssignmentWeight] = useState<number | undefined>();
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [isUpdatingGrade, setIsUpdatingGrade] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && classId && assignmentId) {
      fetchAssignment();
      fetchClassData();
      fetchRevisions();
    }
  }, [user, classId, assignmentId]);

  const fetchClassData = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, teacher, current_grade')
        .eq('id', classId)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setClassData(data);
    } catch (error) {
      console.error('Error fetching class data:', error);
    }
  };

  const fetchAssignment = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', assignmentId)
        .eq('class_id', classId)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setAssignment(data);
      setAssignmentWeight(data.weight || undefined);
    } catch (error) {
      console.error('Error fetching assignment:', error);
      toast({
        title: "Error",
        description: "Failed to load assignment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRevisions = async () => {
    try {
      const { data, error } = await supabase
        .from('assignment_revisions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('user_id', user?.id)
        .order('revision_number', { ascending: false });

      if (error) {
        console.warn('Revisions table not found, using fallback');
        return;
      }

      setRevisions(data || []);
      if (data && data.length > 0) {
        setSelectedRevision(data[0]); // Default to latest revision
      }
    } catch (error) {
      console.error('Error fetching revisions:', error);
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (grade >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (grade >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const calculateNewGrade = (currentGrade: number, assignmentGrade: number, weight: number) => {
    const weightDecimal = weight / 100;
    const newGrade = currentGrade * (1 - weightDecimal) + assignmentGrade * weightDecimal;
    return Math.round(newGrade * 10) / 10;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleResubmit = async () => {
    if (!newFile || !assignment) return;
    
    setIsResubmitting(true);
    
    try {
      // Get original rubric/instructions from the first submission
      const originalRubric = assignment.original_rubric || '';
      const originalInstructions = assignment.original_instructions || '';
      const combinedRubric = [
        originalRubric,
        originalInstructions,
        "RESUBMISSION: Please evaluate this revised assignment based on the original criteria and provide feedback on improvements made from the previous version."
      ].filter(text => text.trim()).join('\n\n');
      
      // Call the AI service for real analysis
      const aiResult = await analyzeHomework(
        newFile,
        combinedRubric,
        assignmentWeight || 0,
        settings?.use_gpt4_vision || false,
        user?.id,
        `${assignment.name} - Revision`
      );

      // Get the original text from the new file
      const originalText = await newFile.text();
      
      // Create new revision using the database function
      const { data: revisionId, error: revisionError } = await supabase.rpc('create_assignment_revision', {
        p_assignment_id: assignmentId,
        p_user_id: user?.id,
        p_file_name: newFile.name,
        p_grade: aiResult.overallScore,
        p_feedback: {
          strengths: aiResult.feedback.filter(f => f.type === 'strength').map(f => f.description),
          improvements: aiResult.feedback.filter(f => f.type === 'improvement').map(f => f.description),
          suggestions: aiResult.feedback.filter(f => f.type === 'suggestion').map(f => f.description),
          summary: aiResult.summary
        },
        p_detailed_feedback: JSON.stringify(aiResult.feedback),
        p_original_text: originalText
      });

      if (revisionError) throw revisionError;

      toast({
        title: "Assignment Resubmitted!",
        description: `Your revised assignment has been analyzed. New grade: ${aiResult.overallScore}%`,
      });

      // Refresh data
      fetchAssignment();
      fetchRevisions();
      setNewFile(null);

    } catch (error: any) {
      console.error('Error resubmitting assignment:', error);
      toast({
        title: "Resubmission Failed",
        description: error.message || "Failed to analyze your revised assignment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsResubmitting(false);
    }
  };

  const handleUpdateGrade = async () => {
    if (!assignmentWeight || !classId || !user || !assignment) {
      toast({
        title: "Error",
        description: "Please enter the assignment weight to update your grade",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingGrade(true);

    try {
      const { data: classData, error: fetchError } = await supabase
        .from('classes')
        .select('current_grade')
        .eq('id', classId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const currentGrade = classData.current_grade || 0;
      const newGrade = calculateNewGrade(currentGrade, assignment.grade || 0, assignmentWeight);

      const { error: updateError } = await supabase
        .from('classes')
        .update({ current_grade: newGrade })
        .eq('id', classId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      const { error: assignmentError } = await supabase
        .from('assignments')
        .update({ weight: assignmentWeight })
        .eq('id', assignment.id)
        .eq('user_id', user.id);

      if (assignmentError) throw assignmentError;

      toast({
        title: "Grade Updated Successfully",
        description: `Course grade updated from ${currentGrade}% to ${newGrade}%`,
      });

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

  // Determine which data to show (revision or main assignment)
  const displayData = selectedRevision || assignment;
  const detailedFeedbackItems = displayData?.detailed_feedback ? 
    JSON.parse(displayData.detailed_feedback) : [];

  const handleRevisionChange = (value: string) => {
    if (value === 'original') {
      setSelectedRevision(null);
    } else {
      const revision = revisions.find(r => r.id === value);
      setSelectedRevision(revision || null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Assignment not found</h2>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

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
          
          {classData && (
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{assignment.name}</h1>
              <p className="text-gray-600 mt-2">
                {classData.name} • {classData.teacher}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Submitted: {formatDate(displayData?.submitted_at || assignment.submitted_at)}
                </div>
                {displayData?.file_name && (
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    {displayData.file_name}
                  </div>
                )}
                {assignment.weight && (
                  <Badge variant="outline">
                    Weight: {assignment.weight}%
                  </Badge>
                )}
                {assignment.revision_count && assignment.revision_count > 1 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <GitBranch className="h-3 w-3 mr-1" />
                    {assignment.revision_count} Revisions
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Revision Selector */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <GitBranch className="h-5 w-5 mr-2" />
                Assignment Versions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                <Label htmlFor="revision-select">View Version:</Label>
                  <Select
                  value={selectedRevision?.id || 'original'}
                  onValueChange={handleRevisionChange}
                  >
                    <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a version" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="original">
                      Original Submission - {assignment.grade}%
                    </SelectItem>
                      {revisions.map((revision) => (
                        <SelectItem key={revision.id} value={revision.id}>
                          Revision {revision.revision_number} - {revision.grade}% 
                          {revision.revision_number === revisions[0]?.revision_number && " (Latest)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedRevision && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Viewing Revision {selectedRevision.revision_number} submitted on{' '}
                      {formatDate(selectedRevision.submitted_at)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

          {/* Grade Card */}
          {displayData?.grade && (
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-center">
                  {selectedRevision ? `Revision ${selectedRevision.revision_number} Grade` : 'Your Grade'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className={`inline-flex items-center px-6 py-3 rounded-full text-2xl font-bold border-2 ${getGradeColor(displayData.grade)}`}>
                  {displayData.grade}%
                </div>
                {displayData.feedback?.summary && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                      <p className="text-sm text-blue-800">{displayData.feedback.summary}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Feedback Cards */}
          {displayData?.feedback && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Strengths */}
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-green-700 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {displayData.feedback.strengths?.map((strength: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <span className="text-gray-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Areas for Improvement */}
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-orange-700 flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {displayData.feedback.improvements?.map((improvement: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <span className="text-gray-700">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Detailed Feedback */}
          {detailedFeedbackItems.length > 0 && (
            <DetailedFeedback 
              feedback={detailedFeedbackItems}
              assignmentName={assignment.name}
              fileName={displayData?.file_name || undefined}
              editableText={displayData?.editable_text || undefined}
              originalText={displayData?.original_text || undefined}
              rubricCriteria={assignment.original_rubric || undefined}
            />
          )}

          {/* Grade Update Section - Only show for latest revision */}
          {(!selectedRevision || selectedRevision.revision_number === revisions[0]?.revision_number) && (
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>Update Course Grade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="weight">Assignment Weight (%)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0"
                    max="100"
                    value={assignmentWeight || ''}
                    onChange={(e) => setAssignmentWeight(Number(e.target.value))}
                    placeholder="Enter assignment weight (e.g., 15)"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    What percentage of your total grade does this assignment represent?
                  </p>
                </div>
                
                {assignmentWeight && assignment.grade && classData && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Your course grade will be updated from{' '}
                      <span className="font-semibold">{classData.current_grade.toFixed(1)}%</span> to{' '}
                      <span className="font-semibold">
                        {calculateNewGrade(classData.current_grade, assignment.grade, assignmentWeight).toFixed(1)}%
                      </span>
                    </p>
                  </div>
                )}

                <Button 
                  onClick={handleUpdateGrade}
                  disabled={!assignmentWeight || isUpdatingGrade}
                  className="w-full"
                >
                  {isUpdatingGrade ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating Grade...
                    </>
                  ) : (
                    'Update Course Grade'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Resubmit Section - Only show for latest revision */}
          {(!selectedRevision || selectedRevision.revision_number === revisions[0]?.revision_number) && (
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>Want to Improve Your Grade?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Upload a revised version of your assignment to get new AI feedback and potentially improve your grade.
                </p>
                
                <FileDropZone
                  onFileSelect={setNewFile}
                  selectedFile={newFile}
                  accept={getFileInputAccept()}
                  label="Upload Revised Assignment"
                  sublabel="Supports: .txt, .pdf, .docx files"
                />

                <Button 
                  onClick={handleResubmit}
                  disabled={!newFile || isResubmitting}
                  className="w-full"
                  variant="outline"
                >
                  {isResubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      AI is analyzing your revision...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Resubmit Assignment
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentFeedback; 