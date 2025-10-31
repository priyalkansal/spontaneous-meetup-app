import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Linking, Animated, PanResponder, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useGroupStore } from '@/store/groupStore';
import { useUserStore } from '@/store/userStore';
import { useChatStore } from '@/store/chatStore';
import { Group } from '@/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapPin, Clock, Users as UsersIcon, Navigation, Bell } from 'lucide-react-native';
import { mockGroups } from '@/constants/mockData';
import ActivityCreateModal from '@/components/ActivityCreateModal';
import ActivityDetailsModal from '@/components/ActivityDetailsModal';
import * as Location from 'expo-location';

import MapView, { Marker, PROVIDER_APPLE } from 'react-native-maps';

const moodEmoji: Record<string, string> = { 
  coffee: '☕️', 
  food: '🍔', 
  chill: '🧘', 
  walk: '🚶‍♀️', 
  party: '⚽️', 
  movie: '🎬' 
};

export default function MapTab() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { activeGroups, setActiveGroups, joinGroup, currentUserActiveGroupId } = useGroupStore();
  const { loginEmail, profile } = useUserStore();
  const { upsertChatPreview } = useChatStore();

  const currentUserId = loginEmail || profile?.email || 'current_user_id';
  const currentUserName = profile?.fullName || 'You';
  const currentUserAvatar = (profile as any)?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format';

  const [selectedActivity, setSelectedActivity] = useState<Group | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [mapOnly, setMapOnly] = useState(false);
  const [initialRegion, setInitialRegion] = useState({
    latitude: 37.7858,
    longitude: -122.4064,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  });
  const mapRef = useRef<MapView>(null);

  useEffect(() => { if (activeGroups.length === 0) { setActiveGroups(mockGroups); } }, [activeGroups.length, setActiveGroups]);

  // Get user's current location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          const newRegion = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          };
          setInitialRegion(newRegion);
          mapRef.current?.animateToRegion(newRegion, 1000);
        }
      } catch (error) {
        console.log('Error getting location:', error);
      }
    })();
  }, []);

  const handleMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location permissions to use this feature.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    } catch (error) {
      Alert.alert('Error', 'Could not get your location. Please try again.');
    }
  };

  const now = new Date();
  const groups = activeGroups.filter(g => new Date(g.expiresAt) > now);

  const openInMaps = (lat: number, lng: number) => {
    const apple = `http://maps.apple.com/?daddr=${lat},${lng}`;
    const google = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(Platform.select({ ios: apple, android: google, default: google }) as string);
  };

  const handleMarkerPress = (group: Group) => {
    console.log('🎯 MARKER PRESSED:', group.name);
    console.log('🎯 Group object:', group);
    console.log('🎯 Before setState - showDetails:', showDetails, 'selectedActivity:', selectedActivity?.name);
    
    setSelectedActivity(group);
    setShowDetails(true);
    
    // Verify state after a small delay
    setTimeout(() => {
      console.log('🎯 After setState - showDetails should be true, selectedActivity should be:', group.name);
    }, 100);
  };

  const handleJoinActivity = () => {
    if (!selectedActivity) return;
    
    const isMember = selectedActivity.members.some(m => m.id === currentUserId);
    if (isMember) {
      router.push(`/group-chat/${selectedActivity.id}`);
      setShowDetails(false);
      return;
    }

    const existing = currentUserActiveGroupId?.[currentUserId];
    if (existing && existing !== selectedActivity.id) {
      Alert.alert('Already in an activity', 'You can only join one activity at a time. Leave your current activity before joining another.');
      return;
    }

    if (selectedActivity.members.length >= selectedActivity.maxMembers) {
      Alert.alert('Activity Full', 'This activity has reached its maximum capacity.');
      return;
    }

    joinGroup(selectedActivity.id, currentUserId, currentUserName, currentUserAvatar);
    upsertChatPreview({
      id: selectedActivity.chatId,
      userId: selectedActivity.id,
      name: selectedActivity.name,
      avatar: selectedActivity.groupAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(selectedActivity.name),
      lastMessage: 'You joined the activity',
      timestamp: new Date().toISOString(),
      unread: 0,
      isGroupChat: true,
    });
    setShowDetails(false);
    router.push(`/group-chat/${selectedActivity.id}`);
  };

  const handleLeaveActivity = () => {
    if (!selectedActivity) return;

    const isCreator = selectedActivity.createdBy === currentUserId;
    const title = isCreator ? 'Stop Activity' : 'Leave Activity';
    const message = isCreator 
      ? 'Are you sure you want to stop this activity? It will be removed from the map and you can create a new one.' 
      : 'Are you sure you want to leave this activity?';
    const buttonText = isCreator ? 'Stop' : 'Leave';
    const successMessage = isCreator ? 'Activity stopped successfully. You can now create a new activity!' : 'You have left the activity';

    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: buttonText,
          style: 'destructive',
          onPress: () => {
            if (isCreator) {
              // Creator stops the activity - remove it completely
              const { stopActivity } = useGroupStore.getState();
              stopActivity(selectedActivity.id, currentUserId);
              console.log('🛑 Creator stopped activity:', selectedActivity.name);
            } else {
              // Member leaves - just remove them from members
              const { leaveGroup } = useGroupStore.getState();
              leaveGroup(selectedActivity.id, currentUserId);
              console.log('👋 Member left activity:', selectedActivity.name);
            }
            setShowDetails(false);
            Alert.alert(title, successMessage);
          },
        },
      ]
    );
  };

  // Three snap points
  const headerSpace = 110; // space for header
  const snapTop = 0; // just under header via container translate
  const snapMid = Math.round(height * 0.28);
  const snapBottom = Math.round(height * 0.50);
  const sheetTranslateY = useRef(new Animated.Value(snapMid)).current; // from top of sheet container

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        const base = (sheetTranslateY as any)._value ?? snapMid;
        let next = base + g.dy;
        next = Math.max(snapTop, Math.min(snapBottom, next));
        sheetTranslateY.setValue(next);
      },
      onPanResponderRelease: () => {
        const current = (sheetTranslateY as any)._value ?? snapMid;
        const distances = [snapTop, snapMid, snapBottom].map(p => Math.abs(p - current));
        const nearest = [snapTop, snapMid, snapBottom][distances.indexOf(Math.min(...distances))];
        Animated.spring(sheetTranslateY, { toValue: nearest, useNativeDriver: false, bounciness: 6 }).start();
      },
    })
  ).current;
  
  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
        <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.container}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ color: Colors.white, fontSize: 24, fontWeight: '800' }}>Ready to</Text>
            <Text style={{ color: Colors.secondary, fontSize: 32, fontWeight: '900' }}>hang out?</Text>
          </View>
          
          {/* Notifications Bell */}
          <TouchableOpacity 
            style={styles.notificationBell}
            onPress={() => router.push('/notifications')}
          >
            <Bell size={24} color={Colors.white} />
            {/* Notification Badge */}
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>2</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Map */}
        <View style={[styles.mapContainer, { height: height - 130 }]}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_APPLE}
            style={{ flex: 1 }}
            initialRegion={initialRegion}
            onPress={() => {
              if (!mapOnly) {
                console.log('Map pressed, setting mapOnly to true');
                setMapOnly(true);
              }
            }}
            showsUserLocation
          >
            {groups.map((g) => {
              const participantCount = g.members.length;
              const isPopular = participantCount >= 3;
              // Use custom emoji if available, otherwise fall back to mood emoji
              const displayEmoji = g.emoji || moodEmoji[g.mood] || '📍';
              return (
                <Marker 
                  key={g.id} 
                  coordinate={g.location} 
                  onPress={(e) => {
                    e.stopPropagation();
                    handleMarkerPress(g);
                  }}
                  tracksViewChanges={false}
                >
                  <View style={[styles.markerPill, isPopular && styles.markerPillPopular]}>
                    <Text style={{ fontSize: isPopular ? 24 : 20 }}>{displayEmoji}</Text>
                  </View>
                </Marker>
              );
            })}
          </MapView>

          {mapOnly && (
            <TouchableOpacity style={{ position:'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }} onPress={() => setMapOnly(false)}>
              <Text style={{ color: Colors.white, fontWeight: '700' }}>Back</Text>
            </TouchableOpacity>
          )}

          {/* My Location Button */}
          <TouchableOpacity style={styles.myLocationButton} onPress={handleMyLocation}>
            <Navigation size={22} color={Colors.primary} />
          </TouchableOpacity>

          {/* Floating + */}
          <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
            <Text style={styles.fabPlus}>+</Text>
          </TouchableOpacity>
      </View>
      
        {/* Draggable Bottom Sheet (hidden in mapOnly mode) */}
        {!mapOnly && (
          <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]} {...panResponder.panHandlers}>
            <View style={{ alignItems: 'center', paddingBottom: 6 }}>
              <View style={styles.grabber} />
            </View>
            {selectedActivity ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sheetTitle}>{selectedActivity.name}</Text>
                <View style={styles.cardRow}>
                  <Text style={styles.moodText}>{selectedActivity.emoji || moodEmoji[selectedActivity.mood] || '📍'}</Text>
                  <Text style={styles.cardName}>{selectedActivity.mood.charAt(0).toUpperCase() + selectedActivity.mood.slice(1)}</Text>
                </View>
                <View style={[styles.cardRow, { marginTop: 6 }] }>
                  <UsersIcon size={14} color={Colors.darkGray} />
                  <Text style={styles.meta}>{selectedActivity.members.length}/{selectedActivity.maxMembers} people</Text>
                </View>
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => openInMaps(selectedActivity.location.latitude, selectedActivity.location.longitude)}>
                    <Text style={styles.secondaryText}>Open in Maps</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => handleMarkerPress(selectedActivity)}>
                    <Text style={styles.primaryText}>View Details</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={[styles.secondaryBtn, { marginTop: 10 }]} onPress={() => setSelectedActivity(null)}>
                  <Text style={styles.secondaryText}>Back to Activities</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <>
                <Text style={styles.sheetTitle}>Activities Nearby</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {groups.map(g => {
                    const displayEmoji = g.emoji || moodEmoji[g.mood] || '📍';
                    return (
                      <View key={g.id} style={styles.card}>
                        <View style={styles.cardRow}>
                          <View style={styles.moodPill}><Text style={styles.moodText}>{displayEmoji}</Text></View>
                          <Text style={styles.cardName}>{g.name}</Text>
                        </View>
                      <View style={[styles.cardRow, { marginTop: 6 }] }>
                        <UsersIcon size={14} color={Colors.darkGray} />
                        <Text style={styles.meta}>{g.members.length}/{g.maxMembers} people</Text>
                        <Clock size={12} color={Colors.darkGray} />
                        <Text style={styles.meta}>{Math.max(1, Math.floor((new Date(g.expiresAt).getTime() - now.getTime()) / 60000))}m left</Text>
                      </View>
                      <View style={styles.actionsRow}>
                        <TouchableOpacity style={styles.secondaryBtn} onPress={() => openInMaps(g.location.latitude, g.location.longitude)}>
                          <Text style={styles.secondaryText}>Open in Maps</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.primaryBtn} onPress={() => handleMarkerPress(g)}>
                          <Text style={styles.primaryText}>View Details</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </Animated.View>
        )}
        </LinearGradient>
      </SafeAreaView>

      {/* Modals rendered outside SafeAreaView for proper z-index */}
      <ActivityCreateModal visible={showCreate} onClose={() => setShowCreate(false)} />

      {console.log('🔍 RENDERING ActivityDetailsModal - visible:', showDetails, 'activity:', selectedActivity?.name, 'activityObj:', selectedActivity)}
      
      <ActivityDetailsModal
        visible={showDetails}
        activity={selectedActivity}
        onClose={() => {
          console.log('🚪 CLOSING modal');
          setShowDetails(false);
        }}
        onJoin={handleJoinActivity}
        onLeave={handleLeaveActivity}
        isUserMember={selectedActivity ? selectedActivity.members.some(m => m.id === currentUserId) : false}
        currentUserId={currentUserId}
      />

    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1, marginHorizontal: 8, marginBottom: 8, borderRadius: 20, overflow: 'hidden', backgroundColor: Colors.white, position: 'relative' },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' },
  markerPill: { backgroundColor: Colors.white, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3 },
  markerPillPopular: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 25, borderWidth: 2, borderColor: Colors.secondary, shadowColor: Colors.secondary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 8 },
  mapTitle: { fontSize: 18, fontWeight: '800', color: Colors.primary, marginTop: 8 },
  mapSub: { color: Colors.darkGray, marginTop: 4 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: Colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6, maxHeight: '70%' },
  grabber: { width: 50, height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.2)' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: Colors.black, marginBottom: 12 },
  card: { backgroundColor: Colors.lightGray, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moodPill: { backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  moodText: { fontSize: 16 },
  cardName: { color: Colors.black, fontWeight: '700', fontSize: 16, flex: 1 },
  meta: { color: Colors.darkGray, fontSize: 12, marginRight: 10 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  secondaryBtn: { flex: 1, backgroundColor: Colors.lightGray, borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  secondaryText: { color: Colors.darkGray, fontWeight: '700' },
  primaryBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  primaryText: { color: Colors.black, fontWeight: '800' },
  myLocationButton: { position:'absolute', bottom: 100, right: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.white, alignItems:'center', justifyContent:'center', shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.25, shadowRadius:4, elevation:5 },
  fab: { position:'absolute', bottom: 30, right: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.secondary, alignItems:'center', justifyContent:'center', shadowColor:'#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.3, shadowRadius:4, elevation:6 },
  fabPlus: { color: Colors.black, fontSize: 30, lineHeight: 30, fontWeight:'900' },
  notificationBell: { position: 'relative', padding: 8 },
  notificationBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: Colors.secondary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  notificationBadgeText: { color: Colors.black, fontSize: 12, fontWeight: '800' },
});
