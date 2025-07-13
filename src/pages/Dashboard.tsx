import { useState, useEffect } from 'react';
import { Plus, Settings, BookOpen, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import ClassCard from '@/components/ClassCard';
import AddClassForm from '@/components/AddClassForm';
import SettingsPanel from '@/components/SettingsPanel';
import { useAuth } from '@/hooks/useAuth';
import { useUserSettings } from '@/hooks/useUserSettings';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Class {
  id: string;
  name: string;
  teacher: string;
  current_grade: number;
  background: string;
  visible?: boolean;
  assignments?: Assignment[];
}

interface Assignment {
  id: string;
  name: string;
  grade: number;
  weight: number;
  feedback: string;
  submitted_at: Date;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const [classes, setClasses] = useState<Class[]>([]);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchClasses();
    }
  }, [user]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle settings dialog close - refresh classes to get updated visibility
  const handleSettingsClose = (open: boolean) => {
    if (!open && showSettings) {
      // Settings dialog was closed, refresh classes to get updated visibility
      fetchClasses();
    }
    setShowSettings(open);
  };

  const addClass = async (newClass: {
    name: string;
    teacher: string;
    current_grade: number;
    background: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert([{
          ...newClass,
          user_id: user?.id,
          visible: true,
        }])
        .select()
        .single();

      if (error) throw error;
      setClasses([data, ...classes]);
      setShowAddClass(false);
    } catch (error) {
      console.error('Error adding class:', error);
    }
  };

  const updateClass = async (classId: string, updates: Partial<Class>) => {
    try {
      const { error } = await supabase
        .from('classes')
        .update(updates)
        .eq('id', classId);

      if (error) throw error;
      setClasses(classes.map(cls => 
        cls.id === classId ? { ...cls, ...updates } : cls
      ));
    } catch (error) {
      console.error('Error updating class:', error);
    }
  };

  const deleteClass = async (classId: string) => {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;
      setClasses(classes.filter(cls => cls.id !== classId));
    } catch (error) {
      console.error('Error deleting class:', error);
    }
  };

  // Filter visible classes for display
  const visibleClasses = classes.filter(cls => cls.visible !== false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 p-3 rounded-lg">
                <Monitor className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My HW Checker</h1>
                <p className="text-gray-600">Welcome back, {user?.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Sheet open={showSettings} onOpenChange={handleSettingsClose}>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[450px] p-0">
                  <SettingsPanel />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {visibleClasses.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-20 w-20 text-gray-400 mx-auto mb-6" />
            <h2 className="text-3xl font-semibold text-gray-900 mb-4">No classes yet</h2>
            <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
              Get started by adding your first class to track your assignments and grades.
            </p>
            <Dialog open={showAddClass} onOpenChange={setShowAddClass}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Your First Class
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Class</DialogTitle>
                </DialogHeader>
                <AddClassForm onSubmit={addClass} />
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-semibold text-gray-900">Your Classes</h2>
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={() => navigate('/assignments')}>
                  View All Assignments
                </Button>
              <Dialog open={showAddClass} onOpenChange={setShowAddClass}>
                <DialogTrigger asChild>
                    <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Class
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add New Class</DialogTitle>
                  </DialogHeader>
                  <AddClassForm onSubmit={addClass} />
                </DialogContent>
              </Dialog>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {visibleClasses.map((classItem) => (
                <ClassCard
                  key={classItem.id}
                  classData={classItem}
                  gradesPrivate={settings.grades_private}
                  onUpdate={(updates) => updateClass(classItem.id, updates)}
                  onDelete={deleteClass}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
