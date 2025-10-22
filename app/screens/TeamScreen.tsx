import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Animated,
    Dimensions,
    Image,
    ImageBackground,
    Linking,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Barber, getBarbers } from '../../services/firebase';
import TopNav from '../components/TopNav';

const { width, height } = Dimensions.get('window');

interface TeamScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  onBack?: () => void;
}

const TeamScreen: React.FC<TeamScreenProps> = ({ onNavigate, onBack }) => {
  const { t } = useTranslation();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsBarber, setDetailsBarber] = useState<Barber | null>(null);
  const [flippedCards, setFlippedCards] = useState<{[key: string]: Animated.Value}>({});

  useEffect(() => {
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    try {
      const barbersData = await getBarbers();
      // Sort barbers: main barber (רן) first, then others
      const sortedBarbers = barbersData.sort((a, b) => {
        if (a.isMainBarber) return -1;
        if (b.isMainBarber) return 1;
        if (a.name === 'רן אגלריסי') return -1;
        if (b.name === 'רן אגלריסי') return 1;
        return a.name.localeCompare(b.name);
      });
      setBarbers(sortedBarbers);
      // Initialize animation values for each barber
      const animatedValues: {[key: string]: Animated.Value} = {};
      sortedBarbers.forEach(barber => {
        animatedValues[barber.id] = new Animated.Value(0);
      });
      setFlippedCards(animatedValues);
    } catch (error) {
      console.error('Error loading barbers:', error);
      Alert.alert(t('common.error'), t('team.load_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleBarberPress = (barber: Barber) => {
    const animatedValue = flippedCards[barber.id];
    if (animatedValue) {
      Animated.timing(animatedValue, {
        toValue: animatedValue._value === 0 ? 1 : 0,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleBookWithBarber = () => {
    if (selectedBarber) {
      setModalVisible(false);
      onNavigate('booking', { barberId: selectedBarber.id });
    }
  };

  const handleWhatsAppPress = (barber: Barber) => {
    // Use whatsapp field first, fallback to phone
    const whatsappNumber = barber.whatsapp || barber.phone;
    
    if (whatsappNumber) {
      const message = t('team.whatsapp_message', { name: barber.name });
      
      // Normalize phone number to E.164 format
      let normalizedNumber = whatsappNumber;
      
      // Remove any non-digit characters
      normalizedNumber = normalizedNumber.replace(/\D/g, '');
      
      // Add country code if not present
      if (normalizedNumber.startsWith('05')) {
        normalizedNumber = '972' + normalizedNumber.substring(1);
      } else if (normalizedNumber.startsWith('5')) {
        normalizedNumber = '972' + normalizedNumber;
      } else if (!normalizedNumber.startsWith('972')) {
        normalizedNumber = '972' + normalizedNumber;
      }
      
      const url = `whatsapp://send?phone=${normalizedNumber}&text=${encodeURIComponent(message)}`;
      
      console.log(`🟢 Opening WhatsApp for ${barber.name}: ${normalizedNumber}`);
      
      Linking.openURL(url).catch(() => {
        // Fallback to web WhatsApp
        const webUrl = `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
        Linking.openURL(webUrl).catch(() => {
          Alert.alert(t('common.error'), t('team.whatsapp_error'));
        });
      });
    } else {
      Alert.alert(t('common.error'), 'מספר WhatsApp לא זמין לספר זה');
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopNav 
          title={t('team.title')} 
          onBellPress={() => {}} 
          onMenuPress={() => {}}
          showBackButton={true}
          onBackPress={onBack || (() => onNavigate('home'))}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title={t('team.title')} 
        onBellPress={() => {}} 
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate('home'))}
      />
      
      {/* Hero Section with Ran's Background */}
      <View style={styles.heroSection}>
        <ImageBackground
          source={require('../../assets/images/ATMOSPHERE2.jpg')}
          style={styles.heroImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.85)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.heroOverlay}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>{t('team.hero_title')}</Text>
              <Text style={styles.heroSubtitle}>{t('team.hero_subtitle')}</Text>
            </View>
          </View>
        </ImageBackground>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>הספרים</Text>
          
          {barbers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{t('team.no_barbers')}</Text>
            </View>
          ) : (
            <View style={styles.barbersGrid}>
              {barbers.map((barber, index) => {
                const animatedValue = flippedCards[barber.id];
                const frontRotation = animatedValue?.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg']
                });
                const backRotation = animatedValue?.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['180deg', '360deg']
                });

                return (
                  <TouchableOpacity 
                    key={barber.id} 
                    style={styles.cardContainer}
                    onPress={() => handleBarberPress(barber)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.flipCard}>
                      {/* Front of card */}
                      <Animated.View style={[
                        styles.cardFace, 
                        styles.cardFront,
                        { transform: [{ rotateY: frontRotation || '0deg' }] }
                      ]}>
                        <View style={styles.barberImageContainer}>
                          {barber.image ? (
                            <Image
                              source={{ uri: barber.image }}
                              style={styles.barberPhoto}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.barberPhotoPlaceholder}>
                              <Ionicons name="person-outline" size={40} color="#666" />
                            </View>
                          )}
                        </View>
                        <View style={styles.barberBasicInfo}>
                          <Text style={styles.barberName}>{barber.name}</Text>
                          <Text style={styles.barberTitle}>{t('team.professional_barber')}</Text>
                        </View>
                      </Animated.View>

                      {/* Back of card */}
                      <Animated.View style={[
                        styles.cardFace, 
                        styles.cardBack,
                        { transform: [{ rotateY: backRotation || '180deg' }] }
                      ]}>
                        <View style={styles.barberDetails}>
                          <Text style={styles.detailsTitle}>{t('team.additional_details')}</Text>
                          
                          <View style={styles.specialtiesContainer}>
                            {barber.specialties && barber.specialties.slice(0, 2).map((specialty, idx) => (
                              <View key={idx} style={styles.specialtyTag}>
                                <Text style={styles.specialtyText}>{specialty}</Text>
                              </View>
                            ))}
                          </View>

                          <View style={styles.barberActions}>
                            <TouchableOpacity 
                              style={styles.bookingButton} 
                              onPress={(e) => {
                                e.stopPropagation();
                                setSelectedBarber(barber);
                                setModalVisible(true);
                              }}
                            >
                              <LinearGradient
                                colors={['#3b82f6', '#1d4ed8']}
                                style={styles.buttonGradient}
                              >
                                <Ionicons name="calendar" size={14} color="#fff" />
                                <Text style={styles.bookingButtonText}>{t('team.book_appointment')}</Text>
                              </LinearGradient>
                            </TouchableOpacity>
                            
                            {barber.phone && (
                              <TouchableOpacity 
                                style={styles.whatsappButton} 
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleWhatsAppPress(barber);
                                }}
                              >
                                <LinearGradient
                                  colors={['#25D366', '#128C7E']}
                                  style={styles.buttonGradient}
                                >
                                  <Ionicons name="logo-whatsapp" size={14} color="#fff" />
                                  <Text style={styles.whatsappButtonText}>{t('team.whatsapp')}</Text>
                                </LinearGradient>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </Animated.View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Barber Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBarber && (
              <>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
                
                <View style={styles.modalHeader}>
                  <View style={styles.modalBarberImage}>
                    {selectedBarber.image ? (
                      <Image
                        source={{ uri: selectedBarber.image }}
                        style={styles.barberPhoto}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.modalBarberPlaceholder}>✂️</Text>
                    )}
                  </View>
                  <Text style={styles.modalBarberName}>{selectedBarber.name}</Text>
                </View>


                <View style={styles.modalSpecialties}>
                  <Text style={styles.modalSpecialtiesTitle}>{t('team.specialties')}:</Text>
                  <View style={styles.specialtiesGrid}>
                    {(selectedBarber.specialties || []).map((specialty, index) => (
                      <View key={index} style={styles.modalSpecialtyTag}>
                        <Text style={styles.modalSpecialtyText}>{specialty}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.bookButton}
                    onPress={handleBookWithBarber}
                  >
                    <Text style={styles.bookButtonText}>
                      {t('team.book_appointment')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Details Barber Modal */}
      <Modal
        visible={!!detailsBarber}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsBarber(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: 320, alignItems: 'center' }}>
            {detailsBarber?.image && (
              <Image source={{ uri: detailsBarber.image }} style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 12 }} />
            )}
            <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 6 }}>{detailsBarber?.name}</Text>
            {detailsBarber?.phone && (
              <Text style={{ fontSize: 16, color: '#3b82f6', marginBottom: 8 }}>{t('profile.phone')}: {detailsBarber.phone}</Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              {/* אייקון וואטסאפ */}
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                <Text style={{ color: '#fff', fontSize: 20 }}>🟢</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setDetailsBarber(null)} style={{ marginTop: 18 }}>
              <Text style={{ color: '#3b82f6', fontWeight: 'bold' }}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  heroSection: {
    height: height * 0.35,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  heroTextContainer: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 24,
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
  },
  heroStat: {
    alignItems: 'center',
  },
  heroStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  heroStatLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  barbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  cardContainer: {
    width: (width - 60) / 2,
    height: 200,
    marginBottom: 20,
  },
  flipCard: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    alignItems: 'center',
    padding: 16,
  },
  cardBack: {
    padding: 16,
    justifyContent: 'space-between',
  },
  barberImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barberPhoto: {
    width: '100%',
    height: '100%',
  },
  barberPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  barberBasicInfo: {
    alignItems: 'center',
    flex: 1,
  },
  barberDetails: {
    flex: 1,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  barberInfo: {
    padding: 24,
    position: 'relative',
    zIndex: 2,
  },
  barberHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  barberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
    textAlign: 'center',
  },
  barberTitle: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  barberExperience: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 4,
  },
  star: {
    fontSize: 12,
    marginHorizontal: 1,
  },
  starFilled: {
    color: '#FFD700',
  },
  starEmpty: {
    color: '#ddd',
  },
  ratingText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 12,
  },
  specialtyTag: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginHorizontal: 2,
    marginBottom: 4,
  },
  specialtyText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '500',
  },
  barberActions: {
    flexDirection: 'column',
    gap: 6,
  },
  bookingButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  whatsappButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  bookingButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  whatsappButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: width * 0.9,
    maxHeight: height * 0.8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  modalBarberImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  modalBarberPlaceholder: {
    fontSize: 50,
    color: '#666',
  },
  modalBarberName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalBarberExperience: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalRating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  modalSpecialties: {
    marginBottom: 24,
  },
  modalSpecialtiesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
    textAlign: 'right',
  },
  specialtiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  modalSpecialtyTag: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
    marginBottom: 8,
  },
  modalSpecialtyText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  modalActions: {
    marginTop: 16,
  },
  bookButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default TeamScreen;