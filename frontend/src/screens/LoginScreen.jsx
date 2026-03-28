import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useStore } from '../store/useStore';

export default function LoginScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { setUser, loadLessons } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('error'), t('fill_all_fields'));
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });

      // Save tokens and user info
      await AsyncStorage.setItem('token', res.data.token);
      await AsyncStorage.setItem('refreshToken', res.data.refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify(res.data.user));

      // NEW: Initialize user's Mosa learning journey
      setUser(res.data.user);
      await loadLessons('mosa'); // Load Mosa lessons immediately
      
      // NEW: Show welcome message with Mosa branding
      Alert.alert(
        '🔥 Welcome to Mosa!',
        'Your wealth-building journey begins now. Complete lessons, earn XP, and unlock new opportunities!',
        [{ text: 'Start Learning', onPress: () => navigation.navigate('Survey') }]
      );

    } catch (err) {
      Alert.alert(
        t('error'),
        err.response?.data?.error || t('login_failed')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* NEW: Mosa Branding Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="flash" size={40} color="#D4A017" />
            <Text style={styles.logoText}>MOSA</Text>
          </View>
          <Text style={styles.tagline}>Forge Your Wealth Journey</Text>
        </View>

        {/* NEW: Benefits Preview */}
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Start Building Today</Text>
          
          <View style={styles.benefitItem}>
            <Ionicons name="school-outline" size={20} color="#2D5016" />
            <Text style={styles.benefitText}>Learn Money-Making Skills</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Ionicons name="trending-up" size={20} color="#2D5016" />
            <Text style={styles.benefitText}>Earn XP & Level Up</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Ionicons name="rocket" size={20} color="#2D5016" />
            <Text style={styles.benefitText}>Unlock Yachi Marketplace</Text>
          </View>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Continue your wealth-building journey</Text>

          <TextInput
            style={styles.input}
            placeholder={t('email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder={t('password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#999"
          />

          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.loginButtonText}>Signing In...</Text>
            ) : (
              <>
                <Ionicons name="log-in" size={20} color="#fff" />
                <Text style={styles.loginButtonText}>Sign In to Mosa</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>New to Mosa?</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Ionicons name="person-add" size={20} color="#2D5016" />
            <Text style={styles.registerButtonText}>Create Mosa Account</Text>
          </TouchableOpacity>

          {/* NEW: Quick Preview of What's Ahead */}
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Your First Steps in Mosa:</Text>
            <View style={styles.previewSteps}>
              <Text style={styles.previewStep}>1. Complete the Survey</Text>
              <Text style={styles.previewStep}>2. Learn "Make First ETB 100"</Text>
              <Text style={styles.previewStep}>3. Earn Your First XP</Text>
              <Text style={styles.previewStep}>4. Start Building Skills</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D5016',
    marginLeft: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#D4A017',
    fontWeight: '600',
  },
  benefitsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 16,
    textAlign: 'center',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#2D5016',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#D4A017',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  loginButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666',
    fontSize: 14,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2D5016',
    backgroundColor: 'transparent',
  },
  registerButtonText: {
    color: '#2D5016',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  previewContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F0F7F4',
    borderRadius: 12,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 8,
  },
  previewSteps: {
    paddingLeft: 8,
  },
  previewStep: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 4,
  },
});
