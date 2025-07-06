
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddClassFormProps {
  onSubmit: (classData: {
    name: string;
    teacher: string;
    current_grade: number;
    background: string;
  }) => void;
}

const backgrounds = [
  { value: 'bg-blue-500', label: 'Blue' },
  { value: 'bg-green-500', label: 'Green' },
  { value: 'bg-purple-500', label: 'Purple' },
  { value: 'bg-red-500', label: 'Red' },
  { value: 'bg-yellow-500', label: 'Yellow' },
  { value: 'bg-pink-500', label: 'Pink' },
];

const AddClassForm = ({ onSubmit }: AddClassFormProps) => {
  const [name, setName] = useState('');
  const [teacher, setTeacher] = useState('');
  const [currentGrade, setCurrentGrade] = useState('');
  const [background, setBackground] = useState('bg-blue-500');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      teacher,
      current_grade: parseFloat(currentGrade) || 0,
      background,
    });
    setName('');
    setTeacher('');
    setCurrentGrade('');
    setBackground('bg-blue-500');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Class Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Mathematics"
          required
        />
      </div>
      <div>
        <Label htmlFor="teacher">Teacher</Label>
        <Input
          id="teacher"
          value={teacher}
          onChange={(e) => setTeacher(e.target.value)}
          placeholder="e.g., Dr. Smith"
          required
        />
      </div>
      <div>
        <Label htmlFor="grade">Current Grade (%)</Label>
        <Input
          id="grade"
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={currentGrade}
          onChange={(e) => setCurrentGrade(e.target.value)}
          placeholder="e.g., 85.5"
        />
      </div>
      <div>
        <Label htmlFor="background">Color Theme</Label>
        <Select value={background} onValueChange={setBackground}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {backgrounds.map((bg) => (
              <SelectItem key={bg.value} value={bg.value}>
                <div className="flex items-center space-x-2">
                  <div className={`w-4 h-4 rounded ${bg.value}`} />
                  <span>{bg.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">
        Add Class
      </Button>
    </form>
  );
};

export default AddClassForm;
