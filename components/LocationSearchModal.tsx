import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import * as Location from 'expo-location';
import Colors from '@/constants/colors';
import { X, Search, MapPin } from 'lucide-react-native';

interface LocationSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: { latitude: number; longitude: number }, locationName: string) => void;
}

export default function LocationSearchModal({ visible, onClose, onSelectLocation }: LocationSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  console.log('LocationSearchModal render, visible:', visible);

  // Auto-search as user types with debounce
  React.useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch();
      }, 800); // Wait 800ms after user stops typing
    } else if (searchQuery.trim().length === 0) {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    if (searchQuery.trim().length < 3) {
      return;
    }

    console.log('Starting search for:', searchQuery);
    setIsSearching(true);
    
    try {
      // Get user's current location for radius filtering
      let userLocation: { latitude: number; longitude: number } | null = null;
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          userLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
        }
      } catch (locError) {
        console.log('Could not get user location for filtering:', locError);
      }

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Search timeout')), 15000)
      );

      console.log('Calling geocodeAsync...');
      
      // Try multiple search variations to get more results
      const searchVariations = [
        searchQuery,
        `${searchQuery}, nearby`,
        `${searchQuery} area`,
      ];

      let allResults: any[] = [];

      for (const variation of searchVariations) {
        try {
          const results = await Promise.race([
            Location.geocodeAsync(variation),
            timeoutPromise
          ]) as any[];
          
          if (results && results.length > 0) {
            allResults = [...allResults, ...results];
          }
        } catch (err) {
          console.log(`Variation "${variation}" failed:`, err);
        }
      }

      console.log('Total geocode results:', allResults.length);

      if (allResults.length > 0) {
        console.log('Found results, processing...');
        
        // Remove duplicates based on proximity (within 100m)
        const uniqueResults: any[] = [];
        for (const result of allResults) {
          const isDuplicate = uniqueResults.some(unique => {
            const distance = calculateDistance(
              result.latitude,
              result.longitude,
              unique.latitude,
              unique.longitude
            );
            return distance < 0.1; // Less than 100 meters
          });
          
          if (!isDuplicate) {
            uniqueResults.push(result);
          }
        }

        // Filter by 50km radius if user location available
        let filteredResults = uniqueResults;
        if (userLocation) {
          filteredResults = uniqueResults.filter(result => {
            const distance = calculateDistance(
              userLocation!.latitude,
              userLocation!.longitude,
              result.latitude,
              result.longitude
            );
            return distance <= 50; // Within 50km
          });
        }

        // Limit to top 8 results
        const topResults = filteredResults.slice(0, 8);

        // Get better names using reverse geocoding
        const formattedResults = await Promise.all(
          topResults.map(async (result, index) => {
            try {
              const reverseResults = await Location.reverseGeocodeAsync({
                latitude: result.latitude,
                longitude: result.longitude,
              });

              if (reverseResults && reverseResults.length > 0) {
                const place = reverseResults[0];
                const parts = [
                  place.name,
                  place.street,
                  place.city || place.subregion,
                  place.region,
                ].filter(Boolean);
                
                const displayName = parts.length > 0 
                  ? parts.slice(0, 3).join(', ') 
                  : `${searchQuery} (Location ${index + 1})`;

                return {
                  ...result,
                  displayName,
                };
              }
            } catch (reverseError) {
              console.log('Reverse geocoding failed for result:', reverseError);
            }

            return {
              ...result,
              displayName: `${searchQuery} (Location ${index + 1})`,
            };
          })
        );

        console.log('Formatted results:', formattedResults.length);
        setSearchResults(formattedResults);
        setIsSearching(false);

        if (formattedResults.length === 0 && userLocation) {
          Alert.alert('No Nearby Results', 'No locations found within 50km. Try a different search term.');
        }
      } else {
        console.log('No results found');
        setIsSearching(false);
        Alert.alert('No Results', 'No locations found. Try a different search term.');
        setSearchResults([]);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      setIsSearching(false);
      if (error.message === 'Search timeout') {
        Alert.alert('Search Timeout', 'The search is taking too long. Please try again or use a more specific location.');
      } else {
        Alert.alert('Search Error', `Could not search for location: ${error.message || 'Unknown error'}. Please check your internet connection and try again.`);
      }
      setSearchResults([]);
    }
  };

  // Helper function to calculate distance between two coordinates (in km)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleSelectResult = (result: any) => {
    const coordinate = {
      latitude: result.latitude,
      longitude: result.longitude,
    };
    onSelectLocation(coordinate, result.displayName);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      onRequestClose={handleClose}
      transparent={false}
      statusBarTranslucent={false}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <X size={28} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search Location</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Type to search... (e.g., Central Park)"
              placeholderTextColor={Colors.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoFocus
            />
            {isSearching && <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 8 }} />}
          </View>
        </View>

        {/* Search Results */}
        <ScrollView style={styles.resultsContainer} keyboardShouldPersistTaps="handled">
          {searchResults.length > 0 ? (
            <>
              <Text style={styles.resultsTitle}>Search Results</Text>
              {searchResults.map((result, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.resultItem}
                  onPress={() => handleSelectResult(result)}
                >
                  <View style={styles.resultIconContainer}>
                    <MapPin size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.resultTextContainer}>
                    <Text style={styles.resultName}>{result.displayName}</Text>
                    <Text style={styles.resultCoords}>
                      {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Search size={48} color={Colors.gray} />
              <Text style={styles.emptyTitle}>Search for a Location</Text>
              <Text style={styles.emptySubtitle}>
                Enter a place name, address, or landmark{'\n'}to find its location
              </Text>
              <View style={styles.exampleBox}>
                <Text style={styles.exampleTitle}>Examples:</Text>
                <Text style={styles.exampleText}>• Central Park</Text>
                <Text style={styles.exampleText}>• Starbucks 5th Avenue</Text>
                <Text style={styles.exampleText}>• Times Square, New York</Text>
              </View>
            </View>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, backgroundColor: Colors.white },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: 16, 
    paddingBottom: 16, 
    backgroundColor: Colors.white, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.lightGray 
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  searchContainer: { 
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    backgroundColor: Colors.white, 
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray
  },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.lightGray, 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    gap: 10 
  },
  searchInput: { flex: 1, fontSize: 16, color: Colors.black, paddingVertical: 14 },
  searchButton: { 
    backgroundColor: Colors.secondary, 
    borderRadius: 12, 
    paddingHorizontal: 24, 
    paddingVertical: 14, 
    justifyContent: 'center',
    minWidth: 90,
    alignItems: 'center'
  },
  searchButtonDisabled: { backgroundColor: Colors.gray },
  searchButtonText: { color: Colors.black, fontWeight: '700', fontSize: 16 },
  resultsContainer: { flex: 1 },
  resultsTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: Colors.darkGray, 
    paddingHorizontal: 20, 
    paddingVertical: 16 
  },
  resultItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.lightGray,
    backgroundColor: Colors.white
  },
  resultIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  resultTextContainer: { flex: 1 },
  resultName: { fontSize: 16, fontWeight: '600', color: Colors.black, marginBottom: 4 },
  resultCoords: { fontSize: 13, color: Colors.darkGray },
  emptyState: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 80,
    paddingHorizontal: 40
  },
  emptyTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: Colors.primary, 
    marginTop: 16,
    marginBottom: 8 
  },
  emptySubtitle: { 
    fontSize: 15, 
    color: Colors.darkGray, 
    textAlign: 'center',
    lineHeight: 22
  },
  exampleBox: {
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    width: '100%'
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8
  },
  exampleText: {
    fontSize: 14,
    color: Colors.darkGray,
    marginBottom: 4
  },
});

