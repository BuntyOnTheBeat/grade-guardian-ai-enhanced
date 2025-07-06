import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, FileText, Calendar, GitBranch, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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

interface Assignment {
  id: string;
  name: string;
  grade: number | null;
  submitted_at: string;
  file_name: string | null;
  class_id: string;
  revision_count: number | null;
  classes: { name: string } | null;
}

const AllAssignments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('id, name, grade, submitted_at, file_name, class_id, revision_count, classes ( name )')
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

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;

    try {
      const { error } = await supabase.from('assignments').delete().eq('id', assignmentToDelete.id);
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

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">All Assignments</h1>
          <Badge variant="secondary">{assignments.length} Assignments</Badge>
        </div>

        <div className="space-y-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader className="pb-3">
                 <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">{assignment.name}</CardTitle>
                  {assignment.grade && (
                    <div className={`px-3 py-1 rounded-full border font-semibold ${getGradeColor(assignment.grade)}`}>
                      {assignment.grade}%
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="font-medium text-blue-600">{assignment.classes?.name || 'Class'}</div>
                  <div className="flex items-center"><Calendar className="h-4 w-4 mr-1" />{formatDate(assignment.submitted_at)}</div>
                  {assignment.file_name && <div className="flex items-center"><FileText className="h-4 w-4 mr-1" />{assignment.file_name}</div>}
                  {assignment.revision_count && assignment.revision_count > 1 && <Badge variant="outline"><GitBranch className="h-3 w-3 mr-1" />{assignment.revision_count} Revisions</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-end space-x-2">
                  <Button onClick={() => navigate(`/class/${assignment.class_id}/assignment/${assignment.id}/feedback`)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Feedback
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setAssignmentToDelete(assignment)}>
                    <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {assignments.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold">No assignments found</h3>
                <p className="text-gray-600">Submit an assignment in any class to see it here.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <AlertDialog open={!!assignmentToDelete} onOpenChange={() => setAssignmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{assignmentToDelete?.name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAssignment} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AllAssignments; 