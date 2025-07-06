import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, EyeOff, FileText, Calendar, TrendingUp, GitBranch, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Assignment {
  id: string;
  name: string;
  grade: number | null;
  weight: number | null;
  submitted_at: string;
  feedback: any;
  detailed_feedback: string | null;
  file_name: string | null;
  revision_count: number | null;
}

interface Class {
  id: string;
  name: string;
  teacher: string;
  current_grade: number;
}

const AssignmentList = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classData, setClassData] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [hiddenGrades, setHiddenGrades] = useState<Set<string>>(new Set());
  const [isClassGradeHidden, setIsClassGradeHidden] = useState<boolean>(false);

  useEffect(() => {
    if (user && classId) {
      fetchAssignments();
      fetchClassData();
    }
  }, [user, classId]);

  // Load hidden grades from localStorage when private grades setting is enabled
  useEffect(() => {
    if (settings?.grades_private && classId) {
      const savedHiddenGrades = localStorage.getItem(`hiddenGrades_${classId}`);
      if (savedHiddenGrades) {
        setHiddenGrades(new Set(JSON.parse(savedHiddenGrades)));
      }
      
      const savedClassGradeHidden = localStorage.getItem(`classGradeHidden_${classId}`);
      if (savedClassGradeHidden) {
        setIsClassGradeHidden(JSON.parse(savedClassGradeHidden));
      }
    }
  }, [settings?.grades_private, classId]);

  // Save hidden grades to localStorage
  const saveHiddenGrades = (newHiddenGrades: Set<string>) => {
    if (classId) {
      localStorage.setItem(`hiddenGrades_${classId}`, JSON.stringify(Array.from(newHiddenGrades)));
    }
  };

  // Toggle individual assignment grade visibility
  const toggleAssignmentGrade = (assignmentId: string) => {
    const newHiddenGrades = new Set(hiddenGrades);
    if (newHiddenGrades.has(assignmentId)) {
      newHiddenGrades.delete(assignmentId);
    } else {
      newHiddenGrades.add(assignmentId);
    }
    setHiddenGrades(newHiddenGrades);
    saveHiddenGrades(newHiddenGrades);
  };

  // Toggle class overall grade visibility
  const toggleClassGrade = () => {
    const newValue = !isClassGradeHidden;
    setIsClassGradeHidden(newValue);
    if (classId) {
      localStorage.setItem(`classGradeHidden_${classId}`, JSON.stringify(newValue));
    }
  };

  // Load hidden grades from localStorage when private grades is enabled
  useEffect(() => {
    if (settings?.grades_private && classId) {
      const savedHiddenGrades = localStorage.getItem(`hiddenGrades_${classId}`);
      if (savedHiddenGrades) {
        setHiddenGrades(new Set(JSON.parse(savedHiddenGrades)));
      }
    }
  }, [settings?.grades_private, classId]);

  // Toggle grade visibility for individual assignments
  const toggleGradeVisibility = (assignmentId: string) => {
    const newHiddenGrades = new Set(hiddenGrades);
    if (newHiddenGrades.has(assignmentId)) {
      newHiddenGrades.delete(assignmentId);
    } else {
      newHiddenGrades.add(assignmentId);
    }
    setHiddenGrades(newHiddenGrades);
    
    // Save to localStorage
    if (classId) {
      localStorage.setItem(`hiddenGrades_${classId}`, JSON.stringify([...newHiddenGrades]));
    }
  };

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
      toast({
        title: "Error",
        description: "Failed to load class information",
        variant: "destructive"
      });
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('id, name, grade, weight, submitted_at, feedback, file_name, revision_count')
        .eq('class_id', classId)
        .eq('user_id', user?.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewFeedback = (assignmentId: string) => {
    navigate(`/class/${classId}/assignment/${assignmentId}/feedback`);
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;

    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentToDelete.id);

      if (error) throw error;

      setAssignments(assignments.filter(a => a.id !== assignmentToDelete.id));
      toast({
        title: 'Assignment Deleted',
        description: `"${assignmentToDelete.name}" has been successfully deleted.`,
      });
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete assignment.',
        variant: 'destructive',
      });
    } finally {
      setAssignmentToDelete(null);
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (grade >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (grade >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Create a sample "current" assignment if there are existing assignments
  const sampleAssignment = assignments.length > 0 ? null : {
    id: 'sample',
    name: 'Sample Assignment - Essay on Climate Change',
    grade: 87,
    weight: 15,
    submitted_at: new Date().toISOString(),
    feedback: {
      strengths: ['Clear thesis statement', 'Good use of evidence', 'Proper citations'],
      improvements: ['Stronger topic sentences', 'More counter-arguments', 'Better conclusion']
    },
    detailed_feedback: 'Sample detailed feedback',
    file_name: 'climate_essay.pdf'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          {classData && (
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">{classData.name}</h1>
              <div className="text-gray-600 mt-2 flex items-center">
                <span>Teacher: {classData.teacher} • Current Grade:</span>
                {settings?.grades_private && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleClassGrade}
                    className="p-1 h-auto ml-2"
                  >
                    {isClassGradeHidden ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {(!settings?.grades_private || !isClassGradeHidden) && (
                <span className={`ml-1 font-semibold ${classData.current_grade >= 90 ? 'text-green-600' : 
                  classData.current_grade >= 80 ? 'text-blue-600' : 
                  classData.current_grade >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {classData.current_grade.toFixed(1)}%
                </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Assignment Feedback</h2>
            <Badge variant="secondary" className="flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              {assignments.length + (sampleAssignment ? 1 : 0)} Assignment{assignments.length + (sampleAssignment ? 1 : 0) !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          {/* Sample Assignment (if no real assignments exist) */}
          {sampleAssignment && (
            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                    {sampleAssignment.name}
                    <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                      Example
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {settings?.grades_private && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAssignmentGrade('sample')}
                        className="p-1 h-auto"
                      >
                        {hiddenGrades.has('sample') ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {(!settings?.grades_private || !hiddenGrades.has('sample')) && (
                  <div className={`px-3 py-1 rounded-full border font-semibold ${getGradeColor(sampleAssignment.grade)}`}>
                    {sampleAssignment.grade}%
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(sampleAssignment.submitted_at)}
                  </div>
                  {sampleAssignment.weight && (
                    <Badge variant="outline">
                      Weight: {sampleAssignment.weight}%
                    </Badge>
                  )}
                  {sampleAssignment.file_name && (
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      {sampleAssignment.file_name}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 mb-2">
                      This is an example of what your assignment feedback will look like. 
                      Submit your first assignment to see real feedback here!
                    </p>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="text-green-600">
                        ✓ {sampleAssignment.feedback.strengths.length} Strengths identified
                      </span>
                      <span className="text-orange-600">
                        ⚠ {sampleAssignment.feedback.improvements.length} Areas for improvement
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                  <Button 
                    onClick={() => navigate(`/class/${classId}/feedback`)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Sample Feedback
                  </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Button variant="ghost" size="icon" disabled>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Sample assignments cannot be deleted</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Real Assignments */}
          {assignments.map((assignment, index) => (
            <Card key={assignment.id} className={index === 0 ? "border-2 border-green-200 bg-green-50/30" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-gray-600" />
                    {assignment.name}
                    {index === 0 && (
                      <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                        Latest
                      </Badge>
                    )}
                    {assignment.revision_count && assignment.revision_count > 1 && (
                      <Badge variant="outline" className="ml-2">
                        <GitBranch className="h-3 w-3 mr-1" />
                        {assignment.revision_count} Revisions
                      </Badge>
                    )}
                  </CardTitle>
                  {assignment.grade && (
                    <div className="flex items-center space-x-2">
                      {settings?.grades_private && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAssignmentGrade(assignment.id)}
                          className="p-1 h-auto"
                        >
                          {hiddenGrades.has(assignment.id) ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {(!settings?.grades_private || !hiddenGrades.has(assignment.id)) && (
                    <div className={`px-3 py-1 rounded-full border font-semibold ${getGradeColor(assignment.grade)}`}>
                      {assignment.grade}%
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(assignment.submitted_at)}
                  </div>
                  {assignment.weight && (
                    <Badge variant="outline">
                      Weight: {assignment.weight}%
                    </Badge>
                  )}
                  {assignment.file_name && (
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      {assignment.file_name}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {assignment.feedback && (
                      <div className="flex items-center space-x-4 text-xs mb-2">
                        <span className="text-green-600">
                          ✓ {assignment.feedback.strengths?.length || 0} Strengths identified
                        </span>
                        <span className="text-orange-600">
                          ⚠ {assignment.feedback.improvements?.length || 0} Areas for improvement
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-gray-700">
                      {assignment.feedback?.summary || "AI feedback and detailed analysis available"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                  <Button 
                    onClick={() => handleViewFeedback(assignment.id)}
                    variant={index === 0 ? "default" : "outline"}
                    className={index === 0 ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Feedback
                  </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setAssignmentToDelete(assignment)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {assignments.length === 0 && !sampleAssignment && (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No assignments yet</h3>
                <p className="text-gray-600 mb-6">
                  Submit your first assignment to get AI-powered feedback and grading.
                </p>
                <Button 
                  onClick={() => navigate(`/class/${classId}/submit`)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Submit Your First Assignment
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <AlertDialog open={!!assignmentToDelete} onOpenChange={() => setAssignmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the assignment
              "{assignmentToDelete?.name}" and all of its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAssignment} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AssignmentList; 