
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserSettings {
  grades_private: boolean;
  has_premium_subscription: boolean; // Keep for backward compatibility, represents Pro subscription
  use_gpt4_vision: boolean;
}

export const useUserSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    grades_private: false,
    has_premium_subscription: false,
    use_gpt4_vision: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          grades_private: data.grades_private || false,
          has_premium_subscription: data.has_premium_subscription || false,
          use_gpt4_vision: data.use_gpt4_vision || false,
        });
      } else {
        // Create default settings if none exist
        await createDefaultSettings();
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
      // Try to create default settings even if fetch failed
      await createDefaultSettings();
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    try {
      const defaultSettings = {
        user_id: user?.id,
        grades_private: false,
        has_premium_subscription: false,
        use_gpt4_vision: false,
      };

      const { error } = await supabase
        .from('user_settings')
        .insert(defaultSettings);

      if (error) throw error;
      
      setSettings({
        grades_private: false,
        has_premium_subscription: false,
        use_gpt4_vision: false,
      });
    } catch (error) {
      console.error('Error creating default settings:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      // Use upsert to handle both updates and inserts
      const settingsToUpsert = {
        user_id: user?.id,
        ...newSettings,
      };

      const { error } = await supabase
        .from('user_settings')
        .upsert(settingsToUpsert, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setSettings(prev => ({ ...prev, ...newSettings }));
    } catch (error) {
      console.error('Error updating user settings:', error);
    }
  };

  return { settings, updateSettings, loading };
};
