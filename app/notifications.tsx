import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { ArrowLeft, Bell, Clock, MapPin, Users, TrendingUp } from 'lucide-react-native';

export default function NotificationsScreen() {
  const router = useRouter();

  const notifications = [
    {
      id: 1,
      type: 'new_activity',
      emoji: '☕',
      title: 'New Coffee Meetup!',
      description: '3 people are meeting for coffee 0.5km away',
      time: '2 minutes ago',
      icon: Bell,
    },
    {
      id: 2,
      type: 'popular',
      emoji: '⚽',
      title: 'Soccer Game Getting Popular!',
      description: '5 people joined the soccer game nearby',
      time: '15 minutes ago',
      icon: TrendingUp,
    },
    {
      id: 3,
      type: 'reminder',
      emoji: '🎬',
      title: 'Movie Night Starting Soon',
      description: 'Your movie group meets in 30 minutes',
      time: '1 hour ago',
      icon: Clock,
    },
    {
      id: 4,
      type: 'trending',
      emoji: '🚶‍♀️',
      title: 'Walking Group Trending',
      description: 'Walking groups are popular in your area today',
      time: '2 hours ago',
      icon: TrendingUp,
    },
    {
      id: 5,
      type: 'nearby',
      emoji: '🍔',
      title: 'Food Hangout Nearby',
      description: '2 people are meeting for lunch 1km away',
      time: '3 hours ago',
      icon: MapPin,
    },
    {
      id: 6,
      type: 'group_update',
      emoji: '🧘',
      title: 'Chill Session Updated',
      description: 'Location changed for your chill session',
      time: '5 hours ago',
      icon: Users,
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
      <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Notifications List */}
        <ScrollView 
          style={styles.notificationsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.notificationsContent}
        >
          {notifications.map((notification) => {
            const IconComponent = notification.icon;
            return (
              <TouchableOpacity 
                key={notification.id} 
                style={styles.notificationItem}
                activeOpacity={0.7}
              >
                <View style={styles.notificationIcon}>
                  <Text style={styles.notificationEmoji}>{notification.emoji}</Text>
                </View>
                
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <View style={styles.iconBadge}>
                      <IconComponent size={14} color={Colors.secondary} />
                    </View>
                  </View>
                  <Text style={styles.notificationDescription}>{notification.description}</Text>
                  <Text style={styles.notificationTime}>{notification.time}</Text>
                </View>

                {/* Unread Indicator */}
                {notification.id <= 2 && (
                  <View style={styles.unreadDot} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Clear All Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear All Notifications</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
  },
  notificationsList: {
    flex: 1,
  },
  notificationsContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationEmoji: {
    fontSize: 24,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    flex: 1,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 214, 10, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  notificationDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 6,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: '600',
  },
  unreadDot: {
    position: 'absolute',
    top: 20,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  clearButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  clearButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

