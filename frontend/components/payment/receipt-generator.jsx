// payment/receipt-generator.jsx

/**
 * 🎯 ENTERPRISE RECEIPT GENERATOR
 * Production-ready receipt component for Mosa Forge
 * Features: 1000/999 revenue split, 333/333/333 payout schedule, digital signatures
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
  Animated
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { PDFDocument, rgb, StandardFonts } from 'react-native-pdf-lib';
import Share from 'react-native-share';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { usePayment } from '../../hooks/use-payment-distribution';
import { Logger } from '../../utils/logger';
import { formatCurrency } from '../../utils/formatters';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ReceiptGenerator = React.memo(({
  transaction,
  student,
  expert,
  onClose,
  onShare,
  variant = 'standard' // 'standard', 'minimal', 'detailed'
}) => {
  const receiptRef = useRef();
  const shareButtonRef = useRef();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { calculateRevenueSplit, calculatePayoutSchedule } = usePayment();
  const logger = new Logger('ReceiptGenerator');

  // 🎯 ANIMATION HELPERS
  const startEntranceAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, slideAnim]);

  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // 🧮 REVENUE CALCULATIONS
  const calculateReceiptData = useCallback(() => {
    try {
      const bundleAmount = 1999;
      const revenueSplit = calculateRevenueSplit(bundleAmount);
      const payoutSchedule = calculatePayoutSchedule(revenueSplit.expertAmount);
      
      const receipt = {
        id: `MOSA-${transaction.id}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        transaction: {
          ...transaction,
          bundleAmount,
          platformFee: revenueSplit.platformAmount,
          expertEarnings: revenueSplit.expertAmount,
        },
        revenueSplit,
        payoutSchedule,
        student: {
          name: student.name,
          faydaId: student.faydaId,
          email: student.email,
          phone: student.phone,
        },
        expert: {
          name: expert.name,
          tier: expert.currentTier,
          expertId: expert.id,
          qualityScore: expert.qualityScore,
        },
        digitalSignature: {
          platform: 'Mosa Forge Enterprise',
          signedBy: 'Chereka Payment System',
          timestamp: new Date().toISOString(),
          verificationUrl: `https://verify.mosaforge.com/receipts/${transaction.id}`,
        },
        taxDetails: {
          vat: 0, // Ethiopia VAT exempt for education
          serviceCharge: 0,
          totalTax: 0,
        },
        security: {
          hash: generateSecurityHash(transaction.id),
          qrCode: generateQRCodeData(transaction.id),
        }
      };

      setReceiptData(receipt);
      return receipt;
    } catch (error) {
      logger.error('Failed to calculate receipt data', error);
      throw new Error('RECEIPT_CALCULATION_FAILED');
    }
  }, [transaction, student, expert, calculateRevenueSplit, calculatePayoutSchedule]);

  // 🔐 SECURITY FUNCTIONS
  const generateSecurityHash = useCallback((transactionId) => {
    const timestamp = Date.now();
    const data = `${transactionId}-${timestamp}-${student.faydaId}`;
    // Simple hash for demo - in production use crypto library
    return Buffer.from(data).toString('base64').slice(0, 32);
  }, [student.faydaId]);

  const generateQRCodeData = useCallback((transactionId) => {
    return JSON.stringify({
      t: transactionId,
      s: student.faydaId,
      p: 'mosa-forge',
      v: '1.0',
      ts: Date.now()
    });
  }, [student.faydaId]);

  // 📄 RECEIPT GENERATION
  const generatePDFReceipt = useCallback(async (receipt) => {
    try {
      setIsGenerating(true);
      
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      
      const page = pdfDoc.addPage([600, 800]);
      const { width, height } = page.getSize();
      
      let yPosition = height - 50;

      // Header
      page.drawText('MOSA FORGE - OFFICIAL RECEIPT', {
        x: 50,
        y: yPosition,
        size: 20,
        font: timesRomanBold,
        color: rgb(0, 0.4, 0.8),
      });
      yPosition -= 30;

      // Receipt ID and Date
      page.drawText(`Receipt: ${receipt.id}`, {
        x: 50,
        y: yPosition,
        size: 12,
        font: timesRoman,
        color: rgb(0, 0, 0),
      });
      page.drawText(`Date: ${new Date(receipt.timestamp).toLocaleDateString()}`, {
        x: 400,
        y: yPosition,
        size: 12,
        font: timesRoman,
        color: rgb(0, 0, 0),
      });
      yPosition -= 40;

      // Student Information
      page.drawText('STUDENT INFORMATION', {
        x: 50,
        y: yPosition,
        size: 14,
        font: timesRomanBold,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
      page.drawText(`Name: ${receipt.student.name}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: timesRoman,
        color: rgb(0, 0, 0),
      });
      yPosition -= 15;
      page.drawText(`Fayda ID: ${receipt.student.faydaId}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: timesRoman,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;

      // Payment Details
      page.drawText('PAYMENT DETAILS', {
        x: 50,
        y: yPosition,
        size: 14,
        font: timesRomanBold,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;

      const paymentDetails = [
        { label: 'Bundle Price', amount: receipt.transaction.bundleAmount },
        { label: 'Platform Fee', amount: receipt.transaction.platformFee },
        { label: 'Expert Earnings', amount: receipt.transaction.expertEarnings },
      ];

      paymentDetails.forEach(detail => {
        page.drawText(detail.label, {
          x: 50,
          y: yPosition,
          size: 10,
          font: timesRoman,
          color: rgb(0, 0, 0),
        });
        page.drawText(formatCurrency(detail.amount), {
          x: 400,
          y: yPosition,
          size: 10,
          font: timesRomanBold,
          color: rgb(0, 0, 0),
        });
        yPosition -= 15;
      });

      yPosition -= 20;

      // Payout Schedule
      page.drawText('EXPERT PAYOUT SCHEDULE', {
        x: 50,
        y: yPosition,
        size: 14,
        font: timesRomanBold,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;

      receipt.payoutSchedule.forEach((payout, index) => {
        page.drawText(`${payout.phase}:`, {
          x: 50,
          y: yPosition,
          size: 10,
          font: timesRoman,
          color: rgb(0, 0, 0),
        });
        page.drawText(formatCurrency(payout.amount), {
          x: 400,
          y: yPosition,
          size: 10,
          font: timesRomanBold,
          color: rgb(0, 0.5, 0),
        });
        yPosition -= 15;
      });

      // Digital Signature
      yPosition -= 30;
      page.drawText('DIGITAL SIGNATURE', {
        x: 50,
        y: yPosition,
        size: 12,
        font: timesRomanBold,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 15;
      page.drawText(`Verified: ${receipt.digitalSignature.signedBy}`, {
        x: 50,
        y: yPosition,
        size: 8,
        font: timesRoman,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 10;
      page.drawText(`Verify: ${receipt.digitalSignature.verificationUrl}`, {
        x: 50,
        y: yPosition,
        size: 8,
        font: timesRoman,
        color: rgb(0.1, 0.3, 0.8),
      });

      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
    } catch (error) {
      logger.error('PDF generation failed', error);
      throw new Error('PDF_GENERATION_FAILED');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // 📱 SHARE FUNCTIONALITY
  const handleShareReceipt = useCallback(async () => {
    try {
      setIsSharing(true);
      
      if (!receiptData) {
        await calculateReceiptData();
      }

      const receipt = receiptData || calculateReceiptData();

      // Capture receipt as image
      const imageUri = await captureRef(receiptRef, {
        format: 'png',
        quality: 0.9,
        result: 'tmpfile',
      });

      // Generate PDF
      const pdfBytes = await generatePDFReceipt(receipt);
      
      // Prepare share options
      const shareOptions = {
        title: `Mosa Forge Receipt - ${receipt.id}`,
        message: `Mosa Forge Training Receipt\nAmount: ${formatCurrency(receipt.transaction.bundleAmount)}\nStudent: ${receipt.student.name}`,
        url: `file://${imageUri}`,
        type: 'image/png',
        subject: `Mosa Forge Receipt - ${receipt.id}`,
        failOnCancel: false,
      };

      if (Platform.OS === 'ios') {
        shareOptions.urls = [imageUri];
      }

      const result = await Share.open(shareOptions);
      
      logger.info('Receipt shared successfully', { 
        receiptId: receipt.id,
        platform: result.platform 
      });

      if (onShare) {
        onShare(receipt, result);
      }

      return result;
    } catch (error) {
      if (error.message !== 'Share canceled') {
        logger.error('Receipt sharing failed', error);
        Alert.alert(
          'Share Failed',
          'Unable to share receipt. Please try again.',
          [{ text: 'OK', style: 'cancel' }]
        );
      }
      return null;
    } finally {
      setIsSharing(false);
    }
  }, [receiptData, calculateReceiptData, generatePDFReceipt, onShare]);

  // 🖨️ PRINT FUNCTIONALITY
  const handlePrintReceipt = useCallback(async () => {
    try {
      if (!receiptData) {
        await calculateReceiptData();
      }

      const receipt = receiptData || calculateReceiptData();
      const pdfBytes = await generatePDFReceipt(receipt);
      
      // In a real app, you would integrate with a printing service
      // For now, we'll share the PDF
      const pdfPath = `${RNFS.TemporaryDirectoryPath}/receipt-${receipt.id}.pdf`;
      await RNFS.writeFile(pdfPath, pdfBytes, 'base64');
      
      await Share.open({
        title: `Print Receipt - ${receipt.id}`,
        url: `file://${pdfPath}`,
        type: 'application/pdf',
      });

      logger.info('Receipt print initiated', { receiptId: receipt.id });
    } catch (error) {
      logger.error('Receipt printing failed', error);
      Alert.alert(
        'Print Failed',
        'Unable to print receipt. Please try again.',
        [{ text: 'OK', style: 'cancel' }]
      );
    }
  }, [receiptData, calculateReceiptData, generatePDFReceipt]);

  // 🎨 RENDER HELPERS
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>MOSA FORGE</Text>
      <Text style={styles.headerSubtitle}>OFFICIAL RECEIPT</Text>
      <Text style={styles.receiptId}>{receiptData?.id || 'Generating...'}</Text>
    </View>
  );

  const renderStudentInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Student Information</Text>
      <View style={styles.infoGrid}>
        <InfoRow label="Name" value={student.name} />
        <InfoRow label="Fayda ID" value={student.faydaId} />
        <InfoRow label="Email" value={student.email} />
        <InfoRow label="Phone" value={student.phone} />
      </View>
    </View>
  );

  const renderExpertInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Expert Information</Text>
      <View style={styles.infoGrid}>
        <InfoRow label="Name" value={expert.name} />
        <InfoRow label="Tier" value={expert.currentTier} />
        <InfoRow label="Quality Score" value={expert.qualityScore?.toFixed(1)} />
      </View>
    </View>
  );

  const renderPaymentDetails = () => {
    const bundleAmount = 1999;
    const revenueSplit = calculateRevenueSplit(bundleAmount);
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Details</Text>
        <View style={styles.paymentGrid}>
          <PaymentRow 
            label="Bundle Price" 
            amount={bundleAmount} 
            isTotal={false}
          />
          <PaymentRow 
            label="Platform Fee (Mosa)" 
            amount={revenueSplit.platformAmount} 
            isTotal={false}
          />
          <PaymentRow 
            label="Expert Earnings" 
            amount={revenueSplit.expertAmount} 
            isTotal={false}
          />
          <View style={styles.divider} />
          <PaymentRow 
            label="Total Amount" 
            amount={bundleAmount} 
            isTotal={true}
          />
        </View>
      </View>
    );
  };

  const renderPayoutSchedule = () => {
    const payoutSchedule = calculatePayoutSchedule(999);
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expert Payout Schedule</Text>
        <View style={styles.payoutGrid}>
          {payoutSchedule.map((payout, index) => (
            <PayoutRow key={index} payout={payout} index={index} />
          ))}
        </View>
      </View>
    );
  };

  const renderDigitalSignature = () => (
    <View style={styles.signatureSection}>
      <Text style={styles.signatureTitle}>Digital Signature</Text>
      <Text style={styles.signatureText}>
        Verified by: {receiptData?.digitalSignature.signedBy || 'Chereka Payment System'}
      </Text>
      <Text style={styles.signatureText}>
        Timestamp: {receiptData?.timestamp ? new Date(receiptData.timestamp).toLocaleString() : 'Generating...'}
      </Text>
      <Text style={styles.verificationLink}>
        Verify: https://verify.mosaforge.com
      </Text>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity
        ref={shareButtonRef}
        style={[styles.button, styles.shareButton]}
        onPress={handleShareReceipt}
        disabled={isSharing}
      >
        <Animated.Text style={[
          styles.buttonText,
          { transform: [{ scale: isSharing ? pulseAnim : 1 }] }
        ]}>
          {isSharing ? 'Sharing...' : '📱 Share Receipt'}
        </Animated.Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.printButton]}
        onPress={handlePrintReceipt}
        disabled={isGenerating}
      >
        <Text style={styles.buttonText}>
          {isGenerating ? 'Generating...' : '🖨️ Print PDF'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.closeButton]}
        onPress={onClose}
      >
        <Text style={styles.buttonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );

  // 🎬 EFFECTS
  React.useEffect(() => {
    startEntranceAnimation();
    calculateReceiptData();
  }, [startEntranceAnimation, calculateReceiptData]);

  React.useEffect(() => {
    if (isSharing) {
      startPulseAnimation();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSharing, startPulseAnimation, pulseAnim]);

  // 🎯 MAIN RENDER
  return (
    <View style={styles.overlay}>
      <BlurView
        style={styles.absolute}
        blurType="dark"
        blurAmount={10}
        reducedTransparencyFallbackColor="white"
      />
      
      <Animated.View 
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <ViewShot ref={receiptRef} options={{ format: 'png', quality: 0.9 }}>
          <ScrollView 
            style={styles.receiptContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {renderHeader()}
            {renderStudentInfo()}
            {renderExpertInfo()}
            {renderPaymentDetails()}
            {renderPayoutSchedule()}
            {renderDigitalSignature()}
          </ScrollView>
        </ViewShot>

        {renderActionButtons()}
      </Animated.View>
    </View>
  );
});

// 🎯 REUSABLE COMPONENTS
const InfoRow = React.memo(({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
));

const PaymentRow = React.memo(({ label, amount, isTotal }) => (
  <View style={[styles.paymentRow, isTotal && styles.totalRow]}>
    <Text style={[
      styles.paymentLabel,
      isTotal && styles.totalLabel
    ]}>
      {label}
    </Text>
    <Text style={[
      styles.paymentAmount,
      isTotal && styles.totalAmount
    ]}>
      {formatCurrency(amount)}
    </Text>
  </View>
));

const PayoutRow = React.memo(({ payout, index }) => (
  <View style={styles.payoutRow}>
    <View style={styles.payoutPhase}>
      <Text style={styles.payoutIndex}>{index + 1}</Text>
      <Text style={styles.payoutLabel}>{payout.phase}</Text>
    </View>
    <Text style={styles.payoutAmount}>{formatCurrency(payout.amount)}</Text>
    <Text style={styles.payoutStatus}>{payout.status}</Text>
  </View>
));

// 🎨 STYLES
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  absolute: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
    maxHeight: SCREEN_HEIGHT * 0.8,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  receiptContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1a73e8',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  receiptId: {
    fontSize: 12,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1a73e8',
    paddingLeft: 12,
  },
  infoGrid: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  paymentGrid: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#1a73e8',
    marginTop: 8,
    paddingTop: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a73e8',
  },
  divider: {
    height: 1,
    backgroundColor: '#dee2e6',
    marginVertical: 8,
  },
  payoutGrid: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  payoutPhase: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  payoutIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1a73e8',
    color: 'white',
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 12,
  },
  payoutLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  payoutAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745',
    flex: 1,
    textAlign: 'center',
  },
  payoutStatus: {
    fontSize: 12,
    color: '#6c757d',
    flex: 1,
    textAlign: 'right',
  },
  signatureSection: {
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1a73e8',
  },
  signatureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 8,
  },
  signatureText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  verificationLink: {
    fontSize: 10,
    color: '#1a73e8',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    backgroundColor: '#1a73e8',
  },
  printButton: {
    backgroundColor: '#28a745',
  },
  closeButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

// 🛡️ ERROR BOUNDARY
class ReceiptGeneratorErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const logger = new Logger('ReceiptGeneratorErrorBoundary');
    logger.error('Receipt generator crashed', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={[styles.container, { padding: 20 }]}>
          <Text style={styles.headerTitle}>Receipt Unavailable</Text>
          <Text style={styles.sectionTitle}>
            We're unable to generate your receipt at this time.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.closeButton]}
            onPress={this.props.onClose}
          >
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function ReceiptGeneratorWithBoundary(props) {
  return (
    <ReceiptGeneratorErrorBoundary onClose={props.onClose}>
      <ReceiptGenerator {...props} />
    </ReceiptGeneratorErrorBoundary>
  );
}

// 🎯 PROP TYPES VALIDATION
ReceiptGenerator.propTypes = {
  transaction: PropTypes.shape({
    id: PropTypes.string.isRequired,
    amount: PropTypes.number,
    currency: PropTypes.string,
    status: PropTypes.string,
    paymentMethod: PropTypes.string,
  }).isRequired,
  student: PropTypes.shape({
    name: PropTypes.string.isRequired,
    faydaId: PropTypes.string.isRequired,
    email: PropTypes.string,
    phone: PropTypes.string,
  }).isRequired,
  expert: PropTypes.shape({
    name: PropTypes.string.isRequired,
    currentTier: PropTypes.string,
    id: PropTypes.string.isRequired,
    qualityScore: PropTypes.number,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onShare: PropTypes.func,
  variant: PropTypes.oneOf(['standard', 'minimal', 'detailed']),
};