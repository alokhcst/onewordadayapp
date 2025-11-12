import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { showSuccess, showError, confirm } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [isEditingLearning, setIsEditingLearning] = useState(false);
  const [editedAgeGroup, setEditedAgeGroup] = useState('');
  const [editedContext, setEditedContext] = useState('');
  const [editedExamPrep, setEditedExamPrep] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    console.log('========================================');
    console.log('PROFILE - LOAD PROFILE');
    console.log('========================================');
    console.log('  - Auth context user:', {
      username: user?.username,
      name: user?.name,
      email: user?.email,
      userId: user?.userId
    });
    
    try {
      console.log('  - Calling api.getUserProfile()...');
      const response = await api.getUserProfile();
      
      console.log('  - API Response:');
      console.log('    * Message:', response.message);
      console.log('    * Profile exists:', !!response.profile);
      console.log('    * isNew:', response.isNew);
      
      if (response.profile) {
        console.log('    * Profile data:');
        console.log('      - userId:', response.profile.userId);
        console.log('      - email:', response.profile.email);
        console.log('      - name:', response.profile.name);
        console.log('      - ageGroup:', response.profile.ageGroup);
        console.log('      - context:', response.profile.context);
        console.log('      - examPrep:', response.profile.examPrep);
      }
      
      console.log('  - Setting state...');
      setProfile(response.profile);
      
      // Use profile data, fallback to user context data
      // Priority: user.name (from Cognito attributes) > profile.name > user.username > 'User'
      const finalName = user?.name || response.profile?.name || user?.username || 'User';
      const finalEmail = user?.email || response.profile?.email || user?.username || '';
      
      console.log('  - Determining display values:');
      console.log('    * user.name:', user?.name);
      console.log('    * profile.name:', response.profile?.name);
      console.log('    * user.username:', user?.username);
      console.log('    * finalName:', finalName);
      console.log('    * finalEmail:', finalEmail);
      
      setEditedName(finalName);
      setEditedEmail(finalEmail);
      setEditedAgeGroup(response.profile?.ageGroup || '');
      setEditedContext(response.profile?.context || '');
      setEditedExamPrep(response.profile?.examPrep || '');
      setNotificationsEnabled(response.profile?.notificationPreferences?.dailyWord?.enabled !== false);
      
      console.log('  - State updated with:');
      console.log('    * editedName:', finalName);
      console.log('    * editedEmail:', finalEmail);
      console.log('    * editedAgeGroup:', response.profile?.ageGroup || '');
      console.log('    * editedContext:', response.profile?.context || '');
      console.log('========================================\n');
    } catch (error: any) {
      console.log('  - ERROR loading profile:');
      console.error('    * Error name:', error.name);
      console.error('    * Error message:', error.message);
      console.error('    * Status:', error.response?.status);
      console.error('    * Full error:', error);
      console.log('========================================\n');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    setEditedName(user?.name || profile?.name || user?.username || '');
    setEditedEmail(user?.email || profile?.email || user?.username || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedName(user?.name || profile?.name || user?.username || '');
    setEditedEmail(user?.email || profile?.email || user?.username || '');
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    console.log('========================================');
    console.log('PROFILE - SAVE PROFILE');
    console.log('========================================');
    console.log('  - editedName:', editedName);
    console.log('  - editedEmail:', editedEmail);
    
    if (!editedName.trim()) {
      console.log('  - ERROR: Name is empty');
      console.log('========================================\n');
      showError('Name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const updateData = {
        name: editedName.trim(),
        email: editedEmail.trim(),
      };
      
      console.log('  - Calling api.updateUserProfile with:', updateData);
      await api.updateUserProfile(updateData);

      console.log('  - Profile updated, reloading...');
      await loadProfile();
      
      setIsEditing(false);
      showSuccess('Profile updated successfully!');
      console.log('  - Save complete');
      console.log('========================================\n');
    } catch (error: any) {
      console.log('  - ERROR saving profile:');
      console.error('    * Error name:', error.name);
      console.error('    * Error message:', error.message);
      console.error('    * Status:', error.response?.status);
      console.error('    * Full error:', error);
      console.log('========================================\n');
      showError('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditLearningProfile = () => {
    setEditedAgeGroup(profile?.ageGroup || '');
    setEditedContext(profile?.context || '');
    setEditedExamPrep(profile?.examPrep || '');
    setIsEditingLearning(true);
  };

  const handleCancelLearningEdit = () => {
    setEditedAgeGroup(profile?.ageGroup || '');
    setEditedContext(profile?.context || '');
    setEditedExamPrep(profile?.examPrep || '');
    setIsEditingLearning(false);
  };

  const handleSaveLearningProfile = async () => {
    console.log('========================================');
    console.log('PROFILE - SAVE LEARNING PROFILE');
    console.log('========================================');
    console.log('  - editedAgeGroup:', editedAgeGroup);
    console.log('  - editedContext:', editedContext);
    console.log('  - editedExamPrep:', editedExamPrep);
    
    setIsSaving(true);
    try {
      const updates: any = {
        ageGroup: editedAgeGroup || undefined,
        context: editedContext || undefined,
      };
      
      if (editedExamPrep) {
        updates.examPrep = editedExamPrep;
      }

      console.log('  - Calling api.updateUserProfile with:', updates);
      await api.updateUserProfile(updates);

      console.log('  - Learning profile updated, reloading...');
      await loadProfile();
      
      setIsEditingLearning(false);
      showSuccess('Learning profile updated successfully!');
      console.log('  - Save complete');
      console.log('========================================\n');
    } catch (error: any) {
      console.log('  - ERROR saving learning profile:');
      console.error('    * Error name:', error.name);
      console.error('    * Error message:', error.message);
      console.error('    * Status:', error.response?.status);
      console.error('    * Full error:', error);
      console.log('========================================\n');
      showError('Failed to update learning profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    try {
      setNotificationsEnabled(value);
      
      const updatedPreferences = {
        ...profile?.notificationPreferences,
        dailyWord: {
          ...profile?.notificationPreferences?.dailyWord,
          enabled: value,
        },
      };

      await api.updateUserProfile({
        notificationPreferences: updatedPreferences,
      });
      showSuccess(value ? 'Notifications enabled' : 'Notifications disabled');
    } catch (error) {
      console.error('Error updating notifications:', error);
      setNotificationsEnabled(!value); // Revert on error
      showError('Failed to update notification preferences');
    }
  };

  const handleSignOut = async () => {
    console.log('========================================');
    console.log('PROFILE - SIGN OUT');
    console.log('========================================');
    
    const confirmed = await confirm('Are you sure you want to sign out?');

    if (!confirmed) {
      console.log('  - Sign out cancelled by user');
      console.log('========================================\n');
      return;
    }

    try {
      console.log('  - Calling signOut()...');
      await signOut();
      console.log('  - Sign out complete');
      console.log('  - Navigating to signin page...');
      
      // Navigate to sign-in page
      router.replace('/(auth)/signin');
      console.log('========================================\n');
    } catch (error: any) {
      console.log('  - ERROR signing out:');
      console.error('    * Error name:', error.name);
      console.error('    * Error message:', error.message);
      console.error('    * Full error:', error);
      console.log('========================================\n');
      showError(error.message || 'Failed to sign out');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(isEditing ? editedName : profile?.name)?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        </View>
        
        {isEditing ? (
          <View style={styles.editContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter your name"
                autoCapitalize="words"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={editedEmail}
                onChangeText={setEditedEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.editButtonsContainer}>
              <TouchableOpacity 
                style={[styles.editButton, styles.cancelButton]} 
                onPress={handleCancelEdit}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.editButton, styles.saveButton, isSaving && styles.buttonDisabled]} 
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.name}>{profile?.name || 'User'}</Text>
            <Text style={styles.email}>{profile?.email || user?.username}</Text>
            
            <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
              <Ionicons name="pencil" size={16} color="#4A90E2" />
              <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Learning Profile</Text>
          {!isEditingLearning && (
            <TouchableOpacity style={styles.sectionEditButton} onPress={handleEditLearningProfile}>
              <Ionicons name="pencil" size={18} color="#4A90E2" />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.card}>
          {isEditingLearning ? (
            <View style={styles.learningEditContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Age Group</Text>
                <View style={styles.pickerContainer}>
                  <select
                    style={webStyles.select as any}
                    value={editedAgeGroup}
                    onChange={(e) => setEditedAgeGroup(e.target.value)}
                  >
                    <option value="">Select age group</option>
                    <option value="school">School (6-18)</option>
                    <option value="college">College (18-24)</option>
                    <option value="adult">Adult (25+)</option>
                  </select>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Context</Text>
                <View style={styles.pickerContainer}>
                  <select
                    style={webStyles.select as any}
                    value={editedContext}
                    onChange={(e) => setEditedContext(e.target.value)}
                  >
                    <option value="">Select context</option>
                    <option value="academic">Academic</option>
                    <option value="professional">Professional</option>
                    <option value="personal">Personal</option>
                  </select>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Exam Prep (Optional)</Text>
                <View style={styles.pickerContainer}>
                  <select
                    style={webStyles.select as any}
                    value={editedExamPrep}
                    onChange={(e) => setEditedExamPrep(e.target.value)}
                  >
                    <option value="">None</option>
                    <option value="gre">GRE</option>
                    <option value="sat">SAT</option>
                    <option value="toefl">TOEFL</option>
                    <option value="ielts">IELTS</option>
                  </select>
                </View>
              </View>

              <View style={styles.editButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.editButton, styles.cancelButton]} 
                  onPress={handleCancelLearningEdit}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.editButton, styles.saveButton, isSaving && styles.buttonDisabled]} 
                  onPress={handleSaveLearningProfile}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Age Group</Text>
                <Text style={styles.infoValue}>
                  {profile?.ageGroup ? profile.ageGroup.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Not set'}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Context</Text>
                <Text style={styles.infoValue}>
                  {profile?.context ? profile.context.charAt(0).toUpperCase() + profile.context.slice(1) : 'Not set'}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Exam Prep</Text>
                <Text style={styles.infoValue}>
                  {profile?.examPrep ? profile.examPrep.toUpperCase() : 'None'}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {profile?.learningPatterns && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress</Text>
          
          <View style={styles.card}>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{profile.learningPatterns.totalWords}</Text>
                <Text style={styles.statLabel}>Total Words</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: '#50C878' }]}>
                  {profile.learningPatterns.practicedWords}
                </Text>
                <Text style={styles.statLabel}>Practiced</Text>
              </View>
            </View>
            {profile.learningPatterns.averageRating > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Average Rating</Text>
                  <Text style={styles.infoValue}>
                    {'⭐'.repeat(Math.round(profile.learningPatterns.averageRating))}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Daily Notifications</Text>
              <Text style={styles.settingDescription}>Get notified for daily words</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#ddd', true: '#4A90E2' }}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color="#E24A4A" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// Web-specific styles for select element
const webStyles = {
  select: {
    width: '100%',
    padding: 12,
    fontSize: 16,
    border: 'none',
    outline: 'none',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#E8F4FF',
    borderRadius: 20,
    alignSelf: 'center',
    gap: 6,
  },
  editProfileButtonText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  editContainer: {
    width: '100%',
    paddingHorizontal: 20,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionEditButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  learningEditContainer: {
    gap: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E24A4A',
  },
});

