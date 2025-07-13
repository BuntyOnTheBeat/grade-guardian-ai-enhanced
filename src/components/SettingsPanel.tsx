import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LogOut, Eye, EyeOff, Zap, ChevronRight, ArrowLeft, ChevronsUpDown, Settings } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import CreditsPanel from './CreditsPanel';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface Class {
  id: string;
  name: string;
  visible?: boolean;
}

interface SettingsPanelProps {
  onClose?: () => void;
}

const SettingsPanel = ({ onClose }: SettingsPanelProps) => {
  const { settings, updateSettings, loading } = useUserSettings();
  const { user, signOut } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [currentView, setCurrentView] = useState<'main' | 'credits'>('main');
  const [isVisibilityOpen, setIsVisibilityOpen] = useState(true);

  useEffect(() => {
    if (user) {
      fetchClasses();
    }
  }, [user]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, visible')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const toggleClassVisibility = async (classId: string, visible: boolean) => {
    try {
      const { error } = await supabase
        .from('classes')
        .update({ visible })
        .eq('id', classId);

      if (error) throw error;
      setClasses(classes.map(cls =>
        cls.id === classId ? { ...cls, visible } : cls
      ));
    } catch (error) {
      console.error('Error updating class visibility:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (currentView === 'credits') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <Button 
            variant="ghost" 
            onClick={() => setCurrentView('main')}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
          <h2 className="text-lg font-semibold">Credits & Usage</h2>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>
        <ScrollArea className="flex-1">
          <div className="p-6">
            <CreditsPanel />
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage your preferences and account settings
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Privacy Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Privacy</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="private-grades">Private Grades</Label>
                <p className="text-sm text-gray-500">
                  Hide grades on dashboard unless clicked
                </p>
              </div>
              <Switch
                id="private-grades"
                checked={settings.grades_private}
                onCheckedChange={(value) => updateSettings({ grades_private: value })}
              />
            </div>
          </div>

          <Separator />

          {/* AI Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">AI Analysis</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="gpt4-vision">GPT-4 Vision for Images</Label>
                  {!settings.has_premium_subscription && (
                    <Badge variant="secondary" className="text-xs">Pro Only</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Use advanced GPT-4 Vision for image analysis (Pro users only)
                </p>
              </div>
              <Switch
                id="gpt4-vision"
                checked={settings.use_gpt4_vision && settings.has_premium_subscription}
                onCheckedChange={(value) => updateSettings({ use_gpt4_vision: value })}
                disabled={!settings.has_premium_subscription}
              />
            </div>
            {!settings.has_premium_subscription && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Upgrade to Pro</h4>
                <p className="text-sm text-blue-700">
                  Get access to GPT-4 Vision for advanced image analysis. Free and Student plans use OCR + GPT-3.5 for images.
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Class Visibility */}
          <div className="space-y-4">
            <Collapsible
              open={isVisibilityOpen}
              onOpenChange={setIsVisibilityOpen}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Class Visibility</Label>
                  <p className="text-sm text-gray-500">
                    Control which classes appear on your dashboard
                  </p>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-9 p-0">
                    <ChevronsUpDown className="h-4 w-4" />
                    <span className="sr-only">Toggle</span>
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="space-y-3">
                {loadingClasses ? (
                  <div className="text-sm text-gray-500">Loading classes...</div>
                ) : classes.length === 0 ? (
                  <div className="text-sm text-gray-500">No classes found</div>
                ) : (
                  <div className="space-y-3">
                    {classes.map((classItem) => (
                      <div key={classItem.id} className="flex items-center justify-between">
                        <span className="text-sm">{classItem.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleClassVisibility(classItem.id, !classItem.visible)}
                          className="p-2"
                        >
                          {classItem.visible !== false ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>

          <Separator />

          {/* Credits */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              onClick={() => setCurrentView('credits')}
              className="w-full justify-between hover:bg-blue-50"
            >
              <div className="flex items-center">
                <Zap className="h-4 w-4 mr-2 text-blue-600" />
                <span>Credits & Usage</span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </Button>
          </div>

          <Separator />

          {/* Sign Out */}
          <div className="pt-2">
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full justify-start text-red-600 hover:text-red-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default SettingsPanel;
