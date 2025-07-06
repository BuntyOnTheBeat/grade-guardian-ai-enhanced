
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditClassFormProps {
  classData: {
    id: string;
    name: string;
    teacher: string;
    current_grade: number;
    background: string;
  };
  onSubmit: (updates: {
    name: string;
    teacher: string;
    current_grade: number;
    background: string;
  }) => void;
  onDelete: () => void;
}

const backgroundOptions = [
  { value: 'bg-blue-500', label: 'Blue', color: 'bg-blue-500' },
  { value: 'bg-green-500', label: 'Green', color: 'bg-green-500' },
  { value: 'bg-red-500', label: 'Red', color: 'bg-red-500' },
  { value: 'bg-purple-500', label: 'Purple', color: 'bg-purple-500' },
  { value: 'bg-yellow-500', label: 'Yellow', color: 'bg-yellow-500' },
  { value: 'bg-pink-500', label: 'Pink', color: 'bg-pink-500' },
  { value: 'bg-indigo-500', label: 'Indigo', color: 'bg-indigo-500' },
  { value: 'bg-orange-500', label: 'Orange', color: 'bg-orange-500' },
];

const EditClassForm = ({ classData, onSubmit, onDelete }: EditClassFormProps) => {
  const [name, setName] = useState(classData.name);
  const [teacher, setTeacher] = useState(classData.teacher);
  const [currentGrade, setCurrentGrade] = useState(classData.current_grade.toString());
  const [background, setBackground] = useState(classData.background);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      teacher,
      current_grade: parseFloat(currentGrade),
      background,
    });
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete();
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Class Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="teacher">Teacher</Label>
        <Input
          id="teacher"
          value={teacher}
          onChange={(e) => setTeacher(e.target.value)}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="grade">Current Grade</Label>
        <Input
          id="grade"
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={currentGrade}
          onChange={(e) => setCurrentGrade(e.target.value)}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="background">Color Theme</Label>
        <Select value={background} onValueChange={setBackground}>
          <SelectTrigger>
            <SelectValue>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${background}`}></div>
                {backgroundOptions.find(opt => opt.value === background)?.label || 'Select color'}
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {backgroundOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${option.color}`}></div>
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
        >
          {showDeleteConfirm ? 'Confirm Delete' : 'Delete Class'}
        </Button>
        <Button type="submit">
          Save Changes
        </Button>
      </div>
    </form>
  );
};

export default EditClassForm;
