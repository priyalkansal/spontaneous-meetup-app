import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ActionSheetIOS } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useGroupStore } from '@/store/groupStore';
import { useUserStore } from '@/store/userStore';
import { GroupMessage } from '@/types';
import { Send, ArrowLeft, Flag, LogOut, X, Plus, Camera, ImageIcon } from 'lucide-react-native';

export const options = { headerShown: false };

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { groups, groupMessages, addGroupMessage, leaveGroup } = useGroupStore();
  const { loginEmail, profile } = useUserStore();
  const currentUserId = loginEmail || profile?.email || 'current_user_id';

  const [messageText, setMessageText] = useState('');
  const [group, setGroup] = useState<any>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [showMembersSheet, setShowMembersSheet] = useState(false);

  useEffect(() => {
    const foundGroup = groups.find(g => g.id === id);
    if (foundGroup) {
      setGroup(foundGroup);
      setMessages(groupMessages[id as string] || []);
      const isMember = foundGroup.members.some(m => m.id === currentUserId);
      if (!isMember) {
        Alert.alert('Not a member', 'You are no longer part of this group.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/map') }
        ]);
      }
    }
  }, [id, groups, groupMessages, currentUserId]);

  const handleSendMessage = () => {
    if (messageText.trim() && group) {
      const newMessage: GroupMessage = {
        id: `msg_${Date.now()}`,
        groupId: group.id,
        senderId: currentUserId,
        senderName: profile?.fullName || 'You',
        text: messageText.trim(),
        timestamp: new Date().toISOString(),
      };
      addGroupMessage(group.id, newMessage);
      setMessageText('');
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          if (group) {
            leaveGroup(group.id, currentUserId);
            router.replace('/(tabs)/map');
          }
        },
      },
    ]);
  };

  const handleReportGroup = () => {
    Alert.alert('Report Group', 'This group has been reported for review.');
  };

  const handleImageUpload = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takePhoto();
          } else if (buttonIndex === 2) {
            pickImage();
          }
        }
      );
    } else {
      // Android: Show custom alert
      Alert.alert(
        'Upload Image',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: takePhoto },
          { text: 'Choose from Library', onPress: pickImage },
        ]
      );
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        sendImageMessage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
      console.error('Camera error:', error);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Photo library permission is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        sendImageMessage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error('Image picker error:', error);
    }
  };

  const sendImageMessage = (imageUri: string) => {
    if (group) {
      const newMessage = {
        id: `msg_${Date.now()}`,
        groupId: group.id,
        senderId: currentUserId,
        senderName: profile?.fullName || 'You',
        text: '📷 Photo',
        imageUri: imageUri,
        timestamp: new Date().toISOString(),
      } as GroupMessage;
      addGroupMessage(group.id, newMessage);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateAge = (dobString?: string) => {
    if (!dobString) return '';
    try {
      const [day, month, year] = dobString.split('/').map(Number);
      const dob = new Date(year, month - 1, day);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      return age;
    } catch {
      return '';
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.white} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.headerInfo} onPress={() => router.push(`/group-details/${group.id}`)}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.memberCount}>Tap to view {group.members.length} members</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleReportGroup}>
              <Flag size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView 
            style={styles.messagesContainer} 
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Start the conversation!</Text>
              </View>
            ) : (
            messages.map((message) => (
              <View key={message.id} style={[styles.messageContainer, message.senderId === currentUserId && styles.ownMessage]}>
                {message.senderId !== currentUserId && (
                  <Text style={styles.senderName}>{message.senderName}</Text>
                )}
                <View style={[styles.messageBubble, message.senderId === currentUserId && styles.ownMessageBubble, (message as any).imageUri && styles.imageBubble]}>
                  {(message as any).imageUri ? (
                    <Image 
                      source={{ uri: (message as any).imageUri }} 
                      style={styles.messageImage}
                      contentFit="cover"
                    />
                  ) : (
                    <Text style={[styles.messageText, message.senderId === currentUserId && styles.ownMessageText]}>
                      {message.text}
                    </Text>
                  )}
                </View>
                <Text style={styles.messageTime}>{formatTime(message.timestamp)}</Text>
              </View>
            ))
            )}
          </ScrollView>

          {/* Input */}
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.plusButton}
              onPress={handleImageUpload}
            >
              <Plus size={24} color={Colors.white} />
            </TouchableOpacity>
            
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={Colors.gray}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
            />
            
            <TouchableOpacity
              style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!messageText.trim()}
            >
              <Send size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Members Sheet (Instagram-style) */}
          {showMembersSheet && (
            <View style={styles.membersSheetOverlay}>
              <TouchableOpacity style={styles.membersSheetBackdrop} onPress={() => setShowMembersSheet(false)} />
              <View style={styles.membersSheet}>
                <View style={styles.membersSheetHeader}>
                  <Text style={styles.membersSheetTitle}>Members</Text>
                  <TouchableOpacity onPress={() => setShowMembersSheet(false)}>
                    <X size={24} color={Colors.black} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
                  {group.members.map((member: any, index: number) => (
                    <View key={member.id || index} style={styles.memberRow}>
                      <Image source={{ uri: member.avatar }} style={styles.memberAvatar} />
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{member.name}</Text>
                        {member.dateOfBirth && (
                          <Text style={styles.memberAge}>{calculateAge(member.dateOfBirth)} years old</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.membersSheetActions}>
                  <TouchableOpacity style={styles.leaveGroupButton} onPress={handleLeaveGroup}>
                    <LogOut size={18} color={Colors.white} />
                    <Text style={styles.leaveGroupText}>Leave Group</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.reportGroupButton} onPress={handleReportGroup}>
                    <Flag size={18} color="#FF3B30" />
                    <Text style={styles.reportGroupText}>Report Group</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, color: Colors.white, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  backButton: { marginRight: 12 },
  headerInfo: { flex: 1 },
  groupName: { fontSize: 18, fontWeight: 'bold', color: Colors.white },
  memberCount: { fontSize: 12, color: Colors.secondary, marginTop: 2 },
  messagesContainer: { flex: 1 },
  messagesContent: { paddingVertical: 16, paddingHorizontal: 16 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 18, color: Colors.white, fontWeight: '600', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: Colors.secondary },
  messageContainer: { marginBottom: 16 },
  ownMessage: { alignItems: 'flex-end' },
  senderName: { fontSize: 12, color: Colors.secondary, marginBottom: 4, marginLeft: 12 },
  messageBubble: { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, maxWidth: '80%' },
  ownMessageBubble: { backgroundColor: Colors.secondary },
  messageText: { fontSize: 16, color: Colors.white, lineHeight: 20 },
  ownMessageText: { color: Colors.black },
  messageTime: { fontSize: 10, color: Colors.secondary, marginTop: 4, marginLeft: 12 },
  imageBubble: { padding: 4, backgroundColor: 'transparent' },
  messageImage: { width: 200, height: 200, borderRadius: 12 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' },
  plusButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  textInput: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: Colors.white, maxHeight: 100, marginRight: 8 },
  sendButton: { backgroundColor: Colors.secondary, borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: Colors.gray },
  
  // Members Sheet (Instagram-style)
  membersSheetOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  membersSheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  membersSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 20 },
  membersSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  membersSheetTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.black },
  membersList: { maxHeight: 300 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  memberAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600', color: Colors.black },
  memberAge: { fontSize: 14, color: Colors.darkGray, marginTop: 2 },
  membersSheetActions: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  leaveGroupButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, gap: 8 },
  leaveGroupText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  reportGroupButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.lightGray, borderRadius: 12, paddingVertical: 14, gap: 8 },
  reportGroupText: { color: '#FF3B30', fontSize: 16, fontWeight: 'bold' },
});
