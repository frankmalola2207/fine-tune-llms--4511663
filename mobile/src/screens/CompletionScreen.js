/**
 * Completion Screen - Verification complete
 */

import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Progress from 'react-native-progress';

import {useAppState, useAppDispatch, actions} from '../contexts/AppContext';
import APIService from '../services/api';

const CompletionScreen = ({navigation}) => {
  const state = useAppState();
  const dispatch = useAppDispatch();
  
  const [dashboardData, setDashboardData] = useState(null);
  const [animationValue] = useState(new Animated.Value(0));

  useEffect(() => {
    loadDashboardData();
    startAnimation();
  }, []);

  const startAnimation = () => {
    Animated.timing(animationValue, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  const loadDashboardData = async () => {
    try {
      const data = await APIService.getMobileDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleStartOver = () => {
    dispatch(actions.resetState());
    navigation.reset({
      index: 0,
      routes: [{name: 'Welcome'}],
    });
  };

  const handleViewResults = () => {
    navigation.navigate('Configuration');
  };

  const getVerificationSummary = () => {
    const completed = [];
    const failed = [];

    if (state.captures.document_scan?.success) {
      completed.push('ID Document Scan');
    } else {
      failed.push('ID Document Scan');
    }

    if (state.captures.facial_liveness?.success) {
      completed.push('Facial Liveness');
    }

    if (state.captures.fingerprint?.success) {
      completed.push('Contactless Fingerprint');
    }

    if (state.captures.nfc_read?.success) {
      completed.push('NFC Chip Reading');
    }

    return {completed, failed};
  };

  const getSecurityLevel = () => {
    const {completed} = getVerificationSummary();
    if (completed.length >= 4) return {level: 'Maximum', color: '#7c3aed', score: 95};
    if (completed.length >= 2) return {level: 'Enhanced', color: '#059669', score: 80};
    return {level: 'Basic', color: '#f59e0b', score: 65};
  };

  const renderVerificationItem = (item, success, details) => (
    <View style={styles.verificationItem}>
      <LinearGradient
        colors={success ? ['#10b981', '#059669'] : ['#6b7280', '#4b5563']}
        style={styles.verificationIcon}>
        <Icon
          name={success ? 'check' : 'close'}
          size={16}
          color="#ffffff"
        />
      </LinearGradient>
      <View style={styles.verificationContent}>
        <Text style={styles.verificationTitle}>{item}</Text>
        {details && (
          <Text style={styles.verificationDetails}>{details}</Text>
        )}
      </View>
      <Icon
        name={success ? 'verified' : 'error-outline'}
        size={20}
        color={success ? '#10b981' : '#6b7280'}
      />
    </View>
  );

  const {completed, failed} = getVerificationSummary();
  const securityLevel = getSecurityLevel();

  return (
    <LinearGradient
      colors={['#f0f9ff', '#e0f2fe', '#bae6fd']}
      style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Success Animation */}
        <Animated.View
          style={[
            styles.successContainer,
            {
              opacity: animationValue,
              transform: [
                {
                  translateY: animationValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}>
          <LinearGradient
            colors={['#10b981', '#059669']}
            style={styles.successIcon}>
            <Icon name="verified" size={60} color="#ffffff" />
          </LinearGradient>
          
          <Text style={styles.successTitle}>Verification Complete!</Text>
          <Text style={styles.successSubtitle}>
            Your identity has been successfully verified using Mobile-Technologies eKYC platform.
          </Text>
        </Animated.View>

        {/* Security Level */}
        <View style={styles.securityLevelContainer}>
          <View style={styles.securityHeader}>
            <LinearGradient
              colors={[securityLevel.color, securityLevel.color]}
              style={styles.securityBadge}>
              <Icon name="security" size={20} color="#ffffff" />
            </LinearGradient>
            <View style={styles.securityInfo}>
              <Text style={styles.securityTitle}>Security Level: {securityLevel.level}</Text>
              <Text style={styles.securityScore}>Trust Score: {securityLevel.score}%</Text>
            </View>
          </View>
          
          <Progress.Bar
            progress={securityLevel.score / 100}
            width={null}
            height={8}
            color={securityLevel.color}
            unfilledColor="#e5e7eb"
            borderWidth={0}
            borderRadius={4}
          />
        </View>

        {/* Verification Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Verification Summary</Text>
          
          <View style={styles.summaryStats}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{completed.length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{failed.length}</Text>
              <Text style={styles.statLabel}>Skipped</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>
                {state.extractedPersonalInfo ? 
                  ((state.extractedPersonalInfo.extraction_confidence || 0) * 100).toFixed(0) : 
                  '0'}%
              </Text>
              <Text style={styles.statLabel}>OCR Accuracy</Text>
            </View>
          </View>

          <View style={styles.verificationList}>
            {renderVerificationItem(
              'ID Document Scan',
              state.captures.document_scan?.success,
              state.captures.document_scan?.success ? 
                `Confidence: ${((state.captures.document_scan.ocr_confidence || 0) * 100).toFixed(1)}%` : 
                'Required step - not completed'
            )}
            
            {state.personalInfoVerified && 
              renderVerificationItem(
                'Personal Information',
                true,
                'Verified and confirmed'
              )
            }

            {state.captures.facial_liveness && renderVerificationItem(
              'Facial Liveness',
              state.captures.facial_liveness.success,
              state.captures.facial_liveness.success ? 
                `Liveness Score: ${((state.captures.facial_liveness.liveness_score || 0) * 100).toFixed(1)}%` : 
                'Liveness detection failed'
            )}

            {state.captures.fingerprint && renderVerificationItem(
              'Contactless Fingerprint',
              state.captures.fingerprint.success,
              state.captures.fingerprint.success ? 
                `Quality: ${((state.captures.fingerprint.quality_score || 0) * 100).toFixed(1)}%` : 
                'Fingerprint capture failed'
            )}

            {state.captures.nfc_read && renderVerificationItem(
              'NFC Chip Reading',
              state.captures.nfc_read.success,
              state.captures.nfc_read.success ? 
                'Document chip verified' : 
                'NFC reading failed'
            )}
          </View>
        </View>

        {/* Personal Information Preview */}
        {state.kycData && (
          <View style={styles.personalInfoContainer}>
            <Text style={styles.personalInfoTitle}>Verified Information</Text>
            <View style={styles.infoGrid}>
              <InfoItem label="Name" value={`${state.kycData.first_name} ${state.kycData.last_name}`} />
              <InfoItem label="Date of Birth" value={state.kycData.date_of_birth} />
              <InfoItem label="Document" value={state.kycData.document_number} />
              <InfoItem label="Nationality" value={state.kycData.nationality} />
            </View>
          </View>
        )}

        {/* Compliance Information */}
        <View style={styles.complianceContainer}>
          <View style={styles.complianceHeader}>
            <Icon name="verified-user" size={20} color="#059669" />
            <Text style={styles.complianceTitle}>Compliance & Security</Text>
          </View>
          <View style={styles.complianceItems}>
            <ComplianceItem icon="policy" text="GDPR Compliant" />
            <ComplianceItem icon="privacy-tip" text="CCPA Compliant" />
            <ComplianceItem icon="location-on" text="Singapore PDPA" />
            <ComplianceItem icon="encrypted" text="End-to-End Encrypted" />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleViewResults}>
            <LinearGradient
              colors={['#1e40af', '#3730a3']}
              style={styles.buttonGradient}>
              <Text style={styles.buttonText}>View Detailed Results</Text>
              <Icon name="assessment" size={20} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleStartOver}>
            <Text style={styles.secondaryButtonText}>Start New Verification</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by Mobile-Technologies AI eKYC Platform
          </Text>
          <Text style={styles.footerSubtext}>
            Advanced Mobile Biometric Verification
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const InfoItem = ({label, value}) => (
  <View style={styles.infoItem}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
  </View>
);

const ComplianceItem = ({icon, text}) => (
  <View style={styles.complianceItem}>
    <Icon name={icon} size={16} color="#059669" />
    <Text style={styles.complianceText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  securityLevelContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  securityBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  securityInfo: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  securityScore: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  verificationList: {
    space: 12,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  verificationIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  verificationContent: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  verificationDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  personalInfoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  personalInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '50%',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  complianceContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  complianceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  complianceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
    marginLeft: 8,
  },
  complianceItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  complianceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  complianceText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 6,
  },
  actionContainer: {
    marginBottom: 24,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(203, 213, 225, 0.5)',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default CompletionScreen;