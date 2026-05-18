import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, CheckCircle2, CreditCard, Lock, Shield } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Dimensions,
  KeyboardAvoidingView, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';

const { height: SCREEN_H } = Dimensions.get('window');

export type PaymentItem = {
  title: string; subtitle: string; amount: string; usd: string;
};

type MethodId = 'card' | 'tng' | 'grabpay' | 'boost' | 'maybank2u' | 'cimb' | 'rhb' | 'applepay' | 'googlepay';

// Real deeplinks / URLs for MY market — user is redirected to the app/browser to complete
const METHOD_DEEPLINKS: Partial<Record<MethodId, string>> = {
  tng:       'tngd://payment',           // TnG eWallet deeplink
  grabpay:   'grab://open',              // GrabPay
  boost:     'boost://pay',              // Boost
  maybank2u: 'https://www.maybank2u.com.my',
  cimb:      'https://www.cimbclicks.com.my',
  rhb:       'https://rhbgroup.com',
  applepay:  'shoebox://',               // Apple Pay — handled natively via Stripe/Adyen SDK
  googlepay: 'https://pay.google.com',
};

type MethodDef = { id: MethodId; label: string; sublabel: string; color: string; logo: string };

const CARD_METHOD: MethodDef = { id:'card', label:'Credit / Debit Card', sublabel:'Visa · Mastercard · AMEX', color:'#FF0055', logo:'💳' };
const EWALLET_METHODS: MethodDef[] = [
  { id:'tng',     label:"Touch 'n Go eWallet", sublabel:'Malaysia\'s #1 e-wallet',    color:'#00B050', logo:'T' },
  { id:'grabpay', label:'GrabPay',              sublabel:'Pay with Grab credits',       color:'#00B14F', logo:'G' },
  { id:'boost',   label:'Boost',                sublabel:'Boost eWallet',               color:'#E6132A', logo:'B' },
];
const BANK_METHODS: MethodDef[] = [
  { id:'maybank2u', label:'Maybank2U',   sublabel:'FPX Online Banking', color:'#F8C300', logo:'M' },
  { id:'cimb',      label:'CIMB Clicks', sublabel:'FPX Online Banking', color:'#CC0000', logo:'C' },
  { id:'rhb',       label:'RHB Now',     sublabel:'FPX Online Banking', color:'#1A5276', logo:'R' },
];
const DIGITAL_METHODS: MethodDef[] = [
  { id:'applepay',  label:'Apple Pay',  sublabel:'Touch ID / Face ID', color:'#888', logo:'A' },
  { id:'googlepay', label:'Google Pay', sublabel:'Google Wallet',       color:'#4285F4', logo:'G' },
];

function InputField({ label, value, onChange, placeholder, maxLen, keyboard='default', secure=false }: {
  label:string; value:string; onChange:(v:string)=>void; placeholder:string; maxLen?:number; keyboard?:any; secure?:boolean;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <View style={[f.box, { borderColor: focus ? '#FF0055' : 'rgba(255,255,255,0.1)' }]}>
        <TextInput style={f.input} value={value} onChangeText={onChange} placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.2)" maxLength={maxLen} keyboardType={keyboard}
          secureTextEntry={secure} onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)} autoCapitalize="none" />
      </View>
    </View>
  );
}
const f = StyleSheet.create({
  wrap:  { marginBottom:12 },
  label: { color:'rgba(255,255,255,0.4)', fontSize:10, fontWeight:'800', letterSpacing:1.5, marginBottom:6 },
  box:   { borderWidth:1, borderRadius:14, backgroundColor:'rgba(255,255,255,0.04)', height:50, justifyContent:'center', paddingHorizontal:14 },
  input: { color:'#FFF', fontSize:15, fontWeight:'600' },
});

function MethodRow({ m, selected, onPress }: { m:MethodDef; selected:boolean; onPress:()=>void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[s.methodRow, { borderColor: selected ? m.color : 'rgba(255,255,255,0.07)' }]}>
      <View style={[s.methodLogo, { backgroundColor: m.color+'22', borderColor: m.color+'44' }]}>
        <Text style={[s.methodLogoText, { color: m.color }]}>{m.logo}</Text>
      </View>
      <View style={{ flex:1 }}>
        <Text style={[s.methodLabel, { color: selected ? '#FFF' : 'rgba(255,255,255,0.7)' }]}>{m.label}</Text>
        <Text style={s.methodSub}>{m.sublabel}</Text>
      </View>
      <View style={[s.radio, { borderColor: selected ? m.color : 'rgba(255,255,255,0.2)' }]}>
        {selected && <View style={[s.radioDot, { backgroundColor: m.color }]} />}
      </View>
    </TouchableOpacity>
  );
}

interface Props { visible:boolean; item:PaymentItem; onClose:()=>void; onSuccess:()=>void; }

export function PaymentModal({ visible, item, onClose, onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  const [method, setMethod] = useState<MethodId>('card');
  const [cardNum,   setCardNum]   = useState('');
  const [cardName,  setCardName]  = useState('');
  const [expiry,    setExpiry]    = useState('');
  const [cvv,       setCvv]       = useState('');
  const [processing, setProcessing] = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState('');

  React.useEffect(() => {
    if (visible) {
      setDone(false); setError(''); setProcessing(false);
      setCardNum(''); setCardName(''); setExpiry(''); setCvv('');
      setMethod('card');
      Animated.spring(slideAnim, { toValue:0, friction:12, tension:80, useNativeDriver:true }).start();
    } else {
      Animated.timing(slideAnim, { toValue:SCREEN_H, duration:280, useNativeDriver:true }).start();
    }
  }, [visible]);

  const fmtCard = (v:string) => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const fmtExp  = (v:string) => { const d=v.replace(/\D/g,'').slice(0,4); return d.length>=2?`${d.slice(0,2)}/${d.slice(2)}`:d; };

  const validate = () => {
    if (method !== 'card') return '';
    if (cardNum.replace(/\s/g,'').length < 16) return 'Please enter a valid 16-digit card number.';
    if (!cardName.trim()) return 'Please enter the cardholder name.';
    if (expiry.length < 5) return 'Please enter a valid expiry date (MM/YY).';
    if (cvv.length < 3) return 'Please enter your CVV / security code.';
    return '';
  };

  const handlePay = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');

    // Non-card: open provider deeplink / URL
    if (method !== 'card') {
      const url = METHOD_DEEPLINKS[method];
      if (url) {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          // After returning, treat as successful (PSP webhook would confirm in production)
        }
      }
      setProcessing(true);
      await new Promise(r => setTimeout(r, 1000));
      setProcessing(false);
    } else {
      setProcessing(true);
      // In production: call your backend / Stripe SDK here
      // e.g. await stripe.confirmPayment(clientSecret, { paymentMethodType:'Card', ... })
      await new Promise(r => setTimeout(r, 2200));
      setProcessing(false);
    }

    setDone(true);
    Animated.spring(successScale, { toValue:1, friction:5, useNativeDriver:true }).start();
    setTimeout(() => onSuccess(), 2200);
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View style={s.overlay}>
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={['#080010','#040008']} style={StyleSheet.absoluteFill} />

          {/* Handle bar */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.headerTitle}>Secure Checkout</Text>
              <View style={s.secureRow}>
                <Lock size={10} color="#00FFA3" />
                <Shield size={10} color="#00FFA3" />
                <Text style={s.secureText}>256-bit TLS · PCI DSS Level 1</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={{ color:'rgba(255,255,255,0.5)', fontSize:18, fontWeight:'300' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {done ? (
            <View style={s.successWrap}>
              <Animated.View style={{ transform:[{scale:successScale}], alignItems:'center', gap:16 }}>
                <View style={s.successRing}>
                  <CheckCircle2 size={56} color="#00FFA3" />
                </View>
                <Text style={s.successTitle}>Payment Confirmed</Text>
                <Text style={s.successItem}>{item.title}</Text>
                <Text style={s.successAmt}>{item.amount}</Text>
                <Text style={s.successNote}>Your account has been upgraded. Enjoy!</Text>
              </Animated.View>
            </View>
          ) : (
            <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
              <ScrollView showsVerticalScrollIndicator={false}
                contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom+24 }]}
                keyboardShouldPersistTaps="handled">

                {/* Order card */}
                <LinearGradient colors={['#180030','#0A0018']} style={s.orderCard}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <View style={{ flex:1 }}>
                      <Text style={s.orderTitle}>{item.title}</Text>
                      <Text style={s.orderSub}>{item.subtitle}</Text>
                    </View>
                    <View style={{ alignItems:'flex-end' }}>
                      <Text style={s.orderAmt}>{item.amount}</Text>
                      <Text style={s.orderUsd}>{item.usd}</Text>
                    </View>
                  </View>
                </LinearGradient>

                {!!error && (
                  <View style={s.errorRow}>
                    <AlertCircle size={14} color="#FF4444" />
                    <Text style={s.errorText}>{error}</Text>
                  </View>
                )}

                {/* Card */}
                <Text style={s.sectionLabel}>CARD PAYMENT</Text>
                <MethodRow m={CARD_METHOD} selected={method==='card'} onPress={()=>setMethod('card')} />
                {method === 'card' && (
                  <View style={s.cardFormWrap}>
                    <LinearGradient colors={['#1A003A','#3A0070','#FF0055']} start={{x:0,y:0}} end={{x:1,y:1}} style={s.cardPreview}>
                      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                        <CreditCard size={22} color="rgba(255,255,255,0.7)" />
                        <Text style={{ color:'rgba(255,255,255,0.4)', fontSize:10, fontWeight:'700', letterSpacing:3 }}>PHOTODUMPS</Text>
                      </View>
                      <Text style={s.cardNum}>{cardNum || '•••• •••• •••• ••••'}</Text>
                      <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:18 }}>
                        <View>
                          <Text style={s.cardMeta}>CARD HOLDER</Text>
                          <Text style={s.cardVal}>{cardName || 'YOUR NAME'}</Text>
                        </View>
                        <View style={{ alignItems:'flex-end' }}>
                          <Text style={s.cardMeta}>EXPIRES</Text>
                          <Text style={s.cardVal}>{expiry || 'MM/YY'}</Text>
                        </View>
                      </View>
                    </LinearGradient>
                    <InputField label="CARD NUMBER"      value={cardNum}   onChange={v=>setCardNum(fmtCard(v))}  placeholder="1234 5678 9012 3456" maxLen={19} keyboard="numeric" />
                    <InputField label="CARDHOLDER NAME"  value={cardName}  onChange={setCardName}                placeholder="As printed on card" />
                    <View style={{ flexDirection:'row', gap:12 }}>
                      <View style={{ flex:1 }}><InputField label="EXPIRY" value={expiry} onChange={v=>setExpiry(fmtExp(v))} placeholder="MM/YY" maxLen={5} keyboard="numeric" /></View>
                      <View style={{ flex:1 }}><InputField label="CVV"    value={cvv}    onChange={setCvv}                  placeholder="•••"   maxLen={4} keyboard="numeric" secure /></View>
                    </View>
                  </View>
                )}

                {/* E-Wallets */}
                <Text style={s.sectionLabel}>E-WALLETS</Text>
                {EWALLET_METHODS.map(m => <MethodRow key={m.id} m={m} selected={method===m.id} onPress={()=>setMethod(m.id)} />)}

                {/* Online Banking */}
                <Text style={s.sectionLabel}>ONLINE BANKING (FPX)</Text>
                {BANK_METHODS.map(m => <MethodRow key={m.id} m={m} selected={method===m.id} onPress={()=>setMethod(m.id)} />)}

                {/* Digital Wallets */}
                <Text style={s.sectionLabel}>DIGITAL WALLETS</Text>
                {DIGITAL_METHODS.map(m => <MethodRow key={m.id} m={m} selected={method===m.id} onPress={()=>setMethod(m.id)} />)}

                {/* Trust badges */}
                <View style={s.trustRow}>
                  <Shield size={11} color="rgba(255,255,255,0.2)" />
                  <Lock size={11} color="rgba(255,255,255,0.2)" />
                  <Text style={s.trustText}>End-to-end encrypted. Card details never stored. Powered by PCI DSS certified infrastructure.</Text>
                </View>

                {/* Pay button */}
                <TouchableOpacity onPress={handlePay} disabled={processing} activeOpacity={0.85}>
                  <LinearGradient colors={['#FF0055','#FF5500']} start={{x:0,y:0}} end={{x:1,y:0}} style={s.payBtn}>
                    {processing
                      ? <><ActivityIndicator color="#FFF" size="small" /><Text style={s.payBtnText}>Processing…</Text></>
                      : <><Lock size={15} color="#FFF" /><Text style={s.payBtnText}>PAY {item.amount} SECURELY</Text></>
                    }
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={s.disclaimer}>By completing payment you agree to our Terms of Service. Subscriptions auto-renew. Cancel anytime in Settings.</Text>
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:     { flex:1, backgroundColor:'rgba(0,0,0,0.8)', justifyContent:'flex-end' },
  sheet:       { height:SCREEN_H*0.94, borderTopLeftRadius:36, borderTopRightRadius:36, overflow:'hidden' },
  handle:      { width:40, height:4, borderRadius:2, backgroundColor:'rgba(255,255,255,0.15)', alignSelf:'center', marginTop:12, marginBottom:2 },
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:22, paddingVertical:14 },
  headerTitle: { color:'#FFF', fontSize:17, fontWeight:'900', letterSpacing:0.2 },
  secureRow:   { flexDirection:'row', alignItems:'center', gap:5, marginTop:3 },
  secureText:  { color:'#00FFA3', fontSize:10, fontWeight:'700', letterSpacing:0.3 },
  closeBtn:    { width:36, height:36, borderRadius:18, backgroundColor:'rgba(255,255,255,0.07)', justifyContent:'center', alignItems:'center' },
  scroll:      { paddingHorizontal:20 },
  orderCard:   { borderRadius:20, padding:18, marginBottom:14, borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  orderTitle:  { color:'#FFF', fontSize:15, fontWeight:'800' },
  orderSub:    { color:'rgba(255,255,255,0.4)', fontSize:12, fontWeight:'600', marginTop:3 },
  orderAmt:    { color:'#FFD600', fontSize:20, fontWeight:'900' },
  orderUsd:    { color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:'600', marginTop:2 },
  errorRow:    { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'rgba(255,68,68,0.1)', borderWidth:1, borderColor:'rgba(255,68,68,0.3)', borderRadius:12, padding:12, marginBottom:12 },
  errorText:   { color:'#FF4444', fontSize:13, fontWeight:'600', flex:1 },
  sectionLabel:{ color:'rgba(255,255,255,0.25)', fontSize:9, fontWeight:'900', letterSpacing:3, marginTop:16, marginBottom:8 },
  methodRow:   { flexDirection:'row', alignItems:'center', gap:12, borderWidth:1, borderRadius:16, padding:14, backgroundColor:'rgba(255,255,255,0.03)', marginBottom:6 },
  methodLogo:  { width:40, height:40, borderRadius:12, borderWidth:1, justifyContent:'center', alignItems:'center' },
  methodLogoText:{ fontSize:16, fontWeight:'900' },
  methodLabel: { fontSize:14, fontWeight:'700' },
  methodSub:   { color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:'600', marginTop:2 },
  radio:       { width:20, height:20, borderRadius:10, borderWidth:2, justifyContent:'center', alignItems:'center' },
  radioDot:    { width:9, height:9, borderRadius:4.5 },
  cardFormWrap:{ marginBottom:4 },
  cardPreview: { borderRadius:20, padding:20, marginBottom:16, shadowColor:'#FF0055', shadowRadius:14, shadowOpacity:0.3, elevation:8 },
  cardNum:     { color:'#FFF', fontSize:18, fontWeight:'700', letterSpacing:3 },
  cardMeta:    { color:'rgba(255,255,255,0.45)', fontSize:8, fontWeight:'800', letterSpacing:1.5 },
  cardVal:     { color:'#FFF', fontSize:13, fontWeight:'800', marginTop:2, letterSpacing:0.8 },
  trustRow:    { flexDirection:'row', alignItems:'flex-start', gap:7, marginTop:18, marginBottom:14 },
  trustText:   { color:'rgba(255,255,255,0.2)', fontSize:11, fontWeight:'500', flex:1, lineHeight:17 },
  payBtn:      { borderRadius:24, paddingVertical:17, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8 },
  payBtnText:  { color:'#FFF', fontSize:15, fontWeight:'900', letterSpacing:0.8 },
  disclaimer:  { color:'rgba(255,255,255,0.18)', fontSize:11, fontWeight:'500', textAlign:'center', marginTop:12, lineHeight:17 },
  successWrap: { flex:1, justifyContent:'center', alignItems:'center', padding:30 },
  successRing: { width:110, height:110, borderRadius:55, backgroundColor:'rgba(0,255,163,0.1)', justifyContent:'center', alignItems:'center', marginBottom:4 },
  successTitle:{ color:'#FFF', fontSize:22, fontWeight:'900', textAlign:'center' },
  successItem: { color:'rgba(255,255,255,0.5)', fontSize:14, fontWeight:'600', textAlign:'center' },
  successAmt:  { color:'#FFD600', fontSize:28, fontWeight:'900' },
  successNote: { color:'rgba(255,255,255,0.35)', fontSize:13, fontWeight:'500', textAlign:'center' },
});
