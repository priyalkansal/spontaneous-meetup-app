import React, { useState } from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useUserStore } from '@/store/userStore';
import { useGroupStore } from '@/store/groupStore';
import { useChatStore } from '@/store/chatStore';
import { Settings, LogOut, Instagram, Users, Bell, Camera, Clock } from 'lucide-react-native';
import AppSettingsModal from '../components/AppSettingsModal';
import PastActivitiesModal from '@/components/PastActivitiesModal';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, visibleTo, setVisibleTo, instagramConnected, setInstagramConnected, setProfile, maxAgeDifference = 5, setMaxAgeDifference, setProfileAvatar } = useUserStore();
  const { updateUserAvatar } = useGroupStore();
  const { chats, upsertChatPreview } = useChatStore();
  const currentUserId = profile?.email || '';
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [profileImage, setProfileImage] = useState(profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [pastActivitiesVisible, setPastActivitiesVisible] = useState(false);
  
  const toggleVisibility = () => {
    setVisibleTo(visibleTo === 'friends' ? 'everyone' : 'friends');
  };
  
  const toggleNotifications = () => {
    setNotificationsEnabled(previous => !previous);
  };
  
  const handleConnectInstagram = () => {
    // In a real app, this would open Instagram OAuth flow
    setInstagramConnected(!instagramConnected);
  };

  const handleProfilePicturePress = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const newAvatarUri = result.assets[0].uri;
        setProfileImage(newAvatarUri);
        setProfileAvatar(newAvatarUri);
        
        // Update avatar in ALL existing groups where this user is a member
        updateUserAvatar(currentUserId, newAvatarUri);
        
        // Update avatar in ALL chat previews for groups where this user is a member
        chats.forEach(chat => {
          if (chat.isGroupChat) {
            // Update the chat preview avatar if needed
            upsertChatPreview({
              ...chat,
              avatar: chat.avatar, // Keep group avatar, not user avatar
            });
          }
        });
        
        console.log('✅ Profile picture updated everywhere:', newAvatarUri);
        Alert.alert('Success', 'Profile picture updated in all your activities!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error('Image picker error:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            // Clear user data and navigate to login
            setProfile(null);
            router.replace('/login');
          },
        },
      ]
    );
  };
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
      <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.container}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          <View style={styles.profileContainer}>
            <TouchableOpacity onPress={handleProfilePicturePress} style={styles.profileImageContainer}>
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
              <View style={styles.cameraIconContainer}>
                <Camera size={16} color={Colors.white} />
              </View>
            </TouchableOpacity>
            <Text style={styles.name}>{profile?.fullName || 'User'}</Text>
            <Text style={styles.username}>{profile?.email || 'user@example.com'}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.isEmailVerified ? '✓' : '✗'}</Text>
            <Text style={styles.statLabel}>Email</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.isPhotoVerified ? '✓' : '✗'}</Text>
            <Text style={styles.statLabel}>Photo</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.instagramUsername ? '✓' : '✗'}</Text>
            <Text style={styles.statLabel}>Instagram</Text>
          </View>
        </View>
        
        {profile?.gender && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>Gender: {profile.gender}</Text>
          </View>
        )}
        
        {profile?.instagramUsername && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>Instagram: @{profile.instagramUsername}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.settingsContainer}>
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#E91E63' }]}>
              <Users size={20} color={Colors.white} />
            </View>
            <Text style={styles.settingText}>Visible to Everyone</Text>
          </View>
          <Switch
            trackColor={{ false: Colors.gray, true: Colors.secondary }}
            thumbColor={Colors.white}
            ios_backgroundColor={Colors.gray}
            onValueChange={toggleVisibility}
            value={visibleTo === 'everyone'}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#9C27B0' }]}>
              <Bell size={20} color={Colors.white} />
            </View>
            <Text style={styles.settingText}>Notifications</Text>
          </View>
          <Switch
            trackColor={{ false: Colors.gray, true: Colors.secondary }}
            thumbColor={Colors.white}
            ios_backgroundColor={Colors.gray}
            onValueChange={toggleNotifications}
            value={notificationsEnabled}
          />
        </View>
        
        <TouchableOpacity style={styles.settingItem} onPress={handleConnectInstagram}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#2196F3' }]}>
              <Instagram size={20} color={Colors.white} />
            </View>
            <Text style={styles.settingText}>Connect Instagram</Text>
          </View>
          {instagramConnected ? (
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          ) : (
            <View style={styles.connectButton}>
              <Text style={styles.connectText}>Connect</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => setSettingsVisible(true)}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#4CAF50' }]}> 
              <Settings size={20} color={Colors.white} />
            </View>
            <Text style={styles.settingText}>App Settings</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={() => setPastActivitiesVisible(true)}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#FF9800' }]}> 
              <Clock size={20} color={Colors.white} />
            </View>
            <Text style={styles.settingText}>Past Activities</Text>
          </View>
        </TouchableOpacity>
        
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LogOut size={20} color={Colors.white} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
      </View>
      <AppSettingsModal 
        visible={settingsVisible}
        initialMaxAgeDiff={maxAgeDifference}
        onClose={() => setSettingsVisible(false)}
        onSave={setMaxAgeDifference}
      />
      <PastActivitiesModal
        visible={pastActivitiesVisible}
        onClose={() => setPastActivitiesVisible(false)}
      />
    </ScrollView>
    </LinearGradient>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },
  username: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.8,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '60%',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.8,
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    alignSelf: 'center',
  },
  infoText: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
  },
  settingsContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    fontSize: 16,
    color: Colors.black,
  },
  connectButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  connectText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  connectedBadge: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  connectedText: {
    color: Colors.darkGray,
    fontWeight: 'bold',
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 30,
  },
  logoutText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});