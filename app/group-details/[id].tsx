import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useGroupStore } from '@/store/groupStore';
import { useUserStore } from '@/store/userStore';
import { useChatStore } from '@/store/chatStore';
import { ArrowLeft, Camera, MapPin, Clock } from 'lucide-react-native';

export const options = { headerShown: false };

export default function GroupDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { groups, updateGroup } = useGroupStore();
  const { loginEmail, profile } = useUserStore();
  const { upsertChatPreview } = useChatStore();
  const currentUserId = loginEmail || profile?.email || 'current_user_id';

  const [group, setGroup] = useState<any>(null);

  useEffect(() => {
    const foundGroup = groups.find(g => g.id === id);
    if (foundGroup) {
      setGroup(foundGroup);
    }
  }, [id, groups]);

  const calculateAge = (dobString?: string) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const handleGroupAvatarPress = async () => {
    if (!group || group.createdBy !== currentUserId) {
      Alert.alert('Permission Denied', 'Only the activity creator can change the group picture.');
      return;
    }

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
        const newAvatar = result.assets[0].uri;
        
        // Update group avatar
        const updatedGroup = { ...group, groupAvatar: newAvatar };
        updateGroup(updatedGroup);
        setGroup(updatedGroup);
        
        // Update chat preview avatar
        upsertChatPreview({
          id: group.chatId,
          userId: group.id,
          name: group.name,
          avatar: newAvatar,
          lastMessage: 'Group picture updated',
          timestamp: new Date().toISOString(),
          unread: 0,
          isGroupChat: true,
        });
        
        Alert.alert('Success', 'Group picture updated!');
        console.log('Group avatar updated:', newAvatar);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error('Image picker error:', error);
    }
  };

  if (!group) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
        <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.container}>
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Group not found</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const isCreator = group.createdBy === currentUserId;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
      <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Group Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity 
              onPress={handleGroupAvatarPress} 
              style={styles.avatarContainer}
              disabled={!isCreator}
            >
              <Image
                source={{ uri: group.groupAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&size=200&background=random` }}
                style={styles.groupAvatar}
              />
              {isCreator && (
                <View style={styles.cameraIconContainer}>
                  <Camera size={20} color={Colors.white} />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupEmoji}>{group.emoji || '✨'}</Text>
          </View>

          {/* Activity Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <MapPin size={18} color={Colors.secondary} />
              <Text style={styles.infoText}>{group.meetingLocation}</Text>
            </View>
            <View style={styles.infoRow}>
              <Clock size={18} color={Colors.secondary} />
              <Text style={styles.infoText}>
                Expires {new Date(group.expiresAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>

          {/* Members Section */}
          <View style={styles.membersSection}>
            <Text style={styles.sectionTitle}>Members ({group.members.length}/{group.maxMembers})</Text>
            
            {group.members.map((member: any, index: number) => {
              const age = calculateAge(member.dateOfBirth);
              const isActivityCreator = member.id === group.createdBy;
              const avatarUrl = member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}`;
              
              return (
                <View key={member.id || index} style={styles.memberCard}>
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.memberAvatar}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      {isActivityCreator && (
                        <View style={styles.creatorBadge}>
                          <Text style={styles.creatorText}>Creator</Text>
                        </View>
                      )}
                    </View>
                    {age && <Text style={styles.memberAge}>{age} years old</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.white,
    fontSize: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  content: {
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  groupAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: Colors.secondary,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.secondary,
  },
  groupName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  groupEmoji: {
    fontSize: 40,
  },
  infoSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    color: Colors.white,
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  membersSection: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 20,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  memberAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.black,
    marginRight: 8,
  },
  memberAge: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  creatorBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  creatorText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});

