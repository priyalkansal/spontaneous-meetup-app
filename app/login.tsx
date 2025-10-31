import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useUserStore } from '@/store/userStore';

export default function LoginScreen() {
  const router = useRouter();
  const { setLoginEmail, profile } = useUserStore();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isStoreLoaded, setIsStoreLoaded] = useState(false);

  // Wait for store to load persisted data
  useEffect(() => {
    if (!isStoreLoaded) {
      setTimeout(() => {
        setIsStoreLoaded(true);
      }, 1000);
    }
  }, [isStoreLoaded]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return false;
    }
    if (!isLogin && formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return false;
    }
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      setIsLoading(true);
      setLoginEmail(formData.email);
      
      if (isLogin) {
        // Wait for store to load before checking profile
        const checkProfile = () => {
          // Check if user has completed onboarding
          const isExistingUser = profile && profile.email === formData.email;
          const hasCompletedOnboarding = isExistingUser && profile.hasCompletedOnboarding;
          
          setIsLoading(false);
          Alert.alert('Success', 'Login successful!');
          
          if (hasCompletedOnboarding) {
            // User has completed onboarding, go directly to app
            router.push('/(tabs)/map');
          } else {
            // User hasn't completed onboarding, go through onboarding
            router.push('/onboarding');
          }
        };

        if (isStoreLoaded) {
          checkProfile();
        } else {
          // Wait for store to load
          setTimeout(checkProfile, 2000);
        }
      } else {
        // New user signup, always go through onboarding
        setTimeout(() => {
          setIsLoading(false);
          Alert.alert('Success', 'Account created successfully!');
          router.push('/onboarding');
        }, 1500);
      }
    }
  };

  const handleForgotPassword = () => {
    if (!formData.email) {
      Alert.alert('Error', 'Please enter your email address first.');
      return;
    }
    
    Alert.alert(
      'Password Reset',
      `A password reset link has been sent to ${formData.email}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <LinearGradient
      colors={[Colors.primary, Colors.darkPurple]}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </Text>
        <Text style={styles.subtitle}>
          {isLogin ? 'Sign in to continue' : 'Join HangOutNow today'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor={Colors.lightGray}
          keyboardType="email-address"
          autoCapitalize="none"
          value={formData.email}
          onChangeText={(text) => handleInputChange('email', text)}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.lightGray}
          secureTextEntry
          value={formData.password}
          onChangeText={(text) => handleInputChange('password', text)}
        />

        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={Colors.lightGray}
            secureTextEntry
            value={formData.confirmPassword}
            onChangeText={(text) => handleInputChange('confirmPassword', text)}
          />
        )}

        {isLogin && (
          <TouchableOpacity style={styles.forgotButton} onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isLoading || (isLogin && !isStoreLoaded)}
        >
          <Text style={styles.submitButtonText}>
            {isLoading 
              ? (isLogin ? 'Signing In...' : 'Creating Account...') 
              : (isLogin && !isStoreLoaded)
              ? 'Loading...'
              : (isLogin ? 'Sign In' : 'Create Account')
            }
          </Text>
        </TouchableOpacity>

        <View style={styles.switchContainer}>
          <Text style={styles.switchText}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </Text>
          <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
            <Text style={styles.switchLink}>
              {isLogin ? 'Sign Up' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '85%',
    padding: 20,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.8,
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    color: Colors.white,
    fontSize: 16,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    width: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchText: {
    color: Colors.white,
    fontSize: 14,
  },
  switchLink: {
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
