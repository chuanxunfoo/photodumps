import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, CheckCircle, CreditCard, Lock, Shield } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';

const { width } = Dimensions.get('window');

type PayMethod = 'card' | 'tng' | 'grabpay' | 'boost' | 'fpx' | 'apple' | 'google';

const EWALLETS = [
  { id: 'tng',     label: 'Touch n Go',  emoji: '💚', color: '#00B050' },
  { id: 'grabpay', label: 'GrabPay',     emoji: '🟢', color: '#00B14F' },
  { id: 'boost',   label: 'Boost',       emoji: '🔴', color: '#E6132A' },
];

const OTHER_METHODS = [
  { id: 'fpx',    label: 'Online Banking (FPX)', emoji: '🏦', color: '#0055A4' },
  { id: 'apple',  label: 'Apple Pay',            emoji: '🍎', color: '#999' },
  { id: 'google', label: 'Google Pay',            emoji: '🔷', color: '#4285F4' },
];

function PayField({ label, value, onChangeText, placeholder, maxLength, keyboardType = 'default' }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={pf.wrap}>
      <Text style={pf.label}>{label}</Text>
      <View style={[pf.inputWrap, { borderColor: focused ? '#FF0055' : 'rgba(255,255,255,0.1)' }]}>
        <TextInput
          style={pf.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.2)"
          maxLength={maxLength}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
        />
      </View>
    </View>
  );
}

const pf = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  inputWrap: { borderWidth: 1, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', height: 52, justifyContent: 'center', paddingHorizontal: 16 },
  input: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});

export default function PaymentScreen() {
  const { theme } = useTheme();
  const [method, setMethod] = useState<PayMethod>('card');
  const [cardNum, setCardNum] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;

  const formatCard = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handlePay = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    setLoading(false);
    setSuccess(true);
    Animated.spring(successScale, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    setTimeout(() => router.replace('/hub'), 2200);
  };

  if (success) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient colors={['#030303', '#001A0A', '#030303']} style={StyleSheet.absoluteFill} />
        <Animated.View style={{ alignItems: 'center', transform: [{ scale: successScale }] }}>
          <CheckCircle size={80} color="#00FFA3" />
          <Text style={{ color: '#FFF', fontSize: 32, fontWeight: '900', marginTop: 20 }}>Payment Done!</Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginTop: 8 }}>Welcome to photodumps Pro 🎉</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#030303', '#08000F', '#030303']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={20} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>PAYMENT</Text>
            <View style={styles.secureTag}>
              <Lock size={10} color="#00FFA3" />
              <Text style={styles.secureText}>SECURE</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

            {/* ORDER SUMMARY */}
            <LinearGradient colors={['#1A0800', '#0D0D0D']} style={styles.orderCard}>
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>photodumps Pro · Yearly</Text>
                <Text style={styles.orderPrice}>MYR 199</Text>
              </View>
              <View style={[styles.orderRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 8 }]}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' }}>Today you pay (after free trial)</Text>
                <Text style={{ color: '#FFD600', fontSize: 16, fontWeight: '900' }}>MYR 0</Text>
              </View>
            </LinearGradient>

            {/* PAYMENT METHOD SELECTOR */}
            <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>

            {/* CARD */}
            <TouchableOpacity
              style={[styles.methodCard, { borderColor: method === 'card' ? '#FF0055' : 'rgba(255,255,255,0.08)' }]}
              onPress={() => setMethod('card')}
            >
              <CreditCard size={20} color={method === 'card' ? '#FF0055' : 'rgba(255,255,255,0.4)'} />
              <Text style={[styles.methodLabel, { color: method === 'card' ? '#FFF' : 'rgba(255,255,255,0.4)' }]}>Credit / Debit Card</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {['💳', '🏧', '🟦'].map((e, i) => <Text key={i} style={{ fontSize: 16 }}>{e}</Text>)}
              </View>
              <View style={[styles.radioOuter, { borderColor: method === 'card' ? '#FF0055' : 'rgba(255,255,255,0.2)' }]}>
                {method === 'card' && <View style={[styles.radioDot, { backgroundColor: '#FF0055' }]} />}
              </View>
            </TouchableOpacity>

            {/* CARD FORM */}
            {method === 'card' && (
              <View style={styles.cardForm}>
                {/* Preview card */}
                <LinearGradient colors={['#1A0030', '#3A0060', '#FF0055']} style={styles.cardPreview} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.cardPreviewNum}>{cardNum || '•••• •••• •••• ••••'}</Text>
                  <View style={styles.cardPreviewBottom}>
                    <View>
                      <Text style={styles.cardPreviewSmall}>CARD HOLDER</Text>
                      <Text style={styles.cardPreviewName}>{cardName || 'YOUR NAME'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.cardPreviewSmall}>EXPIRES</Text>
                      <Text style={styles.cardPreviewName}>{expiry || 'MM/YY'}</Text>
                    </View>
                  </View>
                </LinearGradient>

                <PayField label="CARD NUMBER" value={cardNum} onChangeText={(v: string) => setCardNum(formatCard(v))} placeholder="1234 5678 9012 3456" maxLength={19} keyboardType="numeric" />
                <PayField label="CARDHOLDER NAME" value={cardName} onChangeText={setCardName} placeholder="As on your card" />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <PayField label="EXPIRY" value={expiry} onChangeText={(v: string) => setExpiry(formatExpiry(v))} placeholder="MM/YY" maxLength={5} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PayField label="CVV" value={cvv} onChangeText={setCvv} placeholder="123" maxLength={4} keyboardType="numeric" />
                  </View>
                </View>
              </View>
            )}

            {/* E-WALLETS */}
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>E-WALLETS</Text>
            {EWALLETS.map(w => (
              <TouchableOpacity key={w.id} style={[styles.methodCard, { borderColor: method === w.id ? w.color : 'rgba(255,255,255,0.08)' }]} onPress={() => setMethod(w.id as PayMethod)}>
                <Text style={{ fontSize: 20 }}>{w.emoji}</Text>
                <Text style={[styles.methodLabel, { color: method === w.id ? '#FFF' : 'rgba(255,255,255,0.5)', flex: 1 }]}>{w.label}</Text>
                <View style={[styles.radioOuter, { borderColor: method === w.id ? w.color : 'rgba(255,255,255,0.2)' }]}>
                  {method === w.id && <View style={[styles.radioDot, { backgroundColor: w.color }]} />}
                </View>
              </TouchableOpacity>
            ))}

            {/* OTHER */}
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>OTHER</Text>
            {OTHER_METHODS.map(o => (
              <TouchableOpacity key={o.id} style={[styles.methodCard, { borderColor: method === o.id ? o.color : 'rgba(255,255,255,0.08)' }]} onPress={() => setMethod(o.id as PayMethod)}>
                <Text style={{ fontSize: 20 }}>{o.emoji}</Text>
                <Text style={[styles.methodLabel, { color: method === o.id ? '#FFF' : 'rgba(255,255,255,0.5)', flex: 1 }]}>{o.label}</Text>
                <View style={[styles.radioOuter, { borderColor: method === o.id ? o.color : 'rgba(255,255,255,0.2)' }]}>
                  {method === o.id && <View style={[styles.radioDot, { backgroundColor: o.color }]} />}
                </View>
              </TouchableOpacity>
            ))}

            {/* TRUST BADGES */}
            <View style={styles.trustRow}>
              <Shield size={12} color="rgba(255,255,255,0.25)" />
              <Text style={styles.trustText}>256-bit SSL encryption · PCI-DSS compliant · No card details stored</Text>
            </View>

            {/* PAY BUTTON */}
            <TouchableOpacity onPress={handlePay} disabled={loading} activeOpacity={0.85} style={{ marginTop: 8 }}>
              <LinearGradient colors={['#FF0055', '#FF5500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.payBtn}>
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <>
                    <Lock size={16} color="#FFF" />
                    <Text style={styles.payBtnText}>PAY MYR 0 · START FREE TRIAL</Text>
                  </>
                }
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              You won't be charged until your 7-day free trial ends. Cancel anytime.
            </Text>
            <View style={{ height: 30 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030303' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  secureTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,255,163,0.08)', borderWidth: 1, borderColor: 'rgba(0,255,163,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  secureText: { color: '#00FFA3', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  orderCard: { borderRadius: 22, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderLabel: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  orderPrice: { color: '#FFD600', fontSize: 20, fontWeight: '900' },
  sectionLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 10 },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 18, padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 8,
  },
  methodLabel: { fontSize: 15, fontWeight: '700' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot: { width: 9, height: 9, borderRadius: 4.5 },
  cardForm: { marginBottom: 8 },
  cardPreview: {
    borderRadius: 22, padding: 22, marginBottom: 20,
    shadowColor: '#FF0055', shadowRadius: 16, shadowOpacity: 0.3, elevation: 8,
  },
  cardPreviewNum: { color: '#FFF', fontSize: 20, fontWeight: '700', letterSpacing: 3, marginBottom: 24 },
  cardPreviewBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardPreviewSmall: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  cardPreviewName: { color: '#FFF', fontSize: 14, fontWeight: '800', marginTop: 3, letterSpacing: 1 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 16 },
  trustText: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '500', flex: 1, lineHeight: 16 },
  payBtn: { borderRadius: 26, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  payBtnText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  disclaimer: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '500', textAlign: 'center', marginTop: 14, lineHeight: 18 },
});