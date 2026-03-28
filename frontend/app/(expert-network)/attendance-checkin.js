/**
 * 🏢 MOSA FORGE - Enterprise Attendance Check-in System
 * 📱 Real-time Session Attendance & Verification
 * 🎯 QR Code Scanning & GPS Location Validation
 * 📊 Attendance Analytics & Performance Tracking
 * 🚀 Enterprise-Grade React Native Implementation
 * 
 * @module AttendanceCheckin
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

// 🏗️ Enterprise Components
import AttendanceMetrics from '../../components/expert/AttendanceMetrics';
import SessionInfoCard from '../../components/expert/SessionInfoCard';
import LocationVerification from '../../components/shared/LocationVerification';
import QRCodeScanner from '../../components/shared/QRCodeScanner';
import AttendanceConfirmation from '../../components/expert/AttendanceConfirmation';

// 🔧 Enterprise Services
import AttendanceService from '../../services/attendance-service';
import LocationService from '../../services/location-service';
import NotificationService from '../../services/notification-service';

// 🎨 Enterprise Design System
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Spacing from '../../constants/Spacing';
import { useAuth } from '../../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

const AttendanceCheckin = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { expertId, sessionId } = route.params || {};
  
  const { user } = useAuth();
  const cameraRef = useRef(null);
  
  // 🏗️ State Management
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState(null);
  
  // 📊 Session Data
  const [session, setSession] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [checkinStatus, setCheckinStatus] = useState('pending');
  
  // 📍 Location Data
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationVerified, setLocationVerified] = useState(false);
  const [locationError, setLocationError] = useState(null);
  
  // 🎯 Attendance Data
  const [attendanceMetrics, setAttendanceMetrics] = useState({
    totalStudents: 0,
    checkedIn: 0,
    pending: 0,
    lateArrivals: 0,
    attendanceRate: 0
  });
  
  // ⚡ Real-time Updates
  const [realTimeUpdates, setRealTimeUpdates] = useState(false);
  const updateInterval = useRef(null);

  /**
   * 🏗️ Initialize Attendance Check-in
   */
  useEffect(() => {
    initializeAttendanceCheckin();
    
    return () => {
      cleanupResources();
    };
  }, []);

  /**
   * 🔄 Initialize Real-time Updates
   */
  useEffect(() => {
    if (sessionId && realTimeUpdates) {
      startRealTimeUpdates();
    }
    
    return () => {
      stopRealTimeUpdates();
    };
  }, [sessionId, realTimeUpdates]);

  /**
   * 🏗️ Initialize Attendance Check-in
   */
  const initializeAttendanceCheckin = async () => {
    try {
      setLoading(true);
      
      // 🔐 Check Permissions
      await checkPermissions();
      
      // 📍 Get Current Location
      await getCurrentLocation();
      
      // 📊 Load Session Data
      await loadSessionData();
      
      // 📈 Load Attendance Metrics
      await loadAttendanceMetrics();
      
      setLoading(false);
      
    } catch (error) {
      handleInitializationError(error);
    }
  };

  /**
   * 🔐 Check Required Permissions
   */
  const checkPermissions = async () => {
    try {
      // 📸 Camera Permission
      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }
      
      // 📍 Location Permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      
      if (status !== 'granted') {
        throw new Error('Location permission is required for attendance check-in');
      }
      
    } catch (error) {
      throw new Error(`Permission check failed: ${error.message}`);
    }
  };

  /**
   * 📍 Get Current Location
   */
  const getCurrentLocation = async () => {
    try {
      const location = await LocationService.getCurrentLocation({
        accuracy: Location.Accuracy.High,
        timeout: 10000
      });
      
      setCurrentLocation(location);
      await verifyLocation(location);
      
    } catch (error) {
      setLocationError(error.message);
      throw new Error(`Location retrieval failed: ${error.message}`);
    }
  };

  /**
   * 🎯 Verify Location Against Session
   */
  const verifyLocation = async (location) => {
    try {
      if (!session?.location) return;
      
      const verification = await LocationService.verifyLocation(
        location,
        session.location,
        { maxDistance: 100 } // 100 meters maximum
      );
      
      setLocationVerified(verification.verified);
      
      if (!verification.verified) {
        setLocationError(verification.message);
      }
      
    } catch (error) {
      setLocationError('Location verification failed');
    }
  };

  /**
   * 📊 Load Session Data
   */
  const loadSessionData = async () => {
    try {
      const sessionData = await AttendanceService.getSessionDetails(sessionId);
      setSession(sessionData);
      
      // Check if expert is assigned to this session
      if (sessionData.expertId !== expertId) {
        throw new Error('You are not assigned to this session');
      }
      
      // Check session status
      if (sessionData.status !== 'scheduled') {
        throw new Error(`Session is ${sessionData.status}, cannot check attendance`);
      }
      
      // Check session time
      const now = new Date();
      const startTime = new Date(sessionData.startTime);
      const endTime = new Date(sessionData.endTime);
      
      if (now < startTime) {
        throw new Error('Session has not started yet');
      }
      
      if (now > endTime) {
        throw new Error('Session has already ended');
      }
      
    } catch (error) {
      throw new Error(`Session loading failed: ${error.message}`);
    }
  };

  /**
   * 📈 Load Attendance Metrics
   */
  const loadAttendanceMetrics = async () => {
    try {
      const metrics = await AttendanceService.getAttendanceMetrics(sessionId);
      setAttendanceMetrics(metrics);
      
    } catch (error) {
      console.error('Metrics loading failed:', error);
    }
  };

  /**
   * ⚡ Start Real-time Updates
   */
  const startRealTimeUpdates = () => {
    updateInterval.current = setInterval(async () => {
      try {
        await loadAttendanceMetrics();
      } catch (error) {
        console.error('Real-time update failed:', error);
      }
    }, 30000); // Update every 30 seconds
  };

  /**
   * ⏹️ Stop Real-time Updates
   */
  const stopRealTimeUpdates = () => {
    if (updateInterval.current) {
      clearInterval(updateInterval.current);
      updateInterval.current = null;
    }
  };

  /**
   * 📷 Handle QR Code Scan
   */
  const handleQRCodeScan = async (data) => {
    if (scanning) return;
    
    try {
      setScanning(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // 🔍 Parse QR Code Data
      const studentData = parseQRCodeData(data);
      
      if (!studentData) {
        throw new Error('Invalid QR code format');
      }
      
      // 🎯 Verify Student Enrollment
      const verification = await verifyStudentEnrollment(studentData);
      
      if (!verification.verified) {
        throw new Error(verification.message);
      }
      
      // ✅ Process Attendance Check-in
      await processAttendanceCheckin(studentData);
      
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showErrorAlert('Scan Failed', error.message);
    } finally {
      setScanning(false);
    }
  };

  /**
   * 🔍 Parse QR Code Data
   */
  const parseQRCodeData = (data) => {
    try {
      // Expected format: mosa://attendance/{studentId}/{enrollmentId}/{timestamp}
      const regex = /^mosa:\/\/attendance\/([^/]+)\/([^/]+)\/(\d+)$/;
      const match = data.match(regex);
      
      if (!match) {
        return null;
      }
      
      return {
        studentId: match[1],
        enrollmentId: match[2],
        timestamp: parseInt(match[3], 10)
      };
      
    } catch (error) {
      return null;
    }
  };

  /**
   * 🎯 Verify Student Enrollment
   */
  const verifyStudentEnrollment = async (studentData) => {
    try {
      const verification = await AttendanceService.verifyStudentEnrollment({
        sessionId,
        studentId: studentData.studentId,
        enrollmentId: studentData.enrollmentId
      });
      
      return verification;
      
    } catch (error) {
      return {
        verified: false,
        message: 'Enrollment verification failed'
      };
    }
  };

  /**
   * ✅ Process Attendance Check-in
   */
  const processAttendanceCheckin = async (studentData) => {
    try {
      // 📍 Prepare check-in data
      const checkinData = {
        sessionId,
        studentId: studentData.studentId,
        enrollmentId: studentData.enrollmentId,
        checkinTime: new Date().toISOString(),
        location: currentLocation,
        method: 'qr_code',
        metadata: {
          scannedBy: expertId,
          deviceInfo: Platform.OS,
          appVersion: '2.0.0'
        }
      };
      
      // 💾 Submit attendance
      const result = await AttendanceService.submitAttendance(checkinData);
      
      if (result.success) {
        await handleSuccessfulCheckin(result);
      } else {
        throw new Error(result.message || 'Check-in failed');
      }
      
    } catch (error) {
      throw new Error(`Check-in processing failed: ${error.message}`);
    }
  };

  /**
   * 🎉 Handle Successful Check-in
   */
  const handleSuccessfulCheckin = async (result) => {
    try {
      // 🎯 Update local state
      setAttendanceData(result.attendance);
      setCheckinStatus('completed');
      
      // 📈 Update metrics
      await loadAttendanceMetrics();
      
      // 📧 Send notification
      await NotificationService.sendAttendanceNotification({
        studentId: result.attendance.studentId,
        sessionId,
        attendanceId: result.attendance.id,
        type: 'checkin_confirmation'
      });
      
      // 🔊 Play success sound (if available)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // 🎯 Show success message
      showSuccessAlert('Check-in Successful', `Student ${result.studentName} has been checked in`);
      
      // 🔄 Reset after delay
      setTimeout(() => {
        setAttendanceData(null);
        setCheckinStatus('pending');
      }, 3000);
      
    } catch (error) {
      console.error('Success handling failed:', error);
    }
  };

  /**
   * 👤 Manual Check-in
   */
  const handleManualCheckin = async () => {
    try {
      // 🚨 Check location verification
      if (!locationVerified) {
        throw new Error('Location verification required for manual check-in');
      }
      
      // 🎯 Navigate to manual check-in screen
      navigation.navigate('ManualCheckin', {
        sessionId,
        expertId,
        location: currentLocation
      });
      
    } catch (error) {
      showErrorAlert('Manual Check-in', error.message);
    }
  };

  /**
   * 🏁 Complete Attendance Session
   */
  const handleCompleteSession = async () => {
    try {
      Alert.alert(
        'Complete Session',
        'Are you sure you want to complete this attendance session? This cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Complete',
            style: 'destructive',
            onPress: async () => {
              await completeAttendanceSession();
            }
          }
        ]
      );
      
    } catch (error) {
      showErrorAlert('Session Completion', error.message);
    }
  };

  /**
   * ✅ Complete Attendance Session
   */
  const completeAttendanceSession = async () => {
    try {
      setLoading(true);
      
      const result = await AttendanceService.completeAttendanceSession({
        sessionId,
        expertId,
        completionTime: new Date().toISOString(),
        location: currentLocation,
        attendanceSummary: attendanceMetrics
      });
      
      if (result.success) {
        showSuccessAlert('Session Completed', 'Attendance session has been completed successfully');
        navigation.goBack();
      } else {
        throw new Error(result.message || 'Session completion failed');
      }
      
    } catch (error) {
      showErrorAlert('Completion Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ⚠️ Handle Initialization Error
   */
  const handleInitializationError = (error) => {
    console.error('Initialization error:', error);
    
    Alert.alert(
      'Initialization Failed',
      error.message || 'Failed to initialize attendance check-in',
      [
        {
          text: 'Retry',
          onPress: initializeAttendanceCheckin
        },
        {
          text: 'Go Back',
          onPress: () => navigation.goBack(),
          style: 'cancel'
        }
      ]
    );
    
    setLoading(false);
  };

  /**
   * 🧹 Cleanup Resources
   */
  const cleanupResources = () => {
    stopRealTimeUpdates();
  };

  /**
   * 🎨 Show Success Alert
   */
  const showSuccessAlert = (title, message) => {
    Alert.alert(title, message, [{ text: 'OK' }]);
  };

  /**
   * 🚨 Show Error Alert
   */
  const showErrorAlert = (title, message) => {
    Alert.alert(title, message, [{ text: 'OK' }]);
  };

  /**
   * 🎨 Render Loading State
   */
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Initializing Attendance Check-in...</Text>
      </SafeAreaView>
    );
  }

  /**
   * 🚨 Render Permission Error
   */
  if (!cameraPermission?.granted || locationPermission !== 'granted') {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <MaterialIcons name="error-outline" size={64} color={Colors.error} />
        <Text style={styles.permissionTitle}>Permissions Required</Text>
        <Text style={styles.permissionText}>
          Camera and location permissions are required for attendance check-in.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={checkPermissions}
        >
          <Text style={styles.permissionButtonText}>Grant Permissions</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 📱 Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Attendance Check-in</Text>
        
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleCompleteSession}
        >
          <Text style={styles.completeButtonText}>Complete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 📊 Session Info */}
        {session && (
          <SessionInfoCard
            session={session}
            style={styles.sessionCard}
          />
        )}

        {/* 📍 Location Verification */}
        <LocationVerification
          location={currentLocation}
          verified={locationVerified}
          error={locationError}
          onRetry={getCurrentLocation}
          style={styles.locationCard}
        />

        {/* 📊 Attendance Metrics */}
        <AttendanceMetrics
          metrics={attendanceMetrics}
          style={styles.metricsCard}
        />

        {/* 📷 QR Code Scanner */}
        {checkinStatus === 'pending' && (
          <View style={styles.scannerContainer}>
            <Text style={styles.scannerTitle}>Scan Student QR Code</Text>
            <Text style={styles.scannerSubtitle}>
              Position the QR code within the frame
            </Text>
            
            <QRCodeScanner
              ref={cameraRef}
              onScan={handleQRCodeScan}
              scanning={scanning}
              style={styles.scanner}
            />
            
            {scanning && (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator size="large" color={Colors.white} />
                <Text style={styles.scanningText}>Processing...</Text>
              </View>
            )}
          </View>
        )}

        {/* ✅ Attendance Confirmation */}
        {attendanceData && (
          <AttendanceConfirmation
            attendance={attendanceData}
            style={styles.confirmationCard}
          />
        )}

        {/* 👤 Manual Check-in Option */}
        <TouchableOpacity
          style={[
            styles.manualButton,
            (!locationVerified || scanning) && styles.disabledButton
          ]}
          onPress={handleManualCheckin}
          disabled={!locationVerified || scanning}
        >
          <FontAwesome5 name="user-check" size={20} color={Colors.white} />
          <Text style={styles.manualButtonText}>Manual Check-in</Text>
        </TouchableOpacity>

        {/* ℹ️ Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Instructions</Text>
          
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.instructionText}>
              Ensure location services are enabled
            </Text>
          </View>
          
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.instructionText}>
              Scan each student's QR code individually
            </Text>
          </View>
          
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.instructionText}>
              Use manual check-in for technical issues
            </Text>
          </View>
          
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.instructionText}>
              Complete session when all students are checked in
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* 📊 Footer Stats */}
      <View style={styles.footer}>
        <View style={styles.footerStat}>
          <Text style={styles.footerStatValue}>{attendanceMetrics.checkedIn}</Text>
          <Text style={styles.footerStatLabel}>Checked In</Text>
        </View>
        
        <View style={styles.footerStat}>
          <Text style={styles.footerStatValue}>{attendanceMetrics.pending}</Text>
          <Text style={styles.footerStatLabel}>Pending</Text>
        </View>
        
        <View style={styles.footerStat}>
          <Text style={styles.footerStatValue}>
            {attendanceMetrics.attendanceRate}%
          </Text>
          <Text style={styles.footerStatLabel}>Attendance Rate</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

/**
 * 🎨 Enterprise Design System Styles
 */
const styles = StyleSheet.create({
  // 🏗️ Container Styles
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  
  permissionTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  
  permissionText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  
  permissionButtonText: {
    ...Typography.button,
    color: Colors.white,
  },
  
  // 📱 Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  
  backButton: {
    padding: Spacing.sm,
  },
  
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
    fontWeight: '600',
  },
  
  completeButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 6,
  },
  
  completeButtonText: {
    ...Typography.buttonSmall,
    color: Colors.white,
    fontWeight: '600',
  },
  
  // 📱 Content Styles
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  
  // 🎨 Card Styles
  sessionCard: {
    marginBottom: Spacing.lg,
  },
  
  locationCard: {
    marginBottom: Spacing.lg,
  },
  
  metricsCard: {
    marginBottom: Spacing.lg,
  },
  
  confirmationCard: {
    marginBottom: Spacing.lg,
  },
  
  // 📷 Scanner Styles
  scannerContainer: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  
  scannerTitle: {
    ...Typography.h4,
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  
  scannerSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  
  scanner: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  
  scanningText: {
    ...Typography.body,
    color: Colors.white,
    marginTop: Spacing.sm,
  },
  
  // 👤 Manual Button
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
  
  disabledButton: {
    opacity: 0.5,
  },
  
  manualButtonText: {
    ...Typography.button,
    color: Colors.white,
    marginLeft: Spacing.sm,
  },
  
  // ℹ️ Instructions
  instructionsContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.xl,
  },
  
  instructionsTitle: {
    ...Typography.h4,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  
  instructionText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  
  // 📊 Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  
  footerStat: {
    alignItems: 'center',
  },
  
  footerStatValue: {
    ...Typography.h3,
    color: Colors.primary,
    fontWeight: '700',
  },
  
  footerStatLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});

export default AttendanceCheckin;