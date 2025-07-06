
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Eye, EyeOff, BarChart3, Edit } from 'lucide-react';
import EditClassForm from './EditClassForm';

interface ClassCardProps {
  classData: {
    id: string;
    name: string;
    teacher: string;
    current_grade: number;
    background: string;
    assignments?: any[];
    visible?: boolean;
  };
  gradesPrivate: boolean;
  onUpdate: (updates: any) => void;
  onDelete: (classId: string) => void;
}

const ClassCard = ({ classData, gradesPrivate, onUpdate, onDelete }: ClassCardProps) => {
  const navigate = useNavigate();
  const [showGrade, setShowGrade] = useState(!gradesPrivate);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Don't render if class is not visible
  if (classData.visible === false) {
    return null;
  }

  const handleSubmitWork = () => {
    navigate(`/class/${classData.id}/submit`);
  };

  const handleViewFeedback = () => {
    navigate(`/class/${classData.id}/assignments`);
  };

  const handleEditSubmit = (updates: any) => {
    onUpdate(updates);
    setShowEditDialog(false);
  };

  const handleDelete = () => {
    onDelete(classData.id);
    setShowEditDialog(false);
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600';
    if (grade >= 80) return 'text-blue-600';
    if (grade >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className={`h-3 ${classData.background}`} />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">{classData.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{classData.teacher}</Badge>
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Edit Class</DialogTitle>
                </DialogHeader>
                <EditClassForm
                  classData={classData}
                  onSubmit={handleEditSubmit}
                  onDelete={handleDelete}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Current Grade:</span>
            {gradesPrivate ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGrade(!showGrade)}
                className="p-1 h-auto"
              >
                {showGrade ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            ) : null}
          </div>
          {(showGrade || !gradesPrivate) && (
            <span className={`font-semibold ${getGradeColor(classData.current_grade)}`}>
              {classData.current_grade.toFixed(1)}%
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleSubmitWork} className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            Submit Work
          </Button>
          <Button variant="outline" onClick={handleViewFeedback} className="w-full">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Feedback
          </Button>
        </div>
        {classData.assignments && classData.assignments.length > 0 && (
          <div className="text-xs text-gray-500 text-center">
            {classData.assignments.length} assignment{classData.assignments.length !== 1 ? 's' : ''} submitted
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClassCard;
