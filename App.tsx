import { useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width - 48, 380);

type Memory = {
  id: number;
  date: string;
  title: string;
  note: string;
  colors: [string, string, ...string[]];
  icon: keyof typeof Ionicons.glyphMap;
};

const memories: Memory[] = [
  { id: 1, date: 'SEP 18, 2026', title: 'Golden hour', note: 'A slow evening by the sea, with nowhere else to be.', colors: ['#F6B971', '#DD7359', '#69506D'], icon: 'sunny-outline' },
  { id: 2, date: 'SEP 12, 2026', title: 'Sunday flowers', note: 'Found these on our walk home from the little market.', colors: ['#B7C4A1', '#E1A49C', '#F3D8AD'], icon: 'flower-outline' },
  { id: 3, date: 'AUG 30, 2026', title: 'A quiet morning', note: 'Coffee, rain, and the book I never wanted to finish.', colors: ['#B9C6CE', '#778B8E', '#D8B99A'], icon: 'cafe-outline' },
];

function MemoryCard({ memory, active, onPress }: { memory: Memory; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.card, active && styles.cardActive]}>
      <LinearGradient colors={memory.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.artwork}>
        <View style={styles.sunGlow} />
        <View style={styles.artIcon}><Ionicons name={memory.icon} size={54} color="rgba(255,255,255,.92)" /></View>
        <LinearGradient colors={['transparent', 'rgba(29,25,23,.54)']} style={StyleSheet.absoluteFill} />
        <View style={styles.cardCopy}>
          <Text style={styles.date}>{memory.date}</Text>
          <Text style={styles.cardTitle}>{memory.title}</Text>
          <Text style={styles.note}>{memory.note}</Text>
        </View>
        <Pressable accessibilityLabel="Favorite memory" style={styles.heart}>
          <Ionicons name={memory.id === 1 ? 'heart' : 'heart-outline'} size={18} color="#fff" />
        </Pressable>
      </LinearGradient>
    </Pressable>
  );
}

function AppContent() {
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState('Home');
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <LinearGradient colors={['#F7F1E8', '#F5EEE5', '#EFE7DE']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>YOUR LITTLE ARCHIVE</Text>
            <Text style={styles.logo}>memento.</Text>
          </View>
          <Pressable style={styles.avatar} accessibilityLabel="Open profile"><Text style={styles.avatarText}>M</Text></Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.heroRow}>
            <View><Text style={styles.heading}>Keep the moments</Text><Text style={styles.headingItalic}>that feel like you.</Text></View>
            <Text style={styles.year}>2026</Text>
          </View>

          <View style={styles.filterRow}>
            {['Recent', 'Favorites', 'Places'].map((item, index) => (
              <Pressable key={item} style={[styles.pill, index === 0 && styles.pillActive]}>
                <Text style={[styles.pillText, index === 0 && styles.pillTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <ScrollView horizontal pagingEnabled snapToInterval={CARD_WIDTH + 14} decelerationRate="fast" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards} onMomentumScrollEnd={e => setActive(Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 14)))}>
            {memories.map((memory, i) => <MemoryCard key={memory.id} memory={memory} active={active === i} onPress={() => setActive(i)} />)}
          </ScrollView>

          <View style={styles.dots}>{memories.map((m, i) => <View key={m.id} style={[styles.dot, active === i && styles.dotActive]} />)}</View>

          <View style={styles.prompt}>
            <View style={styles.promptIcon}><Feather name="bookmark" size={18} color="#8C5C49" /></View>
            <View style={styles.promptCopy}><Text style={styles.promptTitle}>A moment for today</Text><Text style={styles.promptText}>What made you pause and smile?</Text></View>
            <Feather name="arrow-up-right" size={21} color="#7A5A4D" />
          </View>
        </ScrollView>
      </SafeAreaView>

      <BlurView intensity={75} tint="light" style={styles.nav}>
        {[
          ['Home', 'home'], ['Archive', 'grid'], ['Add', 'plus'], ['Journal', 'book-open'], ['Profile', 'user'],
        ].map(([label, icon]) => {
          const isAdd = label === 'Add';
          const selected = tab === label;
          return <Pressable key={label} onPress={() => setTab(label)} style={[styles.navItem, isAdd && styles.addButton]} accessibilityLabel={label}>
            <Feather name={icon as keyof typeof Feather.glyphMap} size={isAdd ? 25 : 20} color={isAdd ? '#FFF' : selected ? '#713F31' : '#9A8D84'} />
            {!isAdd && <Text style={[styles.navLabel, selected && styles.navLabelActive]}>{label}</Text>}
          </Pressable>;
        })}
      </BlurView>
    </View>
  );
}

export default function App() { return <SafeAreaProvider><AppContent /></SafeAreaProvider>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5EEE5' }, safe: { flex: 1 }, content: { paddingBottom: 125 },
  header: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#9A7D6F', fontSize: 9, letterSpacing: 2.1, fontWeight: '700', marginBottom: 3 },
  logo: { color: '#322B28', fontFamily: 'Georgia', fontSize: 28, fontWeight: '700', letterSpacing: -1 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#D5B7A6', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,.65)' },
  avatarText: { color: '#61473E', fontFamily: 'Georgia', fontSize: 16, fontWeight: '700' },
  heroRow: { paddingHorizontal: 24, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  heading: { fontFamily: 'Georgia', color: '#413732', fontSize: 29, lineHeight: 35 },
  headingItalic: { fontFamily: 'Georgia', fontStyle: 'italic', color: '#8B5C4B', fontSize: 29, lineHeight: 35 },
  year: { color: '#A0938B', fontSize: 11, letterSpacing: 1.5, paddingBottom: 5 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginTop: 22, marginBottom: 19 },
  pill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: '#D9CDC3', backgroundColor: 'rgba(255,255,255,.3)' },
  pillActive: { backgroundColor: '#56433B', borderColor: '#56433B' }, pillText: { fontSize: 12, color: '#8A7A71', fontWeight: '600' }, pillTextActive: { color: '#FFF9F4' },
  cards: { paddingHorizontal: 24, gap: 14, paddingVertical: 4 },
  card: { width: CARD_WIDTH, height: 370, borderRadius: 29, backgroundColor: '#fff', shadowColor: '#50382C', shadowOffset: { width: 0, height: 14 }, shadowOpacity: .14, shadowRadius: 22, elevation: 7, transform: [{ scale: .985 }] },
  cardActive: { transform: [{ scale: 1 }] }, artwork: { flex: 1, overflow: 'hidden', borderRadius: 29 },
  sunGlow: { position: 'absolute', top: 32, right: 28, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,230,176,.2)' },
  artIcon: { position: 'absolute', left: 0, right: 0, top: 98, alignItems: 'center', opacity: .65 },
  cardCopy: { position: 'absolute', left: 23, right: 55, bottom: 23 }, date: { color: 'rgba(255,255,255,.74)', fontSize: 9, letterSpacing: 1.8, fontWeight: '800', marginBottom: 9 },
  cardTitle: { color: '#FFF', fontFamily: 'Georgia', fontSize: 29, marginBottom: 7 }, note: { color: 'rgba(255,255,255,.83)', fontSize: 13, lineHeight: 19 },
  heart: { position: 'absolute', top: 18, right: 18, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(38,31,29,.2)', alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginVertical: 17 }, dot: { height: 5, width: 5, borderRadius: 3, backgroundColor: '#CFC2B8' }, dotActive: { width: 19, backgroundColor: '#79584B' },
  prompt: { marginHorizontal: 24, padding: 15, borderWidth: 1, borderColor: 'rgba(155,128,110,.22)', borderRadius: 18, backgroundColor: 'rgba(255,255,255,.47)', flexDirection: 'row', alignItems: 'center' },
  promptIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: '#EEDDD1', alignItems: 'center', justifyContent: 'center' }, promptCopy: { flex: 1, marginLeft: 12 }, promptTitle: { color: '#51433C', fontSize: 13, fontWeight: '700', marginBottom: 3 }, promptText: { color: '#94837A', fontSize: 11.5 },
  nav: { position: 'absolute', left: 16, right: 16, bottom: 14, height: 76, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.8)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', shadowColor: '#49372E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: .15, shadowRadius: 18, elevation: 10 },
  navItem: { minWidth: 51, height: 54, justifyContent: 'center', alignItems: 'center', gap: 4 }, navLabel: { color: '#9A8D84', fontSize: 9 }, navLabelActive: { color: '#713F31', fontWeight: '700' },
  addButton: { minWidth: 54, height: 54, borderRadius: 20, backgroundColor: '#765246', shadowColor: '#674337', shadowOpacity: .25, shadowRadius: 8, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
});
