/**
 * Payment Methods Modal Screen
 * EcoVolt Smart Wallet balance, Quick Top-up, UPI ID management, and Saved Cards
 * Connected to dynamic Theme & Hindi/English Language.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/styles/spacing';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';

interface UPIAccount {
  id: string;
  upiId: string;
  provider: string;
  isDefault: boolean;
}

interface SavedCard {
  id: string;
  bank: string;
  lastFour: string;
  brand: 'visa' | 'mastercard' | 'rupay';
  expiry: string;
  isDefault: boolean;
}

export default function PaymentMethodsModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const [walletBalance, setWalletBalance] = useState(850.0);
  const [autoPayEnabled, setAutoPayEnabled] = useState(true);
  const [addingTopup, setAddingTopup] = useState(false);

  // Saved UPI IDs
  const [upiList, setUpiList] = useState<UPIAccount[]>([
    { id: '1', upiId: 'driver@okhdfcbank', provider: 'Google Pay', isDefault: true },
    { id: '2', upiId: 'ecovolt.deep@paytm', provider: 'Paytm UPI', isDefault: false },
  ]);

  // Saved Cards
  const [cardsList, setCardsList] = useState<SavedCard[]>([
    { id: '1', bank: 'HDFC EV Charge Card', lastFour: '4092', brand: 'visa', expiry: '08/28', isDefault: true },
    { id: '2', bank: 'ICICI Platinum Green', lastFour: '8831', brand: 'mastercard', expiry: '11/27', isDefault: false },
  ]);

  // Add UPI Modal state
  const [showAddUpiModal, setShowAddUpiModal] = useState(false);
  const [newUpiId, setNewUpiId] = useState('');

  // Top up action
  const handleTopup = (amount: number) => {
    setAddingTopup(true);
    setTimeout(() => {
      setWalletBalance((prev) => prev + amount);
      setAddingTopup(false);
      Alert.alert(
        'Wallet Recharged! ⚡',
        `₹${amount} successfully added to wallet. Balance: ₹${walletBalance + amount}`
      );
    }, 600);
  };

  const handleAddUpi = () => {
    if (!newUpiId.includes('@') || newUpiId.length < 5) {
      Alert.alert('Invalid UPI ID', 'Please enter a valid UPI address (e.g., name@bank)');
      return;
    }
    const newAccount: UPIAccount = {
      id: Date.now().toString(),
      upiId: newUpiId.trim().toLowerCase(),
      provider: 'BHIM / Bank UPI',
      isDefault: false,
    };
    setUpiList((prev) => [...prev, newAccount]);
    setNewUpiId('');
    setShowAddUpiModal(false);
    Alert.alert('UPI Added', 'New UPI ID has been linked to your EcoVolt account.');
  };

  const handleSetDefaultUpi = (id: string) => {
    setUpiList((prev) =>
      prev.map((item) => ({ ...item, isDefault: item.id === id }))
    );
  };

  const handleDeleteUpi = (id: string) => {
    Alert.alert('Remove UPI', 'Are you sure you want to remove this UPI ID?', [
      { text: t('common.cancel', 'Cancel'), style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setUpiList((prev) => prev.filter((item) => item.id !== id)),
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="close" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('payment.title', 'Payment Methods')}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Smart Green Wallet Card */}
        <View style={[styles.walletCard, { backgroundColor: isDark ? '#091E15' : '#0B2418' }]}>
          <View style={styles.walletTopRow}>
            <View style={styles.walletBrandRow}>
              <Ionicons name="wallet" size={22} color="#10B981" />
              <Text style={styles.walletBrand}>{t('payment.smart_wallet', 'EcoVolt Smart Wallet')}</Text>
            </View>
            <View style={styles.greenBadge}>
              <Ionicons name="leaf" size={12} color="#059669" />
              <Text style={styles.greenBadgeText}>{t('payment.auto_discount', 'AUTO-DISCOUNT')}</Text>
            </View>
          </View>

          <Text style={styles.walletBalanceLabel}>{t('payment.avail_balance', 'Available Balance')}</Text>
          <Text style={styles.walletBalance}>₹{walletBalance.toFixed(2)}</Text>
          <Text style={styles.walletSubtext}>
            {t('payment.wallet_sub', 'Locked at renewable charging slot rates · 0% transaction fees')}
          </Text>

          {/* Quick Top-up buttons */}
          <View style={styles.topupRow}>
            {[200, 500, 1000].map((amt) => (
              <TouchableOpacity
                key={amt}
                style={styles.topupBtn}
                onPress={() => handleTopup(amt)}
                disabled={addingTopup}
                activeOpacity={0.7}
              >
                {addingTopup ? (
                  <ActivityIndicator size="small" color="#34D399" />
                ) : (
                  <Text style={styles.topupBtnText}>+₹{amt}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Auto Pay Smart Preference */}
        <TouchableOpacity
          style={[styles.preferenceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setAutoPayEnabled(!autoPayEnabled)}
          activeOpacity={0.8}
        >
          <View style={styles.preferenceLeft}>
            <Ionicons
              name="flash"
              size={22}
              color={autoPayEnabled ? colors.primary : colors.textMuted}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.preferenceTitle, { color: colors.textPrimary }]}>
                {t('payment.auto_pay', 'Auto-Pay Green Windows')}
              </Text>
              <Text style={[styles.preferenceDesc, { color: colors.textSecondary }]}>
                {t('payment.auto_pay_desc', 'Instantly settle sessions from wallet to unlock max dynamic solar discounts')}
              </Text>
            </View>
          </View>
          <Ionicons
            name={autoPayEnabled ? 'toggle' : 'toggle-outline'}
            size={36}
            color={autoPayEnabled ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>

        {/* Saved UPI IDs */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('payment.upi_accounts', 'UPI Accounts (VPA)')}
          </Text>
          <TouchableOpacity onPress={() => setShowAddUpiModal(true)}>
            <Text style={[styles.addSectionText, { color: colors.primary }]}>
              {t('payment.add_upi', '+ Add UPI')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {upiList.map((item, index) => (
            <View
              key={item.id}
              style={[styles.listItem, index < upiList.length - 1 && [styles.itemBorder, { borderBottomColor: colors.borderLight }]]}
            >
              <View style={[styles.listIconBox, { backgroundColor: colors.surfaceSunken }]}>
                <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.listInfo}>
                <View style={styles.upiTitleRow}>
                  <Text style={[styles.listTitle, { color: colors.textPrimary }]}>{item.upiId}</Text>
                  {item.isDefault && (
                    <View style={styles.defaultPill}>
                      <Text style={styles.defaultPillText}>{t('payment.default_pill', 'DEFAULT')}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.listSub, { color: colors.textSecondary }]}>{item.provider}</Text>
              </View>
              <View style={styles.itemActions}>
                {!item.isDefault && (
                  <TouchableOpacity
                    onPress={() => handleSetDefaultUpi(item.id)}
                    style={[styles.setDefaultBtn, { backgroundColor: colors.surfaceSunken }]}
                  >
                    <Text style={[styles.setDefaultText, { color: colors.textPrimary }]}>
                      {t('payment.set_default', 'Set Default')}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleDeleteUpi(item.id)}>
                  <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Saved Cards */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('payment.saved_cards', 'Saved Credit & Debit Cards')}
          </Text>
        </View>

        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {cardsList.map((card, index) => (
            <View
              key={card.id}
              style={[styles.listItem, index < cardsList.length - 1 && [styles.itemBorder, { borderBottomColor: colors.borderLight }]]}
            >
              <View style={[styles.listIconBox, { backgroundColor: colors.surfaceSunken }]}>
                <Ionicons name="card-outline" size={20} color="#3B82F6" />
              </View>
              <View style={styles.listInfo}>
                <View style={styles.upiTitleRow}>
                  <Text style={[styles.listTitle, { color: colors.textPrimary }]}>{card.bank}</Text>
                  {card.isDefault && (
                    <View style={styles.defaultPill}>
                      <Text style={styles.defaultPillText}>{t('payment.primary_pill', 'PRIMARY')}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.listSub, { color: colors.textSecondary }]}>
                  •••• •••• •••• {card.lastFour} · Exp {card.expiry}
                </Text>
              </View>
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={card.isDefault ? colors.primary : colors.textMuted}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Add UPI Modal */}
      <Modal visible={showAddUpiModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t('payment.link_upi', 'Link New UPI ID')}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {t('payment.enter_upi', 'Enter your UPI ID (e.g. mobile@upi or username@bank)')}
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceSunken, color: colors.textPrimary, borderColor: colors.border }]}
              value={newUpiId}
              onChangeText={setNewUpiId}
              placeholder="example@okaxis"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceSunken }]}
                onPress={() => {
                  setNewUpiId('');
                  setShowAddUpiModal(false);
                }}
              >
                <Text style={[styles.modalCancelText, { color: colors.textPrimary }]}>
                  {t('common.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddUpi}
              >
                <Text style={styles.modalSaveText}>
                  {t('payment.link_upi_btn', 'Link UPI')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.screenPadding,
  },
  walletCard: {
    borderRadius: spacing.radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: '#133E2B',
    marginBottom: spacing.md,
    elevation: 4,
  },
  walletTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  walletBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletBrand: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  greenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F3926',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E6344',
  },
  greenBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34D399',
  },
  walletBalanceLabel: {
    fontSize: 12,
    color: '#86EFAC',
    fontWeight: '500',
  },
  walletBalance: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  walletSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
  },
  topupRow: {
    flexDirection: 'row',
    gap: 10,
  },
  topupBtn: {
    flex: 1,
    height: 38,
    backgroundColor: '#133E2B',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  topupBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#34D399',
  },
  preferenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  preferenceDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addSectionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  listCard: {
    borderRadius: spacing.radius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  itemBorder: {
    borderBottomWidth: 1,
  },
  listIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  listInfo: {
    flex: 1,
  },
  upiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  defaultPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  listSub: {
    fontSize: 12,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setDefaultBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  setDefaultText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.screenPadding,
  },
  modalContent: {
    borderRadius: spacing.radius.xl,
    padding: spacing.lg,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: spacing.radius.md,
    paddingHorizontal: 12,
    fontSize: 15,
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
